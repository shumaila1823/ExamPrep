import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  adminSaveCategory, adminDeleteCategory, adminSaveSubject, adminDeleteSubject,
} from '../../services/adminService.js';
import { fetchCategories } from '../../services/examService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { slugify } from '../../utils/format.js';
import { TextField, FormField } from '../../components/common/Fields.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

export default function AdminTaxonomy() {
  const toast = useToast();
  const cats = useAsync(fetchCategories, []);
  const [catForm, setCatForm] = useState(null);
  const [subForm, setSubForm] = useState(null);
  const [deleting, setDeleting] = useState(null); // { kind, item }
  const [busy, setBusy] = useState(false);

  if (cats.loading) return <PageLoader label="Loading categories…" />;
  if (cats.error) return <ErrorState error={cats.error} onRetry={cats.reload} />;

  const confirmDelete = async () => {
    setBusy(true);
    try {
      if (deleting.kind === 'category') await adminDeleteCategory(deleting.item.id);
      else await adminDeleteSubject(deleting.item.id);
      toast.success('Deleted.');
      setDeleting(null);
      cats.reload();
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
          <h1 className="page-head__title">Categories &amp; subjects</h1>
          <p className="page-head__text">Organise exams into categories and subjects.</p>
        </div>
        <Button icon={Plus} onClick={() => setCatForm({ name: '', description: '', sort_order: (cats.data.length + 1) * 10 })}>
          New category
        </Button>
      </div>

      {cats.data.map((c) => (
        <section key={c.id} className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">{c.name}</h2>
              {c.description && <p className="muted">{c.description}</p>}
            </div>
            <div className="row-actions">
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setSubForm({ category_id: c.id, name: '', sort_order: (c.subjects.length + 1) * 10 })}>Subject</Button>
              <button type="button" className="icon-btn" aria-label={`Edit ${c.name}`} onClick={() => setCatForm({ id: c.id, name: c.name, description: c.description || '', sort_order: c.sort_order, slug: c.slug, icon: c.icon })}><Pencil size={18} /></button>
              <button type="button" className="icon-btn icon-btn--danger" aria-label={`Delete ${c.name}`} onClick={() => setDeleting({ kind: 'category', item: c })}><Trash2 size={18} /></button>
            </div>
          </div>
          <ul className="chip-list">
            {c.subjects.map((s) => (
              <li key={s.id} className="chip">
                <span>{s.name}</span>
                <button type="button" className="chip__btn" aria-label={`Edit ${s.name}`} onClick={() => setSubForm({ id: s.id, category_id: c.id, name: s.name, sort_order: s.sort_order, slug: s.slug })}><Pencil size={13} /></button>
                <button type="button" className="chip__btn chip__btn--danger" aria-label={`Delete ${s.name}`} onClick={() => setDeleting({ kind: 'subject', item: s })}><Trash2 size={13} /></button>
              </li>
            ))}
            {c.subjects.length === 0 && <li className="muted">No subjects yet.</li>}
          </ul>
        </section>
      ))}

      {catForm && (
        <NameForm
          title={catForm.id ? 'Edit category' : 'New category'}
          initial={catForm}
          withDescription
          onClose={() => setCatForm(null)}
          onSave={(v) =>
            adminSaveCategory({
              id: v.id,
              name: v.name,
              slug: v.slug || slugify(v.name),
              description: v.description || null,
              icon: v.icon || null,
              sort_order: Number(v.sort_order) || 0,
            })
          }
          onSaved={() => { setCatForm(null); cats.reload(); }}
        />
      )}
      {subForm && (
        <NameForm
          title={subForm.id ? 'Edit subject' : 'New subject'}
          initial={subForm}
          onClose={() => setSubForm(null)}
          onSave={(v) =>
            adminSaveSubject({
              id: v.id,
              category_id: v.category_id,
              name: v.name,
              slug: v.slug || slugify(v.name),
              sort_order: Number(v.sort_order) || 0,
            })
          }
          onSaved={() => { setSubForm(null); cats.reload(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.kind}?`}
          message={
            deleting.kind === 'category'
              ? `"${deleting.item.name}" and all its subjects will be deleted. A category that still has exams cannot be deleted.`
              : `"${deleting.item.name}" will be deleted. Exams using it will simply have no subject.`
          }
          confirmLabel="Delete"
          danger
          loading={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function NameForm({ title, initial, withDescription = false, onClose, onSave, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters.');
    setError('');
    setSaving(true);
    try {
      await onSave({ ...form, name: form.name.trim(), slug: form.id ? form.slug : slugify(form.name) });
      toast.success('Saved.');
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      size="sm"
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="name-form" loading={saving}>Save</Button>
        </>
      }
    >
      <form id="name-form" className="form" onSubmit={submit} noValidate>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <TextField id="nf-name" label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} autoFocus />
        {withDescription && (
          <FormField id="nf-desc" label="Description">
            <textarea id="nf-desc" className="input textarea" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={300} />
          </FormField>
        )}
        <TextField id="nf-order" label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} hint="Lower numbers appear first." />
      </form>
    </Modal>
  );
}
