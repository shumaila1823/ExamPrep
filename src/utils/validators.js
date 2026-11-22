const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

/** Returns a list of unmet password rules (empty array = valid). */
export function getPasswordIssues(password) {
  const pw = String(password || '');
  const issues = [];
  if (pw.length < 8) issues.push('At least 8 characters');
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter');
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter');
  if (!/[0-9]/.test(pw)) issues.push('One number');
  return issues;
}

/** 0 (empty) .. 4 (strong) with a label for the strength meter. */
export function passwordStrength(password) {
  const pw = String(password || '');
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}
