// ============================================
// CINOPPY — Auth Client
// ============================================
// Handles authentication directly with Supabase.
// Auth is the one thing that talks to Supabase
// from the frontend (not through the gateway),
// because Supabase's auth SDK manages tokens,
// sessions, and refresh logic automatically.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

// --- Types ---

export interface UserProfile {
  id: string;
  display_name: string;
  is_anonymous: boolean;
}

// --- Get current user profile ---

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the display name from our profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    display_name: profile?.display_name || "anonymous",
    is_anonymous: user.is_anonymous || false,
  };
}

// --- Sign in anonymously (for frictionless reviews) ---

export async function signInAnonymously(): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Anonymous sign-in failed");

  // The database trigger auto-creates a profile with a fun name.
  // Small delay to let the trigger complete.
  await new Promise((r) => setTimeout(r, 500));

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.user.id)
    .single();

  // Store the token for API calls through the gateway
  const session = data.session;
  if (session?.access_token) {
    localStorage.setItem("cinoppy_token", session.access_token);
  }

  return {
    id: data.user.id,
    display_name: profile?.display_name || "anonymous",
    is_anonymous: true,
  };
}

// --- Sign up with email ---

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Sign up failed");

  const session = data.session;
  if (session?.access_token) {
    localStorage.setItem("cinoppy_token", session.access_token);
  }

  return {
    id: data.user.id,
    display_name: displayName,
    is_anonymous: false,
  };
}

// --- Log in with email ---

export async function logIn(
  email: string,
  password: string
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Login failed");

  if (data.session?.access_token) {
    localStorage.setItem("cinoppy_token", data.session.access_token);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.user.id)
    .single();

  return {
    id: data.user.id,
    display_name: profile?.display_name || "user",
    is_anonymous: false,
  };
}

// --- Log out ---

export async function logOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem("cinoppy_token");
}

// --- Listen for auth state changes ---

export function onAuthChange(
  callback: (user: UserProfile | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      if (session.access_token) {
        localStorage.setItem("cinoppy_token", session.access_token);
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();

      callback({
        id: session.user.id,
        display_name: profile?.display_name || "user",
        is_anonymous: session.user.is_anonymous || false,
      });
    } else {
      localStorage.removeItem("cinoppy_token");
      callback(null);
    }
  });
}