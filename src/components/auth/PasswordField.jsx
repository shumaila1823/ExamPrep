import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { TextField } from '../common/Fields.jsx';

/** Password input with a show/hide toggle. Accepts the same props as TextField. */
export default function PasswordField({ id, label = 'Password', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      id={id}
      label={label}
      icon={Lock}
      type={visible ? 'text' : 'password'}
      right={
        <button
          type="button"
          className="icon-btn icon-btn--plain"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}
