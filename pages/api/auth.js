import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, email, password, name } = req.body;

  if (action === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    if (data.user) {
      await supabase.from("users").insert([{
        id: data.user.id,
        email,
        name: name || email.split("@")[0]
      }]);
    }
    return res.status(200).json({ success: true, user: data.user, session: data.session });
  }

  if (action === "login") {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ success: true, user: data.user, session: data.session });
  }

  return res.status(400).json({ error: "Invalid action" });
}
