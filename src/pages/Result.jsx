import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, RotateCcw, LayoutDashboard, Clock, Target, ListChecks, Award } from 'lucide-react';
import { fetchAttemptReview } from '../services/attemptService.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageLoader } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ScoreRing from '../components/exam/ScoreRing.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatDuration, formatMarks } from '../utils/format.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'correct', label: 'Correct' },
  { id: 'incorrect', label: 'Incorrect' },
  { id: 'unanswered', label: 'Unanswered' },
];

function statusOf(q) {
  if (!q.selected_option_id) return 'unanswered';
  return q.is_correct ? 'correct' : 'incorrect';
}

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const review = useAsync(() => fetchAttemptReview(attemptId), [attemptId]);

  const questions = review.data?.questions || [];
  const visible = useMemo(
    () => (filter === 'all' ? questions : questions.filter((q) => statusOf(q) === filter)),
    [questions, filter]
  );

  if (review.loading) return <PageLoader label="Loading your result…" />;
  if (review.error || !review.data?.result) {
    return (
      <div className="container section">
        <ErrorState title="Result not available" error={review.error || new Error('Result not found.')} onRetry={review.reload} />
      </div>
    );
  }

  const { result, exam } = review.data;
  const pct = Number(result.percentage);
  const hasThreshold = result.passed != null;
  const tone = hasThreshold ? (result.passed ? 'green' : 'red') : 'blue';

  return (
    <div className="container section">
      <section className={`result-hero result-hero--${tone}`}>
        <ScoreRing percentage={pct} tone={tone} />
        <div className="result-hero__text">
          <p className="eyebrow">Result</p>
          <h1 className="result-hero__title">{exam.title}</h1>
          {hasThreshold ? (
            <p className={`result-status result-status--${result.passed ? 'pass' : 'fail'}`}>
              {result.passed ? <CheckCircle2 size={20} aria-hidden="true" /> : <XCircle size={20} aria-hidden="true" />}
              {result.passed ? 'Passed' : 'Not passed'} · passing mark {Number(exam.passing_percentage)}%
            </p>
          ) : (
            <p className="result-status">Test completed</p>
          )}
          <p className="result-hero__marks">
            {formatMarks(result.obtained_marks)} <span>/ {formatMarks(result.total_marks)} marks</span>
          </p>
          <div className="result-hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => navigate(`/exams/${exam.id}/take`)}>
              <RotateCcw size={16} aria-hidden="true" /> Retake test
            </button>
            <Link to="/dashboard" className="btn btn--light">
              <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        <div className="mini-stat"><ListChecks size={20} aria-hidden="true" /><strong>{result.total_questions}</strong><span>Total questions</span></div>
        <div className="mini-stat mini-stat--green"><CheckCircle2 size={20} aria-hidden="true" /><strong>{result.correct_answers}</strong><span>Correct</span></div>
        <div className="mini-stat mini-stat--red"><XCircle size={20} aria-hidden="true" /><strong>{result.incorrect_answers}</strong><span>Incorrect</span></div>
        <div className="mini-stat mini-stat--gray"><MinusCircle size={20} aria-hidden="true" /><strong>{result.unanswered}</strong><span>Unanswered</span></div>
        <div className="mini-stat"><Target size={20} aria-hidden="true" /><strong>{formatMarks(result.obtained_marks)}/{formatMarks(result.total_marks)}</strong><span>Marks</span></div>
        <div className="mini-stat"><Award size={20} aria-hidden="true" /><strong>{Number(pct.toFixed(1))}%</strong><span>Percentage</span></div>
        <div className="mini-stat"><Clock size={20} aria-hidden="true" /><strong>{formatDuration(result.time_taken_seconds)}</strong><span>Time taken</span></div>
      </div>

      <h2 className="section-title">Answer review</h2>
      <div className="tabs" role="tablist" aria-label="Filter questions">
        {FILTERS.map((f) => {
          const count = f.id === 'all' ? questions.length : questions.filter((q) => statusOf(q) === f.id).length;
          return (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`tab ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nothing to show" message="No questions match this filter." />
      ) : (
        <div className="review-list">
          {visible.map((q) => {
            const status = statusOf(q);
            const number = questions.indexOf(q) + 1;
            return (
              <article key={q.id} className={`review-card review-card--${status}`}>
                <header className="review-card__head">
                  <span className="badge badge--gray">Question {number}</span>
                  <span className={`badge badge--${status === 'correct' ? 'green' : status === 'incorrect' ? 'red' : 'gray'}`}>
                    {status === 'correct' ? 'Correct' : status === 'incorrect' ? 'Incorrect' : 'Unanswered'}
                  </span>
                </header>
                <h3 className="review-card__text">{q.question_text}</h3>
                <ul className="review-options">
                  {q.options.map((o, i) => {
                    const isCorrect = o.id === q.correct_option_id;
                    const isSelected = o.id === q.selected_option_id;
                    const cls = isCorrect ? 'is-correct' : isSelected ? 'is-wrong' : '';
                    return (
                      <li key={o.id} className={`review-option ${cls}`}>
                        <span className="option__letter">{LETTERS[i]}</span>
                        <span className="review-option__text">{o.option_text}</span>
                        {isCorrect && <span className="review-option__tag">Correct answer</span>}
                        {isSelected && !isCorrect && <span className="review-option__tag review-option__tag--wrong">Your answer</span>}
                        {isSelected && isCorrect && <span className="review-option__tag">Your answer</span>}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation && (
                  <p className="explanation">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
