import { forwardRef } from 'react';

/** Label + control + error/hint wrapper. Put any <input>, <select> or <textarea> inside. */
export function FormField({ label, id, error, hint, className = '', children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Text input with optional leading icon and trailing element (e.g. show-password button). */
export const TextField = forwardRef(function TextField(
  { label, id, error, hint, icon: Icon, right, className = '', ...inputProps },
  ref
) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FormField label={label} id={id} error={error} hint={hint} className={className}>
      <div className="field__control">
        {Icon && <Icon size={18} className="field__icon" aria-hidden="true" />}
        <input
          {...inputProps}
          id={id}
          ref={ref}
          className={`input ${Icon ? 'input--icon' : ''} ${right ? 'input--right' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {right && <div className="field__right">{right}</div>}
      </div>
    </FormField>
  );
});
