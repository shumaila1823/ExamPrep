/** Turns Supabase / network errors into messages a student can understand. */
export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  const msg = (err.message || String(err) || '').trim();

  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return 'Network problem. Please check your internet connection and try again.';
  }
  if (err.code === '23503') {
    return 'This item is still in use (for example by student attempts), so it cannot be deleted. Try unpublishing it instead.';
  }
  if (err.code === '23505') return 'An item with that name already exists.';
  if (err.code === '42501') return msg || 'You do not have permission to do that.';
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(msg)) {
    return 'Please confirm your email address first - check your inbox for the confirmation link.';
  }
  if (/user already registered/i.test(msg)) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (/rate limit|too many requests/i.test(msg)) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (/same password|different from the old password/i.test(msg)) {
    return 'Your new password must be different from your current password.';
  }
  return msg || fallback;
}
