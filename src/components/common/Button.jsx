import { Loader2 } from 'lucide-react';

/**
 * Props: variant = primary | secondary | outline | ghost | danger
 *        size = sm | md | lg, loading, block, icon (lucide component)
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  icon: Icon,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size !== 'md' ? `btn--${size}` : '', block ? 'btn--block' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button {...rest} type={type} className={classes} disabled={loading || disabled}>
      {loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
