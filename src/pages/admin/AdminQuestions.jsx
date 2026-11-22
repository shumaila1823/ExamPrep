import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  adminFetchExam, adminListQuestions, adminSaveQuestion, adminDeleteQuestion,
} from '../../services/adminService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { FormField } from '../../components/common/Fields.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];
const BLANK = { id: null, questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' };

export default function AdminQuestions() {
  const { examId } = useParams();
  const toast = useToast();
  const data = useAsync(async () => {
    const [exam, questions] = await Promise.all([adminFetchExam(examId), adminListQuestions(examId)]);
    return { exam, questions };
  }, [examId]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  if (data.loading) return <PageLoader label="Loading questions…" />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  const { exam, questions } = data.data;
  if (!exam) return <EmptyState title="Exam not found" action={<Link to="/admin/exams" className="btn btn--primary">Back to exams</Link>} />;

  const openEdit = (q) =>
    setEditing({
      id: q.id,
      questionText: q.question_text,
      options: q.options.map((o) => o.option_text),
      correctIndex: Math.max(0, q.options.findIndex((o) => o.id === q.correct_option_id)),
      explanation: q.explanation || '',
    });

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await adminDeleteQuestion(deleting.id);
      toast.success('Question deleted.');
      setDeleting(null);
      data.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <Link to="/admin/exams" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to exams</Link>
      <div className="page-head page-head--left page-head--row">
        <div>
          <h1 className="page-head__title">{exam.title}</h1>
          <p className="page-head__text">
            {questions.length} question{questions.length === 1 ? '' : 's'} · {exam.is_published ? 'Published' : 'Draft'} · marks are shared equally between questions
          </p>
        </div>
        <Button icon={Plus} onClick={() => setEditing({ ...BLANK, options: ['', '', '', ''] })}>Add question</Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions yet" message="Add multiple-choice questions with four options and one correct answer." />
      ) : (
        <div className="stack stack--tight">
          {questions.map((q, i) => (
            <article key={q.id} className="panel q-admin">
              <div className="q-admin__head">
                <span className="badge badge--blue">Q{i + 1}</span>
                <div className="row-actions">
                  <button type="button" className="icon-btn" aria-label={`Edit question ${i + 1}`} onClick={() => openEdit(q)}><Pencil size={18} /></button>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={`Delete question ${i + 1}`} onClick={() => setDeleting(q)}><Trash2 size={18} /></button>
                </div>
              </div>
              <h3 className="q-admin__text">{q.question_text}</h3>
              <ul className="review-options">
                {q.options.map((o, idx) => (
                  <li key={o.id} className={`review-option ${o.id === q.correct_option_id ? 'is-correct' : ''}`}>
                    <span className="option__letter">{LETTERS[idx]}</span>
                    <span className="review-option__text">{o.option_text}</span>
                    {o.id === q.correct_option_id && <CheckCircle2 size={18} aria-label="Correct answer" />}
                  </li>
                ))}
              </ul>
              {q.explanation && <p className="explanation"><strong>Explanation:</strong> {q.explanation}</p>}
            </article>
          ))}
        </div>
      )}

      {editing && (
        <QuestionForm
          examId={examId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); data.reload(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete question?"
          message="This question and its answer will be removed. Past results keep their scores."
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

function QuestionForm({ examId, initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setOption = (i) => (event) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? event.target.value : o)) }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.questionText.trim()) return setError('Enter the question text.');
    if (form.options.some((o) => !o.trim())) return setError('All four options must be filled in.');
    const lower = form.options.map((o) => o.trim().toLowerCase());
    if (new Set(lower).size !== 4) return setError('Each option must be different.');
    setError('');
    setSaving(true);
    try {
      await adminSaveQuestion({
        id: form.id,
        examId,
        questionText: form.questionText.trim(),
        options: form.options.map((o) => o.trim()),
        correctIndex: form.correctIndex,
        explanation: form.explanation.trim(),
      });
      toast.success(form.id ? 'Question updated.' : 'Question added.');
      onSaved();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={form.id ? 'Edit question' : 'Add question'}
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="question-form" loading={saving}>Save question</Button>
        </>
      }
    >
      <form id="question-form" className="form" onSubmit={submit} noValidate>
        {error && <p className="notice notice--error" role="alert">{error}</p>}
        <FormField id="q-text" label="Question">
          <textarea id="q-text" className="input textarea" rows={3} maxLength={2000} value={form.questionText} onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))} />
        </FormField>
        <fieldset className="fieldset">
          <legend className="field__label">Options - select the correct answer</legend>
          {form.options.map((value, i) => (
            <div key={i} className={`option-edit ${form.correctIndex === i ? 'is-correct' : ''}`}>
              <input
                type="radio"
                name="correct"
                checked={form.correctIndex === i}
                onChange={() => setForm((f) => ({ ...f, correctIndex: i }))}
                aria-label={`Option ${LETTERS[i]} is correct`}
              />
              <span className="option__letter">{LETTERS[i]}</span>
              <input className="input" value={value} onChange={setOption(i)} maxLength={500} placeholder={`Option ${LETTERS[i]}`} aria-label={`Option ${LETTERS[i]} text`} />
            </div>
          ))}
        </fieldset>
        <FormField id="q-exp" label="Explanation (shown after submission)">
          <textarea id="q-exp" className="input textarea" rows={3} maxLength={2000} value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} />
        </FormField>
      </form>
    </Modal>
  );
}
