import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // .edu check for OAuth users — primary enforcement is Google's hd param,
  // this is the server-side safety net.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !user.email?.toLowerCase().endsWith(".edu")) {
    // Delete the non-.edu account using the admin client
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=edu_required`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
