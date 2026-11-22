import { supabase } from '../supabase/client';

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, country, role, show_on_leaderboard, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Returns the user's profile. A database trigger creates it at sign-up; if it
 * is somehow missing (e.g. account created before the trigger existed) this
 * creates a plain student profile for the signed-in user.
 */
export async function ensureProfile(user) {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const meta = user.user_metadata || {};
  const fullName = (meta.full_name || (user.email || '').split('@')[0] || 'Student').slice(0, 100);
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    country: meta.country || null,
    role: 'student',
  });
  if (error && error.code !== '23505') throw error;
  return fetchProfile(user.id);
}

export async function updateProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: patch.full_name,
      country: patch.country || null,
      show_on_leaderboard: patch.show_on_leaderboard,
    })
    .eq('id', userId)
    .select('id, full_name, country, role, show_on_leaderboard, created_at')
    .single();
  if (error) throw error;
  return data;
}
