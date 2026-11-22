import { useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { adminListMessages, adminDeleteMessage } from '../../services/adminService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { formatDateTime } from '../../utils/format.js';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

export default function AdminMessages() {
  const toast = useToast();
  const messages = useAsync(adminListMessages, []);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  if (messages.loading) return <PageLoader label="Loading messages…" />;
  if (messages.error) return <ErrorState error={messages.error} onRetry={messages.reload} />;

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminDeleteMessage(deleting.id);
      toast.success('Message deleted.');
      setDeleting(null);
      messages.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Contact messages</h1>
        <p className="page-head__text">Messages sent from the Contact page.</p>
      </div>
      {messages.data.length === 0 ? (
        <EmptyState icon={Mail} title="No messages" message="New contact messages will appear here." />
      ) : (
        <div className="stack stack--tight">
          {messages.data.map((m) => (
            <article key={m.id} className="panel">
              <div className="panel__head">
                <div>
                  <strong>{m.subject || '(No subject)'}</strong>
                  <p className="muted">
                    {m.name} · <a className="link" href={`mailto:${m.email}`}>{m.email}</a> · {formatDateTime(m.created_at)}
                  </p>
                </div>
                <button type="button" className="icon-btn icon-btn--danger" aria-label="Delete message" onClick={() => setDeleting(m)}><Trash2 size={18} /></button>
              </div>
              <p className="message-body">{m.message}</p>
            </article>
          ))}
        </div>
      )}
      {deleting && (
        <ConfirmDialog title="Delete message?" message="This cannot be undone." confirmLabel="Delete" danger loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
