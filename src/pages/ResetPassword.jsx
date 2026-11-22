import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Link2Off } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PasswordStrength from '../components/auth/PasswordStrength.jsx';
import Button from '../components/common/Button.jsx';
import Logo from '../components/common/Logo.jsx';
import { PageLoader } from '../components/common/Loaders.jsx';
import { getPasswordIssues } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';

/** Opened from the link in the password-reset email (Supabase signs the user in temporarily). */
export default function ResetPassword() {
  const { session, initializing, updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (initializing) return <PageLoader label="Verifying your reset link…" />;

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--center">
          <Link2Off size={44} className="text-danger" aria-hidden="true" />
          <h1 className="auth-card__title">Link invalid or expired</h1>
          <p className="auth-card__sub">Request a new password reset link and try again.</p>
          <Link to="/forgot-password" className="btn btn--primary btn--lg btn--block">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (getPasswordIssues(form.password).length) next.password = 'Your password does not meet all the rules below.';
    if (form.confirm !== form.password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await updatePassword(form.password);
      toast.success('Password updated successfully.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(friendlyError(err));
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <Logo />
        </div>
        <h1 className="auth-card__title">Choose a new password</h1>
        <p className="auth-card__sub">Pick a strong password you have not used before.</p>
        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}
        <form className="form" onSubmit={submit} noValidate>
          <div>
            <PasswordField id="rp-password" label="New password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
            <PasswordStrength password={form.password} />
          </div>
          <PasswordField id="rp-confirm" label="Confirm new password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
          <Button type="submit" size="lg" block icon={KeyRound} loading={loading}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
