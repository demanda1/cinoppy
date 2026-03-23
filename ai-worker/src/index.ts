// ============================================
// CINOPPY — AI Worker
// ============================================
// Generates spoiler-free, fun movie pitches.
// Flow:
//   1. Check Supabase — do we already have a pitch?
//   2. If yes → return cached pitch instantly
//   3. If no → fetch movie data from Supabase cache
//   4. Send movie context to Gemini → generate pitch
//   5. If Gemini fails → fall back to Hugging Face
//   6. Store generated pitch in Supabase
//   7. Return pitch to user

export interface Env {
	SUPABASE_URL: string;
	SUPABASE_SECRET_KEY: string;
	GEMINI_API_KEY: string;
	HF_API_TOKEN: string;
	ENVIRONMENT: string;
  }
  
  const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  
  export default {
	async fetch(request: Request, env: Env): Promise<Response> {
	  const url = new URL(request.url);
	  const path = url.pathname;
  
	  try {
		// Match: /api/movies/:id/pitch
		const pitchMatch = path.match(/^\/api\/movies\/(\d+)\/pitch$/);
		if (pitchMatch && request.method === "GET") {
		  const movieId = parseInt(pitchMatch[1]);
		  return await generatePitch(movieId, env);
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
  // MAIN PITCH GENERATION FLOW
  // ============================================
  
  async function generatePitch(movieId: number, env: Env): Promise<Response> {
  
	// STEP 1: Check if pitch already exists in Supabase
	const cachedPitch = await supabaseGet(
	  env,
	  `/rest/v1/pitches?movie_id=eq.${movieId}&select=*`
	);
  
	if (cachedPitch.length > 0) {
	  return Response.json({
		pitch: cachedPitch[0],
		source: "cache",
	  });
	}
  
	// STEP 2: Get movie data from Supabase cache (data worker should have cached it)
	const movieData = await supabaseGet(
	  env,
	  `/rest/v1/movies?id=eq.${movieId}&select=*`
	);
  
	if (movieData.length === 0) {
	  return Response.json(
		{ error: "Movie not found. Open the movie details page first to cache it." },
		{ status: 404 }
	  );
	}
  
	const movie = movieData[0];
  
	// STEP 3: Build the prompt
	const prompt = buildPrompt(movie);
  
	// STEP 4: Try Gemini first
	let pitchText: string | null = null;
	let modelUsed = "gemini";
  
	try {
	  pitchText = await callGemini(prompt, env);
	} catch (geminiError) {
	  console.log("Gemini failed, falling back to Hugging Face:", geminiError);
  
	  // STEP 5: Fall back to Hugging Face
	  try {
		pitchText = await callHuggingFace(prompt, env);
		modelUsed = "huggingface";
	  } catch (hfError) {
		return Response.json(
		  { error: "Both AI providers failed", details: {
			gemini: geminiError instanceof Error ? geminiError.message : "Unknown",
			huggingface: hfError instanceof Error ? hfError.message : "Unknown",
		  }},
		  { status: 503 }
		);
	  }
	}
  
	if (!pitchText) {
	  return Response.json({ error: "AI returned empty pitch" }, { status: 500 });
	}
  
	// STEP 6: Store the pitch in Supabase for future users
	const storedPitch = await supabasePost(env, "/rest/v1/pitches", {
	  movie_id: movieId,
	  pitch_text: pitchText,
	  model_used: modelUsed,
	});
  
	// STEP 7: Return the pitch
	return Response.json({
	  pitch: storedPitch[0] || { movie_id: movieId, pitch_text: pitchText, model_used: modelUsed },
	  source: modelUsed,
	});
  }
  
  
  // ============================================
  // PROMPT ENGINEERING
  // ============================================
  // This is the heart of Cinoppy's personality.
  // The prompt tells the AI exactly what kind of
  // pitch to write — fun, casual, spoiler-free.
  
  function buildPrompt(movie: any): string {
	// Parse JSON strings safely
	let genres: string[] = [];
	let actors: string[] = [];
	try { genres = JSON.parse(movie.genres); } catch { genres = []; }
	try { actors = JSON.parse(movie.lead_actors); } catch { actors = []; }
  
	return `Imagine you are Morgan Freeman and you are narrating why you should watch the movie ${movie.title} by Director: ${movie.director || "Unknown"} release in the year:${movie.release_year}, in a paragraph of exactly 5 sentences.`;
  }
  
  
  // ============================================
  // GEMINI API
  // ============================================
  
  async function callGemini(prompt: string, env: Env): Promise<string> {
	const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
	  method: "POST",
	  headers: { "Content-Type": "application/json" },
	  body: JSON.stringify({
		contents: [{
		  parts: [{ text: prompt }],
		}],
		generationConfig: {
		  temperature: 0.9,
		  maxOutputTokens: 250000,   // Generous limit to avoid any trimming
		  topP: 0.95,
		},
	  }),
	});
  
	if (!res.ok) {
	  const errorBody = await res.text();
	  throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
	}
  
	const data = await res.json() as any;
  
	// Log the full response structure for debugging
	console.log("Gemini full response:", JSON.stringify(data, null, 2));
  
	// Check if generation was stopped early
	const finishReason = data.candidates?.[0]?.finishReason;
	if (finishReason && finishReason !== "STOP") {
	  console.log("Gemini stopped early. Reason:", finishReason);
	  throw new Error("Gemini stopped early");
	}
  
	// Some responses have multiple parts — join them all
	const parts = data.candidates?.[0]?.content?.parts;
	if (!parts || parts.length === 0) {
	  throw new Error("Gemini returned no parts in response");
	}
  
	const text = parts.map((p: any) => p.text || "").join("").trim();
	if (!text) {
	  throw new Error("Gemini returned empty text");
	}
  
	return text;
  }
  
  
  // ============================================
  // HUGGING FACE API (FALLBACK)
  // ============================================
  
  async function callHuggingFace(prompt: string, env: Env): Promise<string> {
	// Using Mistral-7B-Instruct — a good free model for text generation
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
		  max_new_tokens: 256,
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
  
	// HF returns an array of generated texts
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