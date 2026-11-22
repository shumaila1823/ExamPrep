import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ListChecks, Target, Award, Lock, Play, FileQuestion, Info } from 'lucide-react';
import { fetchExam } from '../services/examService.js';
import { fetchMyResults } from '../services/attemptService.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { EXAM_TYPES } from '../utils/constants.js';
import { formatDate, formatPercent } from '../utils/format.js';

export default function ExamDetail() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const exam = useAsync(() => fetchExam(examId), [examId]);
  const history = useAsync(
    async () => {
      if (!user) return [];
      const all = await fetchMyResults(user.id);
      return all.filter((r) => r.exam_id === examId);
    },
    [user?.id, examId]
  );

  if (exam.loading) return <PageLoader label="Loading exam…" />;
  if (exam.error) {
    return (
      <div className="container section">
        <ErrorState error={exam.error} onRetry={exam.reload} />
      </div>
    );
  }
  if (!exam.data) {
    return (
      <div className="container section">
        <EmptyState
          icon={FileQuestion}
          title="Exam not found"
          message="This exam does not exist or is not published."
          action={
            <Link to="/explore" className="btn btn--primary">
              Browse exams
            </Link>
          }
        />
      </div>
    );
  }

  const e = exam.data;
  const attempts = history.data || [];
  const best = attempts.length ? Math.max(...attempts.map((a) => Number(a.percentage))) : null;
  const canStart = e.is_published && e.question_count > 0;

  const start = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/exams/${e.id}/take` } } });
      return;
    }
    navigate(`/exams/${e.id}/take`);
  };

  return (
    <div className="container section">
      <Link to="/explore" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Back to exams
      </Link>

      <div className="detail">
        <div className="detail__main">
          <div className="detail__badges">
            <span className="badge badge--blue">{EXAM_TYPES[e.exam_type]?.label || 'Exam'}</span>
            {e.category && <span className="badge badge--gray">{e.category.name}</span>}
            {e.subject && <span className="badge badge--gray">{e.subject.name}</span>}
            {!e.is_published && <span className="badge badge--red">Unpublished (visible to admins only)</span>}
          </div>
          <h1 className="detail__title">{e.title}</h1>
          {e.description && <p className="detail__desc">{e.description}</p>}

          <div className="info-grid">
            <div className="info-tile">
              <ListChecks size={20} aria-hidden="true" />
              <strong>{e.question_count}</strong>
              <span>Questions</span>
            </div>
            <div className="info-tile">
              <Clock size={20} aria-hidden="true" />
              <strong>{e.duration_minutes} min</strong>
              <span>Duration</span>
            </div>
            <div className="info-tile">
              <Target size={20} aria-hidden="true" />
              <strong>{e.total_marks}</strong>
              <span>Total marks</span>
            </div>
            <div className="info-tile">
              <Award size={20} aria-hidden="true" />
              <strong>{e.passing_percentage != null ? `${Number(e.passing_percentage)}%` : 'None'}</strong>
              <span>Passing mark</span>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">
              <Info size={18} aria-hidden="true" /> Instructions
            </h2>
            <ul className="bullet-list">
              <li>Every question has four options and exactly one correct answer.</li>
              <li>The countdown starts as soon as you begin and the test is submitted automatically when time runs out.</li>
              <li>You can move between questions, change answers and mark questions for review.</li>
              <li>Marks are shared equally between all questions. There is no negative marking.</li>
              <li>Results, correct answers and explanations are shown after you submit.</li>
              <li>If you leave and come back before time is up, your running attempt can be resumed.</li>
            </ul>
          </div>
        </div>

        <aside className="detail__side">
          <div className="panel panel--accent">
            <h2 className="panel__title">Ready to begin?</h2>
            {canStart ? (
              <>
                <p className="muted">
                  {isAuthenticated
                    ? 'Start whenever you are ready. The timer begins immediately.'
                    : 'You need a free account to attempt this exam.'}
                </p>
                <button type="button" className="btn btn--primary btn--lg btn--block" onClick={start}>
                  {isAuthenticated ? (
                    <>
                      <Play size={18} aria-hidden="true" /> Start exam
                    </>
                  ) : (
                    <>
                      <Lock size={18} aria-hidden="true" /> Log in to start
                    </>
                  )}
                </button>
                {!isAuthenticated && (
                  <p className="panel__foot">
                    New here?{' '}
                    <Link to="/register" state={{ from: { pathname: location.pathname } }}>
                      Create a free account
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <p className="muted">This exam has no questions yet, so it cannot be started.</p>
            )}
          </div>

          {isAuthenticated && attempts.length > 0 && (
            <div className="panel">
              <h2 className="panel__title">Your attempts</h2>
              <p className="muted">
                {attempts.length} attempt{attempts.length === 1 ? '' : 's'} · best score {formatPercent(best)}
              </p>
              <ul className="mini-list">
                {attempts.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link to={`/results/${a.attempt_id}`}>
                      <span>{formatDate(a.created_at)}</span>
                      <strong>{formatPercent(a.percentage)}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
