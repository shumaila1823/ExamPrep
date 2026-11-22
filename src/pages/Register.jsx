import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Mail, User, Globe, UserPlus, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { TextField, FormField } from '../components/common/Fields.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PasswordStrength from '../components/auth/PasswordStrength.jsx';
import Button from '../components/common/Button.jsx';
import Logo from '../components/common/Logo.jsx';
import { COUNTRIES } from '../utils/constants.js';
import { getPasswordIssues, isValidEmail } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';

const EMPTY = { fullName: '', email: '', password: '', confirm: '', country: '' };

export default function Register() {
  const { signUp, isAuthenticated, initializing } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const from = location.state?.from;
  const target = from?.pathname ? `${from.pathname}${from.search || ''}` : '/dashboard';

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  if (!initializing && isAuthenticated) return <Navigate to={target} replace />;

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Please enter your full name.';
    if (!isValidEmail(form.email)) next.email = 'Please enter a valid email address.';
    if (getPasswordIssues(form.password).length) next.password = 'Your password does not meet all the rules below.';
    if (form.confirm !== form.password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(form);
      if (needsEmailConfirmation) {
        setConfirmEmail(true);
      } else {
        toast.success('Account created. Welcome to ExamPrep Global!');
      }
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (confirmEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--center">
          <MailCheck size={48} className="text-success" aria-hidden="true" />
          <h1 className="auth-card__title">Check your email</h1>
          <p className="auth-card__sub">
            We sent a confirmation link to <strong>{form.email}</strong>. Open it to activate your account, then log in.
          </p>
          <Link to="/login" className="btn btn--primary btn--lg btn--block">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-card__logo">
          <Logo />
        </div>
        <h1 className="auth-card__title">Create your free account</h1>
        <p className="auth-card__sub">100% free. Register once and practise every exam.</p>

        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}

        <form className="form" onSubmit={submit} noValidate>
          <TextField id="reg-name" label="Full name" icon={User} value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" maxLength={100} />
          <TextField id="reg-email" label="Email address" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <div>
            <PasswordField id="reg-password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
            <PasswordStrength password={form.password} />
          </div>
          <PasswordField id="reg-confirm" label="Confirm password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
          <FormField id="reg-country" label="Country (optional)">
            <div className="field__control">
              <Globe size={18} className="field__icon" aria-hidden="true" />
              <select id="reg-country" className="input input--icon" value={form.country} onChange={set('country')}>
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </FormField>
          <Button type="submit" size="lg" block icon={UserPlus} loading={loading}>
            Create account
          </Button>
        </form>

        <p className="auth-card__foot">
          Already registered?{' '}
          <Link to="/login" state={location.state} className="link">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
