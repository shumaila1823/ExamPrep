import { useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Link2 } from 'lucide-react';
import { adminListResources, adminSaveResource, adminDeleteResource } from '../../services/adminService.js';
import { fetchCategories } from '../../services/examService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { TextField, FormField } from '../../components/common/Fields.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

const BLANK = { title: '', description: '', url: '', category_id: '', is_published: true };

export default function AdminResources() {
  const toast = useToast();
  const resources = useAsync(adminListResources, []);
  const cats = useAsync(fetchCategories, []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  if (resources.loading || cats.loading) return <PageLoader label="Loading resources…" />;
  if (resources.error || cats.error) return <ErrorState error={resources.error || cats.error} onRetry={() => { resources.reload(); cats.reload(); }} />;

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminDeleteResource(deleting.id);
      toast.success('Resource deleted.');
      setDeleting(null);
      resources.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head page-head--left page-head--row">
        <div>
          <h1 className="page-head__title">Free resources</h1>
          <p className="page-head__text">Links to free study material shown on the Practice page.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing(BLANK)}>Add resource</Button>
      </div>

      {resources.data.length === 0 ? (
        <EmptyState icon={Link2} title="No resources yet" message="Add helpful free study links for students." />
      ) : (
        <div className="stack stack--tight">
          {resources.data.map((r) => (
            <div key={r.id} className="panel list__item">
              <div>
                <strong>{r.title}</strong> {!r.is_published && <span className="badge badge--gray">Hidden</span>}
                <p className="muted">{r.category?.name || 'General'} · <a href={r.url} target="_blank" rel="noopener noreferrer" className="link">{r.url} <ExternalLink size={12} aria-hidden="true" /></a></p>
              </div>
              <div className="row-actions">
                <button type="button" className="icon-btn" aria-label={`Edit ${r.title}`} onClick={() => setEditing({ id: r.id, title: r.title, description: r.description || '', url: r.url, category_id: r.category_id || '', is_published: r.is_published })}><Pencil size={18} /></button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label={`Delete ${r.title}`} onClick={() => setDeleting(r)}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ResourceForm
          initial={editing}
          categories={cats.data}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); resources.reload(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog title="Delete resource?" message={`"${deleting.title}" will be removed.`} confirmLabel="Delete" danger loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}

function ResourceForm({ initial, categories, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.title.trim().length < 2) next.title = 'Enter a title.';
    if (!/^https?:\/\/\S+$/i.test(form.url.trim())) next.url = 'Enter a full link starting with http:// or https://';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await adminSaveResource({
        id: form.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        url: form.url.trim(),
        category_id: form.category_id || null,
        is_published: form.is_published,
      });
      toast.success('Resource saved.');
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={form.id ? 'Edit resource' : 'Add resource'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="resource-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="resource-form" className="form" onSubmit={submit} noValidate>
        <TextField id="rs-title" label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={160} />
        <TextField id="rs-url" label="Link (URL)" value={form.url} onChange={set('url')} error={errors.url} placeholder="https://" />
        <FormField id="rs-desc" label="Description">
          <textarea id="rs-desc" className="input textarea" rows={2} value={form.description} onChange={set('description')} maxLength={500} />
        </FormField>
        <FormField id="rs-cat" label="Category">
          <select id="rs-cat" className="input" value={form.category_id} onChange={set('category_id')}>
            <option value="">General</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <label className="check">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')} />
          <span>Visible to students</span>
        </label>
      </form>
    </Modal>
  );
}
