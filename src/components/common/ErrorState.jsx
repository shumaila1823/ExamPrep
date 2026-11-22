import { AlertTriangle, RefreshCw } from 'lucide-react';
import { friendlyError } from '../../utils/errors.js';

export default function ErrorState({ error, title = 'Something went wrong', onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-state__icon">
        <AlertTriangle size={26} aria-hidden="true" />
      </span>
      <h3 className="error-state__title">{title}</h3>
      <p className="error-state__message">{friendlyError(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}
