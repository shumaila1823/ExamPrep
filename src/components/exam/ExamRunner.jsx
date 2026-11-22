import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Flag, Send, Eraser, AlertTriangle } from 'lucide-react';
import { submitAttempt } from '../../services/attemptService.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { formatClock } from '../../utils/format.js';
import QuestionNavigator from './QuestionNavigator.jsx';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function loadSaved(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * The live exam screen: question, options, navigation panel, timer and submit flow.
 * Answers are kept in localStorage so a refresh does not lose them; they are
 * graded on the server only when submitted.
 */
export default function ExamRunner({ exam, questions, attempt, deadlineMs }) {
  const navigate = useNavigate();
  const toast = useToast();
  const storageKey = `examprep:attempt:${attempt.id}`;

  const validIds = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);
  const [answers, setAnswers] = useState(() => {
    const saved = loadSaved(storageKey)?.answers || {};
    return Object.fromEntries(Object.entries(saved).filter(([id]) => validIds.has(id)));
  });
  const [marked, setMarked] = useState(() => {
    const saved = loadSaved(storageKey)?.marked || {};
    return Object.fromEntries(Object.entries(saved).filter(([id]) => validIds.has(id)));
  });
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittingRef = useRef(false);

  // Persist progress locally.
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ answers, marked }));
    } catch {
      /* storage unavailable - progress simply is not saved */
    }
  }, [answers, marked, storageKey]);

  // Warn before closing the tab mid-exam.
  useEffect(() => {
    const handler = (event) => {
      if (submittingRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const doSubmit = useCallback(
    async (auto = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        await submitAttempt(attempt.id, answersRef.current);
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        toast.success(auto ? "Time is up - your exam was submitted automatically." : 'Exam submitted successfully.');
        navigate(`/results/${attempt.id}`, { replace: true });
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        toast.error(`${friendlyError(err)} Your answers are still saved - please try submitting again.`);
        setConfirmOpen(true);
      }
    },
    [attempt.id, navigate, storageKey, toast]
  );

  const remaining = useCountdown(deadlineMs, () => {
    setTimeUp(true);
    setConfirmOpen(false);
    doSubmit(true);
  });

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const lowTime = remaining != null && remaining <= 60;

  const choose = (optionId) => setAnswers((a) => ({ ...a, [question.id]: optionId }));
  const clearAnswer = () =>
    setAnswers((a) => {
      const { [question.id]: _removed, ...rest } = a;
      return rest;
    });
  const toggleMark = () => setMarked((m) => ({ ...m, [question.id]: !m[question.id] }));

  return (
    <div className="exam-page">
      <header className="exam-header">
        <div className="exam-header__info">
          <h1 className="exam-header__title">{exam.title}</h1>
          <p className="exam-header__sub">
            Question {index + 1} of {questions.length} · {answeredCount} answered
          </p>
        </div>
        <div className={`timer ${lowTime ? 'timer--low' : ''}`} role="timer" aria-live="off">
          <Clock size={18} aria-hidden="true" />
          <span>{remaining == null ? '--:--' : formatClock(remaining)}</span>
        </div>
        <Button icon={Send} onClick={() => setConfirmOpen(true)} disabled={submitting}>
          Submit
        </Button>
      </header>

      <div className="progress" aria-label={`${progress}% answered`}>
        <div className="progress__bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="exam-body">
        <section className="question-card" aria-live="polite">
          <div className="question-card__top">
            <span className="badge badge--blue">Question {index + 1}</span>
            <button type="button" className={`mark-btn ${marked[question.id] ? 'is-on' : ''}`} onClick={toggleMark}>
              <Flag size={16} aria-hidden="true" /> {marked[question.id] ? 'Marked for review' : 'Mark for review'}
            </button>
          </div>
          <h2 className="question-card__text">{question.question_text}</h2>

          <div className="options" role="radiogroup" aria-label={`Options for question ${index + 1}`}>
            {question.options.map((option, i) => {
              const selected = answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`option ${selected ? 'is-selected' : ''}`}
                  onClick={() => choose(option.id)}
                >
                  <span className="option__letter">{LETTERS[i]}</span>
                  <span className="option__text">{option.option_text}</span>
                </button>
              );
            })}
          </div>

          <div className="question-card__nav">
            <Button variant="outline" icon={ChevronLeft} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              Previous
            </Button>
            {answers[question.id] && (
              <Button variant="ghost" icon={Eraser} onClick={clearAnswer}>
                Clear answer
              </Button>
            )}
            {index < questions.length - 1 ? (
              <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                Next <ChevronRight size={16} aria-hidden="true" />
              </Button>
            ) : (
              <Button icon={Send} onClick={() => setConfirmOpen(true)} disabled={submitting}>
                Finish &amp; submit
              </Button>
            )}
          </div>
        </section>

        <aside className="exam-side">
          <h3 className="exam-side__title">Question navigator</h3>
          <QuestionNavigator questions={questions} answers={answers} marked={marked} currentIndex={index} onJump={setIndex} />
        </aside>
      </div>

      {confirmOpen && !timeUp && (
        <Modal title="Submit your exam?" onClose={submitting ? undefined : () => setConfirmOpen(false)} size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Keep working
              </Button>
              <Button icon={Send} onClick={() => doSubmit(false)} loading={submitting}>
                Submit now
              </Button>
            </>
          }
        >
          <ul className="summary-list">
            <li><span>Answered</span><strong>{answeredCount}</strong></li>
            <li><span>Not answered</span><strong>{questions.length - answeredCount}</strong></li>
            <li><span>Marked for review</span><strong>{markedCount}</strong></li>
            <li><span>Time left</span><strong>{remaining == null ? '-' : formatClock(remaining)}</strong></li>
          </ul>
          {questions.length - answeredCount > 0 && (
            <p className="notice notice--warn">
              <AlertTriangle size={16} aria-hidden="true" /> {questions.length - answeredCount} question(s) are unanswered.
            </p>
          )}
          <p className="muted">You cannot change your answers after submitting.</p>
        </Modal>
      )}

      {timeUp && (
        <Modal title="Time is up" size="sm">
          <p className="modal__text">{submitting ? 'Submitting your answers…' : 'Your time has finished. Submitting your answers…'}</p>
          {!submitting && (
            <Button onClick={() => doSubmit(true)}>Retry submit</Button>
          )}
        </Modal>
      )}
    </div>
  );
}
