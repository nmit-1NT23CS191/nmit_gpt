import { createClient } from "@/lib/supabase-server";

/**
 * Server-side helper: returns the current user's role from public.users.
 *
 * Returns one of: "admin" | "student" | null
 * - null  → no active session (unauthenticated)
 * - "student" → authenticated but no admin privileges
 * - "admin"   → authenticated admin
 *
 * Usage (Server Component only):
 *   const role = await getUserRole();
 */
export async function getUserRole() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("supabase_uid", user.id)
    .single();

  if (error || !data) return "student"; // authenticated but no profile yet
  return data.role; // "admin" or "student"
}
