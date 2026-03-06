"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function isEduEmail(email: string): boolean {
  return email.toLowerCase().endsWith(".edu");
}

export async function signUp(email: string, password: string) {
  if (!isEduEmail(email)) {
    return { error: "Only .edu email addresses are allowed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: error.message };

  return { success: "Check your email to confirm your account." };
}

export async function signIn(email: string, password: string) {
  if (!isEduEmail(email)) {
    return { error: "Only .edu email addresses are allowed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        // Restrict Google OAuth to .edu domains (shows domain picker)
        hd: "*.edu",
      },
    },
  });

  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
