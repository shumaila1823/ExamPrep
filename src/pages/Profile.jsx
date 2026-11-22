import { useState } from 'react';
import { Save, User, Globe, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { updateProfile } from '../services/profileService.js';
import { TextField, FormField } from '../components/common/Fields.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PasswordStrength from '../components/auth/PasswordStrength.jsx';
import Button from '../components/common/Button.jsx';
import { COUNTRIES } from '../utils/constants.js';
import { getPasswordIssues } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';
import { formatDate, initials } from '../utils/format.js';

export default function Profile() {
  const { user, profile, setProfile, updatePassword, isAdmin, isTeacher } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    country: profile?.country || '',
    show_on_leaderboard: profile?.show_on_leaderboard ?? true,
  });
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (form.full_name.trim().length < 2) {
      setNameError('Please enter your full name.');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, { ...form, full_name: form.full_name.trim() });
      setProfile(updated);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (getPasswordIssues(pw.password).length) next.password = 'Your password does not meet all the rules below.';
    if (pw.confirm !== pw.password) next.confirm = 'The two passwords do not match.';
    setPwErrors(next);
    if (Object.keys(next).length) return;
    setPwSaving(true);
    try {
      await updatePassword(pw.password);
      setPw({ password: '', confirm: '' });
      toast.success('Password changed.');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Profile settings</h1>
        <p className="page-head__text">Manage your account details.</p>
      </div>

      <section className="panel profile-head">
        <span className="avatar avatar--lg">{initials(form.full_name || profile?.full_name)}</span>
        <div>
          <h2 className="profile-head__name">{profile?.full_name}</h2>
          <p className="muted">
            {user.email} · Member since {formatDate(profile?.created_at)}
            {isAdmin && <span className="badge badge--blue" style={{ marginLeft: 8 }}>Administrator</span>}
            {isTeacher && <span className="badge badge--green" style={{ marginLeft: 8 }}>Teacher</span>}
            {!isAdmin && !isTeacher && profile?.teacher_requested && (
              <span className="badge badge--gold" style={{ marginLeft: 8 }}>Teacher request pending</span>
            )}
          </p>
        </div>
      </section>

      <form className="panel form" onSubmit={saveProfile} noValidate>
        <h2 className="panel__title">Personal information</h2>
        <TextField id="pf-name" label="Full name" icon={User} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} error={nameError} maxLength={100} />
        <TextField id="pf-email" label="Email address" icon={Mail} value={user.email || ''} readOnly hint="Your email is used to log in and cannot be changed here." />
        <FormField id="pf-country" label="Country">
          <div className="field__control">
            <Globe size={18} className="field__icon" aria-hidden="true" />
            <select id="pf-country" className="input input--icon" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
              <option value="">Not specified</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </FormField>
        <label className="check">
          <input type="checkbox" checked={form.show_on_leaderboard} onChange={(e) => setForm((f) => ({ ...f, show_on_leaderboard: e.target.checked }))} />
          <span>Show me on the public leaderboard (first name and last initial only)</span>
        </label>
        <div>
          <Button type="submit" icon={Save} loading={saving}>Save changes</Button>
        </div>
      </form>

      <form className="panel form" onSubmit={savePassword} noValidate>
        <h2 className="panel__title">Change password</h2>
        <div>
          <PasswordField id="pf-pw" label="New password" value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} error={pwErrors.password} autoComplete="new-password" />
          <PasswordStrength password={pw.password} />
        </div>
        <PasswordField id="pf-pw2" label="Confirm new password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} error={pwErrors.confirm} autoComplete="new-password" />
        <div>
          <Button type="submit" variant="outline" icon={KeyRound} loading={pwSaving}>Update password</Button>
        </div>
      </form>
    </div>
  );
}
