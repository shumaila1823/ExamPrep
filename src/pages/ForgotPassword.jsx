import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, MailCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { TextField } from '../components/common/Fields.jsx';
import Button from '../components/common/Button.jsx';
import Logo from '../components/common/Logo.jsx';
import { isValidEmail } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <Logo />
        </div>
        {sent ? (
          <div className="auth-card--center">
            <MailCheck size={48} className="text-success" aria-hidden="true" />
            <h1 className="auth-card__title">Check your email</h1>
            <p className="auth-card__sub">
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            </p>
          </div>
        ) : (
          <>
            <h1 className="auth-card__title">Forgot your password?</h1>
            <p className="auth-card__sub">Enter your email and we will send you a link to reset it.</p>
            {formError && (
              <p className="notice notice--error" role="alert">
                {formError}
              </p>
            )}
            <form className="form" onSubmit={submit} noValidate>
              <TextField id="fp-email" label="Email address" type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} error={error} autoComplete="email" />
              <Button type="submit" size="lg" block icon={Send} loading={loading}>
                Send reset link
              </Button>
            </form>
          </>
        )}
        <p className="auth-card__foot">
          <Link to="/login" className="link">
            <ArrowLeft size={14} aria-hidden="true" /> Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
