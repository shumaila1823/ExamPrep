import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ListChecks, Eye, EyeOff, Search } from 'lucide-react';
import {
  adminListExams, adminSaveExam, adminDeleteExam, adminSetPublished,
} from '../../services/adminService.js';
import { fetchCategories } from '../../services/examService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { EXAM_TYPES, EXAM_TYPE_OPTIONS } from '../../utils/constants.js';
import { TextField, FormField } from '../../components/common/Fields.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

const BLANK = {
  title: '', description: '', category_id: '', subject_id: '', exam_type: 'quiz',
  duration_minutes: 30, total_marks: 100, passing_percentage: 40, has_pass: true,
  is_published: false, is_featured: false,
};

function toForm(exam) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description || '',
    category_id: exam.category_id,
    subject_id: exam.subject_id || '',
    exam_type: exam.exam_type,
    duration_minutes: exam.duration_minutes,
    total_marks: exam.total_marks,
    passing_percentage: exam.passing_percentage ?? 40,
    has_pass: exam.passing_percentage != null,
    is_published: exam.is_published,
    is_featured: exam.is_featured,
    question_count: exam.question_count,
  };
}

export default function AdminExams() {
  const toast = useToast();
  const exams = useAsync(adminListExams, []);
  const cats = useAsync(fetchCategories, []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (exams.data || []).filter((e) => !q || e.title.toLowerCase().includes(q));
  }, [exams.data, search]);

  const togglePublish = async (exam) => {
    if (!exam.is_published && exam.question_count === 0) {
      toast.error('Add at least one question before publishing this exam.');
      return;
    }
    try {
      await adminSetPublished(exam.id, !exam.is_published);
      toast.success(exam.is_published ? 'Exam unpublished.' : 'Exam published.');
      exams.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminDeleteExam(deleting.id);
      toast.success('Exam deleted.');
      setDeleting(null);
      exams.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  if (exams.loading || cats.loading) return <PageLoader label="Loading exams…" />;
  if (exams.error || cats.error) return <ErrorState error={exams.error || cats.error} onRetry={() => { exams.reload(); cats.reload(); }} />;

  return (
    <div className="stack">
      <div className="page-head page-head--left page-head--row">
        <div>
          <h1 className="page-head__title">Exams</h1>
          <p className="page-head__text">Create exams, set duration, marks and passing percentage, then add questions.</p>
        </div>
        <Button icon={Plus} onClick={() => setEditing({ ...BLANK, category_id: cats.data[0]?.id || '' })}>
          New exam
        </Button>
      </div>

      <div className="field__control">
        <Search size={18} className="field__icon" aria-hidden="true" />
        <input className="input input--icon" placeholder="Search exams" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search exams" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No exams found" message="Create your first exam to get started." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Exam</th><th>Type</th><th>Questions</th><th>Duration</th><th>Marks</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td data-label="Exam">
                    <strong>{e.title}</strong>
                    <div className="muted">{e.category?.name}{e.subject ? ` · ${e.subject.name}` : ''}</div>
                  </td>
                  <td data-label="Type">{EXAM_TYPES[e.exam_type]?.short}</td>
                  <td data-label="Questions">{e.question_count}</td>
                  <td data-label="Duration">{e.duration_minutes} min</td>
                  <td data-label="Marks">{e.total_marks}{e.passing_percentage != null ? ` (pass ${Number(e.passing_percentage)}%)` : ''}</td>
                  <td data-label="Status">{e.is_published ? <span className="badge badge--green">Published</span> : <span className="badge badge--gray">Draft</span>}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <Link to={`/admin/exams/${e.id}/questions`} className="icon-btn" title="Manage questions" aria-label={`Manage questions for ${e.title}`}><ListChecks size={18} /></Link>
                      <button type="button" className="icon-btn" title={e.is_published ? 'Unpublish' : 'Publish'} aria-label={e.is_published ? 'Unpublish exam' : 'Publish exam'} onClick={() => togglePublish(e)}>
                        {e.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${e.title}`} onClick={() => setEditing(toForm(e))}><Pencil size={18} /></button>
                      <button type="button" className="icon-btn icon-btn--danger" title="Delete" aria-label={`Delete ${e.title}`} onClick={() => setDeleting(e)}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ExamForm
          initial={editing}
          categories={cats.data}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); exams.reload(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete exam?"
          message={`"${deleting.title}" and all its questions will be permanently deleted. Exams that students have already attempted cannot be deleted - unpublish them instead.`}
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

function ExamForm({ initial, categories, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const subjects = categories.find((c) => c.id === form.category_id)?.subjects || [];

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Title must be at least 3 characters.';
    if (!form.category_id) next.category_id = 'Choose a category.';
    const duration = Number(form.duration_minutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 360) next.duration_minutes = 'Enter 1 to 360 minutes.';
    const marks = Number(form.total_marks);
    if (!Number.isInteger(marks) || marks < 1) next.total_marks = 'Enter a whole number of at least 1.';
    const pass = Number(form.passing_percentage);
    if (form.has_pass && (Number.isNaN(pass) || pass < 0 || pass > 100)) next.passing_percentage = 'Enter 0 to 100.';
    if (form.is_published && !form.id) {
      next.is_published = 'Add questions first, then publish.';
    }
    if (form.is_published && form.id && form.question_count === 0) {
      next.is_published = 'This exam has no questions yet, so it cannot be published.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await adminSaveExam({
        id: form.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id,
        subject_id: form.subject_id || null,
        exam_type: form.exam_type,
        duration_minutes: duration,
        total_marks: marks,
        passing_percentage: form.has_pass ? pass : null,
        is_published: form.is_published,
        is_featured: form.is_featured,
      });
      toast.success(form.id ? 'Exam updated.' : 'Exam created. Now add its questions.');
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={form.id ? 'Edit exam' : 'New exam'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="exam-form" loading={saving}>{form.id ? 'Save changes' : 'Create exam'}</Button>
        </>
      }
    >
      <form id="exam-form" className="form" onSubmit={submit} noValidate>
        <TextField id="ex-title" label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={200} />
        <FormField id="ex-desc" label="Description">
          <textarea id="ex-desc" className="input textarea" rows={3} value={form.description} onChange={set('description')} maxLength={1000} />
        </FormField>
        <div className="form__grid">
          <FormField id="ex-cat" label="Category" error={errors.category_id}>
            <select id="ex-cat" className="input" value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, subject_id: '' }))}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField id="ex-sub" label="Subject / topic">
            <select id="ex-sub" className="input" value={form.subject_id} onChange={set('subject_id')}>
              <option value="">None</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField id="ex-type" label="Exam type">
            <select id="ex-type" className="input" value={form.exam_type} onChange={set('exam_type')}>
              {EXAM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <TextField id="ex-dur" label="Duration (minutes)" type="number" min="1" max="360" value={form.duration_minutes} onChange={set('duration_minutes')} error={errors.duration_minutes} />
          <TextField id="ex-marks" label="Total marks" type="number" min="1" value={form.total_marks} onChange={set('total_marks')} error={errors.total_marks} />
          <TextField id="ex-pass" label="Passing percentage" type="number" min="0" max="100" value={form.passing_percentage} onChange={set('passing_percentage')} error={errors.passing_percentage} disabled={!form.has_pass} />
        </div>
        <label className="check">
          <input type="checkbox" checked={form.has_pass} onChange={set('has_pass')} />
          <span>Use a passing percentage (pass/fail is shown on results)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} />
          <span>Featured on the homepage</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.is_published} onChange={set('is_published')} />
          <span>Published (visible to students)</span>
        </label>
        {errors.is_published && <p className="field__error">{errors.is_published}</p>}
      </form>
    </Modal>
  );
}
