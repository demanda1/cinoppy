export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  GEMINI_API_KEY: string;
  HF_API_TOKEN: string;
  ENVIRONMENT: string;
}

const GEMINI_MODELS = {
  lite: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
  flash: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  pro: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- AI Pitch ---
      const pitchMatch = path.match(/^\/api\/movies\/(\d+)\/pitch$/);
      if (pitchMatch && request.method === "GET") {
        const movieId = parseInt(pitchMatch[1]);
        return await generatePitch(movieId, env);
      }

      // --- AI Similar Movies ---
      const similarMatch = path.match(/^\/api\/movies\/(\d+)\/similar$/);
      if (similarMatch && request.method === "GET") {
        const movieId = parseInt(similarMatch[1]);
        return await generateSimilar(movieId, env);
      }

      // --- AI Movie Comparison ---
      if (path === "/api/ai/compare" && request.method === "POST") {
        const body = await request.json() as { movie_id_1: number; movie_id_2: number };
        return await compareMovies(body.movie_id_1, body.movie_id_2, env);
      }

      // Health check
      if (path === "/" || path === "/health") {
        return Response.json({
          status: "ok",
          service: "cinoppy-ai",
          timestamp: new Date().toISOString(),
        });
      }

      return Response.json({ error: "Not found" }, { status: 404 });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return Response.json({ error: "AI worker error", message }, { status: 500 });
    }
  },
};


// ============================================
// AI PITCH
// ============================================

async function generatePitch(movieId: number, env: Env): Promise<Response> {
  const cachedPitch = await supabaseGet(env, `/rest/v1/pitches?movie_id=eq.${movieId}&select=*`);
  if (cachedPitch.length > 0) {
    return Response.json({ pitch: cachedPitch[0], source: "cache" });
  }

  const movieData = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId}&select=*`);
  if (movieData.length === 0) {
    return Response.json({ error: "Movie not found. Open movie details first." }, { status: 404 });
  }

  const movie = movieData[0];
  const prompt = buildPitchPrompt(movie);

  let pitchText: string | null = null;
  let modelUsed = "gemini";

  try {
    pitchText = await callGemini(prompt, env, "lite");
  } catch {
    try {
      pitchText = await callHuggingFace(prompt, env);
      modelUsed = "huggingface";
    } catch (hfError) {
      return Response.json({ error: "Both AI providers failed" }, { status: 503 });
    }
  }

  if (!pitchText) {
    return Response.json({ error: "AI returned empty pitch" }, { status: 500 });
  }

  const storedPitch = await supabasePost(env, "/rest/v1/pitches", {
    movie_id: movieId,
    pitch_text: pitchText,
    model_used: modelUsed,
  });

  return Response.json({
    pitch: storedPitch[0] || { movie_id: movieId, pitch_text: pitchText, model_used: modelUsed },
    source: modelUsed,
  });
}

function buildPitchPrompt(movie: any): string {
  let genres: string[] = [];
  let actors: string[] = [];
  try { genres = JSON.parse(movie.genres); } catch { genres = []; }
  try { actors = JSON.parse(movie.lead_actors); } catch { actors = []; }

  return `Write exactly 3 sentences about why someone should watch the movie "${movie.title}" (${movie.release_year}).

Director: ${movie.director || "Unknown"}
Actors: ${actors.join(", ") || "Unknown"}
Genres: ${genres.join(", ") || "Unknown"}

Rules:
- Exactly 3 sentences, no more, no less
- No spoilers, no plot details
- Casual and fun tone, like recommending to a friend
- Mention what makes this specific movie unique
- Do not start with "Imagine", "Picture this", "So", "Okay", or "I just"
- Do not use first person
- Output ONLY the 3 sentences, nothing else

Example for The Dark Knight:
Heath Ledger didn't just play the Joker — he became the reason every villain since feels like a downgrade. Nolan turned a superhero movie into a crime thriller that happens to have a guy in a cape. If you only watch one superhero movie in your life, make it this one.

Now write 3 sentences for ${movie.title}:`;
}


// ============================================
// AI SIMILAR MOVIES
// ============================================

async function generateSimilar(movieId: number, env: Env): Promise<Response> {
  const movieData = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId}&select=*`);
  if (movieData.length === 0) {
    return Response.json({ error: "Movie not found. Open movie details first." }, { status: 404 });
  }

  const movie = movieData[0];
  let genres: string[] = [];
  let actors: string[] = [];
  try { genres = JSON.parse(movie.genres); } catch { genres = []; }
  try { actors = JSON.parse(movie.lead_actors); } catch { actors = []; }

  const prompt = `I just watched "${movie.title}" (${movie.release_year}) directed by ${movie.director || "Unknown"}, Genres: ${genres.join(", ")}

Suggest exactly 3 similar movies I would enjoy.

Rules:
- Return ONLY a JSON array, no other text, no markdown, no code blocks.
- Each item: {"title":"...", "year": ..., "reason":"..."}
- The reason must be under 15 words.
- Do NOT suggest the same movie

Example format:
[{"title":"Interstellar","year":2014,"reason":"Same mind-bending Nolan energy but traded dreams for black holes."},{"title":"The Matrix","year":1999,"reason":"Another reality-questioning thriller that rewards multiple watches."}]

JSON array for similar movies like "${movie.title}":`;

  let responseText: string | null = null;

  try {
    responseText = await callGemini(prompt, env, "lite");
  } catch {
    try {
      responseText = await callHuggingFace(prompt, env);
    } catch {
      return Response.json({ error: "Both AI providers failed" }, { status: 503 });
    }
  }

  if (!responseText) {
    return Response.json({ error: "AI returned empty response" }, { status: 500 });
  }

  // Parse the JSON from AI response
  try {
    // Clean up: remove markdown code blocks, extra text before/after JSON
    let cleaned = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    // Find the JSON array in the response (starts with [ and ends with ])
    const startIndex = cleaned.indexOf("[");
    const endIndex = cleaned.lastIndexOf("]");
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No JSON array found");
    }
    
    cleaned = cleaned.substring(startIndex, endIndex + 1);
    const similar = JSON.parse(cleaned);
    return Response.json({ movie: movie.title, similar, source: "ai" });
  } catch {
    // If parsing fails, try to extract movie suggestions manually
    return Response.json({
      error: "AI returned invalid format",
      raw: responseText,
    }, { status: 500 });
  }
}


// ============================================
// AI MOVIE COMPARISON
// ============================================

async function compareMovies(movieId1: number, movieId2: number, env: Env): Promise<Response> {
  const movie1Data = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId1}&select=*`);
  const movie2Data = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId2}&select=*`);

  if (movie1Data.length === 0 || movie2Data.length === 0) {
    return Response.json({ error: "One or both movies not found. Open their detail pages first." }, { status: 404 });
  }

  const movie1 = movie1Data[0];
  const movie2 = movie2Data[0];

  let genres1: string[] = [], genres2: string[] = [];
  let actors1: string[] = [], actors2: string[] = [];
  try { genres1 = JSON.parse(movie1.genres); } catch {}
  try { genres2 = JSON.parse(movie2.genres); } catch {}
  try { actors1 = JSON.parse(movie1.lead_actors); } catch {}
  try { actors2 = JSON.parse(movie2.lead_actors); } catch {}

  const prompt = `Compare these two movies point by point. Help someone decide which to watch.

Movie 1: "${movie1.title}" (${movie1.release_year})
- Director: ${movie1.director || "Unknown"}
- Genres: ${genres1.join(", ")}
- Actors: ${actors1.join(", ")}
- TMDB Rating: ${movie1.tmdb_rating}/10

Movie 2: "${movie2.title}" (${movie2.release_year})
- Director: ${movie2.director || "Unknown"}
- Genres: ${genres2.join(", ")}
- Actors: ${actors2.join(", ")}
- TMDB Rating: ${movie2.tmdb_rating}/10

Return ONLY a JSON object with no other text, no markdown, no code blocks.

The JSON must have exactly these fields:
- "points": an array of exactly 6 comparison objects, each with:
  - "aspect" (string): the category being compared (e.g. "Vibe", "Pacing", "Acting", "Visuals", "Emotional impact", "Rewatchability")
  - "movie1" (string): short casual description for movie 1 (max 8 words)
  - "movie2" (string): short casual description for movie 2 (max 8 words)
- "watch_movie1_if" (string): One sentence — watch this if you want...
- "watch_movie2_if" (string): One sentence — watch this if you want...
- "verdict" (string): One fun sentence picking a winner or saying it depends

Choose 6 comparison aspects that best highlight the differences between THESE specific movies. Don't always use the same aspects — pick what matters most for this pair.

Example:
{"points":[{"aspect":"Vibe","movie1":"Dark and cerebral","movie2":"Light and adventurous"},{"aspect":"Pacing","movie1":"Slow burn that rewards patience","movie2":"Non-stop action from minute one"},{"aspect":"Acting","movie1":"Oscar-worthy lead performance","movie2":"Fun ensemble chemistry"},{"aspect":"Visuals","movie1":"Stunning practical effects","movie2":"Vibrant colorful CGI world"},{"aspect":"Emotional impact","movie1":"Will make you question reality","movie2":"Pure feel-good entertainment"},{"aspect":"Best for","movie1":"A solo deep-dive night","movie2":"Movie night with friends"}],"watch_movie1_if":"You want a film that stays in your head for days.","watch_movie2_if":"You want two hours of pure fun without overthinking.","verdict":"Both are great but for completely different moods — pick based on your energy tonight."}

Now compare "${movie1.title}" vs "${movie2.title}":`;

  let responseText: string | null = null;

  try {
    responseText = await callGemini(prompt, env, "flash");
  } catch {
    try {
      responseText = await callHuggingFace(prompt, env);
    } catch {
      return Response.json({ error: "Both AI providers failed" }, { status: 503 });
    }
  }

  if (!responseText) {
    return Response.json({ error: "AI returned empty response" }, { status: 500 });
  }

  try {
    let cleaned = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    // Find the JSON object in the response (starts with { and ends with })
    const startIndex = cleaned.indexOf("{");
    const endIndex = cleaned.lastIndexOf("}");
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No JSON object found");
    }
    
    cleaned = cleaned.substring(startIndex, endIndex + 1);
    const comparison = JSON.parse(cleaned);
    return Response.json({
      movie1: movie1.title,
      movie2: movie2.title,
      comparison,
      source: "ai",
    });
  } catch {
    return Response.json({
      error: "AI returned invalid format",
      raw: responseText,
    }, { status: 500 });
  }
}


// ============================================
// GEMINI API
// ============================================

async function callGemini(prompt: string, env: Env, model: keyof typeof GEMINI_MODELS = "lite"): Promise<string> {
  const url = GEMINI_MODELS[model];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(`${url}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: attempt === 1 ? 0.9 : 0.7,
          maxOutputTokens: 2048,
          topP: 0.95,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
    }

    const data = await res.json() as any;

    if (data.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("Gemini blocked the response");
    }

    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("Gemini returned no parts");
    }

    const text = parts.map((p: any) => p.text || "").join("").trim();
    if (!text) {
      throw new Error("Gemini returned empty text");
    }

    return text;
  }

  throw new Error("Gemini failed after all attempts");
}


// ============================================
// HUGGING FACE API (FALLBACK)
// ============================================

async function callHuggingFace(prompt: string, env: Env): Promise<string> {
  const model = "mistralai/Mistral-7B-Instruct-v0.3";

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.9,
        return_full_text: false,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Hugging Face API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json() as any;
  const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
  if (!text) {
    throw new Error("Hugging Face returned no text");
  }

  return text.trim();
}


// ============================================
// SUPABASE HELPERS
// ============================================

async function supabaseGet(env: Env, endpoint: string): Promise<any[]> {
  const res = await fetch(`${env.SUPABASE_URL}${endpoint}`, {
    headers: {
      "apikey": env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Supabase GET error (${res.status}): ${errorBody}`);
  }
  return res.json();
}

async function supabasePost(env: Env, endpoint: string, body: any): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "apikey": env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Supabase POST error (${res.status}): ${errorBody}`);
  }
  return res.json();
}