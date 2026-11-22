import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Mail, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { TextField } from '../components/common/Fields.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import Button from '../components/common/Button.jsx';
import Logo from '../components/common/Logo.jsx';
import { isValidEmail } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';

export default function Login() {
  const { signIn, isAuthenticated, initializing } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const from = location.state?.from;
  const target = from?.pathname ? `${from.pathname}${from.search || ''}` : '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initializing && isAuthenticated) return <Navigate to={target} replace />;

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!isValidEmail(form.email)) next.email = 'Please enter a valid email address.';
    if (!form.password) next.password = 'Please enter your password.';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signIn(form);
      toast.success('Welcome back! You are now logged in.');
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
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__sub">Log in to continue your preparation.</p>

        {from && <p className="notice notice--info">Please log in to continue.</p>}
        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}

        <form className="form" onSubmit={submit} noValidate>
          <TextField
            id="login-email"
            label="Email address"
            type="email"
            icon={Mail}
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
          />
          <PasswordField
            id="login-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="form__row form__row--end">
            <Link to="/forgot-password" className="link">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" block icon={LogIn} loading={loading}>
            Log in
          </Button>
        </form>

        <p className="auth-card__foot">
          New to ExamPrep Global?{' '}
          <Link to="/register" state={location.state} className="link">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}
