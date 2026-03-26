export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  GEMINI_API_KEY: string;
  HF_API_TOKEN: string;
  ENVIRONMENT: string;
}

const GEMINI_MODELS = {
  geminiModel1: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview",
  geminiModel2: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview",
  geminiModel3: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro",
  geminiModel4: "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it",
  geminiModel5: "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it",
  geminiModel6: "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-12b-it",
  geminiModel7: "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it"
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
        return await generateStreamingPitch(movieId, env, "movie");
      }

      // --- AI Similar Movies ---
      const similarMatch = path.match(/^\/api\/movies\/(\d+)\/similar$/);
      if (similarMatch && request.method === "GET") {
        const movieId = parseInt(similarMatch[1]);
        return await generateSimilar(movieId, env, "movie");
      }

      // --- AI Movie Comparison ---
      if (path === "/api/ai/compare" && request.method === "POST") {
        const body = await request.json() as { movie_id_1: number; movie_id_2: number };
        return await compareContent(body.movie_id_1, body.movie_id_2, env, "movie");
      }

      // --- AI Tv Pitch ---
      const tvPitchMatch = path.match(/^\/api\/tv\/(\d+)\/pitch$/);
      if (tvPitchMatch && request.method === "GET") {
        const tvId = parseInt(tvPitchMatch[1]);
        return await generateStreamingPitch(tvId, env, "tv series");
      }

      // --- AI Similar Tv ---
      const similarTvMatch = path.match(/^\/api\/tv\/(\d+)\/similar$/);
      if (similarTvMatch && request.method === "GET") {
        const tvId = parseInt(similarTvMatch[1]);
        return await generateSimilar(tvId, env, "tv series");
      }

      // --- AI TV Comparison ---
      if (path === "/api/ai/compare/tv" && request.method === "POST") {
        const body = await request.json() as { tv_id_1: number; tv_id_2: number };
        return await compareContent(body.tv_id_1, body.tv_id_2, env, "tv series");
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

async function generateStreamingPitch(movieId: number, env: Env, type: "movie" | "tv series"): Promise<Response> {
  // 1. You presumably fetch the movie title/details here to build the prompt.
  // const movieData = await fetchTMDB(movieId, env);
  let data: any[] = []; 
  if(type==="movie"){
     data = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId}&select=*`);
  } else {
    data = await supabaseGet(env, `/rest/v1/tv?id=eq.${movieId}&select=*`);
  }


  if (data.length === 0) {
    return Response.json({ error:`${type} not found. Open ${type} details first.` }, { status: 404 });
  }

  const content = data[0];
  const prompt = buildPitchPrompt(content, type);
  
  // 2. Create the text encoder (Streams only understand raw bytes, not strings)
  const encoder = new TextEncoder();

  // 3. Create a ReadableStream to pump the data
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Initialize the generator function
        const generator = callGeminiStream(prompt, env, "geminiModel4");

        // Loop through the yielded chunks as they arrive
        for await (const chunk of generator) {
          // Format the chunk as a Server-Sent Event (SSE)
          const sseMessage = `data: ${JSON.stringify({ text: chunk })}\n\n`;
          
          // Encode to bytes and send it down the pipe
          controller.enqueue(encoder.encode(sseMessage));
        }

        // When the loop finishes, send the standard SSE completion signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

      } catch (error: any) {
        console.error("Streaming error:", error);
        // Send the error to the frontend before closing
        const errorMessage = `data: ${JSON.stringify({ error: error.message || "Stream failed" })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
      } finally {
        // Always close the stream to prevent memory leaks and hanging connections
        controller.close();
      }
    }
  });

  // 4. Return the standard Fetch API Response with SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // If your Gateway and Worker are on different origins, add CORS here:
      // "Access-Control-Allow-Origin": "*",
    }
  });
}

async function generatePitch(movieId: number, env: Env, type:String): Promise<Response> {
  let cachedPitch: any[] = []; 
  if(type==="movie"){
    cachedPitch = await supabaseGet(env, `/rest/v1/pitches?movie_id=eq.${movieId}&select=*`);
  } else {
   cachedPitch = await supabaseGet(env, `/rest/v1/tvpitches?tv_id=eq.${movieId}&select=*`);
  }
  
  if (cachedPitch.length > 0) {
    return Response.json({ pitch: cachedPitch[0], source: "cache" });
  }

  let data: any[] = []; 
  if(type==="movie"){
     data = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId}&select=*`);
  } else {
    data = await supabaseGet(env, `/rest/v1/tv?id=eq.${movieId}&select=*`);
  }


  if (data.length === 0) {
    return Response.json({ error:`${type} not found. Open ${type} details first.` }, { status: 404 });
  }

  const content = data[0];
  const prompt = buildPitchPrompt(content, type);

  let pitchText: string | null = null;
  let modelUsed = "gemini";

  try {
    pitchText = await callGemini(prompt, env, "geminiModel4");
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

  let storedPitch: any[] = []; 
  if(type==="movie"){
     storedPitch = await supabasePost(env, "/rest/v1/pitches", {
      movie_id: movieId,
      pitch_text: pitchText,
      model_used: modelUsed,
    });
 } else {
   storedPitch = await supabasePost(env, "/rest/v1/tvpitches", {
    tv_id: movieId,
    pitch_text: pitchText,
    model_used: modelUsed,
  });
 }
  return Response.json({
    pitch: storedPitch[0] || { movie_id: movieId, pitch_text: pitchText, model_used: modelUsed },
    source: modelUsed,
  });
}

function buildPitchPrompt(movie: any, type:String): string {
  let genres: string[] = [];
  let actors: string[] = [];
  try { genres = JSON.parse(movie.genres); } catch { genres = []; }
  try { actors = JSON.parse(movie.lead_actors); } catch { actors = []; }

  return `Write exactly 3 sentences about why someone should watch the ${type} "${movie.title}" (${movie.release_year}).

Director: ${movie.director || "Unknown"}
Actors: ${actors.join(", ") || "Unknown"}
Genres: ${genres.join(", ") || "Unknown"}

Rules:
- Exactly 3 sentences, no more, no less
- No spoilers, no plot details
- Casual and fun tone, like recommending to a friend
- Mention what makes this specific ${type} unique
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

async function generateSimilar(movieId: number, env: Env, type: String): Promise<Response> {
  let data: any[] = []; 
  if(type==="movie"){
     data = await supabaseGet(env, `/rest/v1/movies?id=eq.${movieId}&select=*`);
  } else {
    data = await supabaseGet(env, `/rest/v1/tv?id=eq.${movieId}&select=*`);
  }
  
  if (data.length === 0) {
    return Response.json({ error: "Movie not found. Open movie details first." }, { status: 404 });
  }

  const content = data[0];
  let genres: string[] = [];
  let actors: string[] = [];
  try { genres = JSON.parse(content.genres); } catch { genres = []; }
  try { actors = JSON.parse(content.lead_actors); } catch { actors = []; }

  const prompt = `I just watched "${content.title}" (${content.release_year}) directed by ${content.director || "Unknown"}, Genres: ${genres.join(", ")}

Suggest exactly 3 similar ${type} I would enjoy.

Rules:
- Return ONLY a JSON array, no other text, no markdown, no code blocks.
- Each item: {"title":"...", "year": ..., "reason":"..."}
- The reason must be under 15 words.
- Do NOT suggest the same ${type}

Example format:
[{"title":"Interstellar","year":2014,"reason":"Same mind-bending Nolan energy but traded dreams for black holes."},{"title":"The Matrix","year":1999,"reason":"Another reality-questioning thriller that rewards multiple watches."}]

JSON array for similar ${type} like "${content.title}":`;

  let responseText: string | null = null;

  try {
    responseText = await callGemini(prompt, env, "geminiModel6");
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
    return Response.json({ movie: content.title, similar, source: "ai" });
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

async function compareContent(id1: number, id2: number, env: Env, type: String): Promise<Response> {
  let data1: any[] = []; 
  let data2: any[] = []; 
  
  if(type === "movie"){
    data1 = await supabaseGet(env, `/rest/v1/tv?id=eq.${id1}&select=*`);
    data2 = await supabaseGet(env, `/rest/v1/tv?id=eq.${id2}&select=*`);
  } else {
    data1 = await supabaseGet(env, `/rest/v1/movies?id=eq.${id1}&select=*`);
    data2 = await supabaseGet(env, `/rest/v1/movies?id=eq.${id2}&select=*`);
  }

  if (data1.length === 0 || data2.length === 0) {
    return Response.json({ error: `One or both ${type} not found. Open their detail pages first.` }, { status: 404 });
  }

  const content1 = data1[0];
  const content2 = data2[0];

  let genres1: string[] = [], genres2: string[] = [];
  let actors1: string[] = [], actors2: string[] = [];
  try { genres1 = JSON.parse(content1.genres); } catch {}
  try { genres2 = JSON.parse(content2.genres); } catch {}
  try { actors1 = JSON.parse(content1.lead_actors); } catch {}
  try { actors2 = JSON.parse(content2.lead_actors); } catch {}

  const prompt = `Compare these two ${type} point by point. Help someone decide which to watch.

Movie 1: "${content1.title}" (${content1.release_year})
- Director: ${content1.director || "Unknown"}
- Genres: ${genres1.join(", ")}
- Actors: ${actors1.join(", ")}
- TMDB Rating: ${content1.tmdb_rating}/10

Movie 2: "${content2.title}" (${content2.release_year})
- Director: ${content2.director || "Unknown"}
- Genres: ${genres2.join(", ")}
- Actors: ${actors2.join(", ")}
- TMDB Rating: ${content2.tmdb_rating}/10

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

Now compare "${content1.title}" vs "${content2.title}":`;

  let responseText: string | null = null;

  try {
    responseText = await callGemini(prompt, env, "geminiModel4");
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
      movie1: content1.title,
      movie2: content2.title,
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

async function callGemini(prompt: string, env: Env, model: keyof typeof GEMINI_MODELS = "geminiModel4"): Promise<string> {
  const url = GEMINI_MODELS[model];

  const res = await fetch(`${url}?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
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

async function* callGeminiStream( prompt: string, env: Env, model: keyof typeof GEMINI_MODELS = "geminiModel4"
): AsyncGenerator<string, void, unknown> {
  
  const baseUrl = GEMINI_MODELS[model];
  // 1. Update the URL to request Server-Sent Events (SSE) streaming
  const url = `${baseUrl}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 5000,
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

  if (!res.body) {
    throw new Error("Gemini returned no response body");
  }

  // 2. Read the stream chunk by chunk
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Decode the raw bytes into a string and add to our buffer
      buffer += decoder.decode(value, { stream: true });
      
      // SSE sends data separated by newlines
      const lines = buffer.split("\n");
      
      // Keep the last incomplete line in the buffer for the next loop
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        
        // Gemini SSE lines start with "data: "
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          
          // Some APIs send [DONE] when finished
          if (dataStr === "[DONE]") return;

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.candidates?.[0]?.finishReason === "SAFETY") {
              throw new Error("Gemini blocked the response");
            }

            const parts = parsed.candidates?.[0]?.content?.parts;
            if (parts && parts.length > 0) {
              const textChunk = parts.map((p: any) => p.text || "").join("");
              if (textChunk) {
                // 3. Yield the extracted text immediately
                yield textChunk;
              }
            }
          } catch (e) {
            // Ignore incomplete JSON chunks (they'll be caught in the next iteration)
            console.error("Error parsing JSON chunk from Gemini:", e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}


// ============================================
// HUGGING FACE API (FALLBACK)
// ============================================

async function callHuggingFace(prompt: string, env: Env): Promise<string> {
  const model = "zai-org/GLM-5";

  const res = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        model:  `${model}`,
        messages: [
        {
          role: "user",
          content: prompt
        }
      ], 
      parameters: {
        max_new_tokens: 1024,
        temperature: 0.9
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