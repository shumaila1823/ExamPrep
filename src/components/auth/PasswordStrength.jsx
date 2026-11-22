import { Check, Circle } from 'lucide-react';
import { getPasswordIssues, passwordStrength } from '../../utils/validators.js';

const RULES = ['At least 8 characters', 'One lowercase letter', 'One uppercase letter', 'One number'];

/** Strength meter + checklist of the password rules. */
export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const unmet = getPasswordIssues(password);
  return (
    <div className="pw-strength" aria-live="polite">
      <div className="pw-strength__bar">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`pw-strength__seg ${score >= n ? `is-on is-level-${score}` : ''}`} />
        ))}
      </div>
      <p className="pw-strength__label">Strength: {label}</p>
      <ul className="pw-strength__rules">
        {RULES.map((rule) => {
          const ok = !unmet.includes(rule);
          return (
            <li key={rule} className={ok ? 'is-ok' : ''}>
              {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />} {rule}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
