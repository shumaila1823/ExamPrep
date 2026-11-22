import { Link } from 'react-router-dom';
import {
  ClipboardCheck, TrendingUp, Trophy, Clock, PlayCircle, Sparkles, ArrowRight, History as HistoryIcon, BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { fetchMyResults, fetchMyInProgressAttempts } from '../services/attemptService.js';
import { fetchExams } from '../services/examService.js';
import { computeStats, buildTrend, buildSubjectPerformance } from '../utils/stats.js';
import { formatDate, formatDuration, formatPercent } from '../utils/format.js';
import StatCard from '../components/dashboard/StatCard.jsx';
import ExamCard from '../components/exams/ExamCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { PageLoader } from '../components/common/Loaders.jsx';

const CHART_BLUE = '#2563ff';

export default function Dashboard() {
  const { user, displayName } = useAuth();
  const firstName = String(displayName).split(' ')[0];

  const data = useAsync(async () => {
    const [results, running, exams] = await Promise.all([
      fetchMyResults(user.id),
      fetchMyInProgressAttempts(user.id),
      fetchExams({ limit: 60 }),
    ]);
    return { results, running, exams };
  }, [user.id]);

  if (data.loading) return <PageLoader label="Loading your dashboard…" />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;

  const { results, running, exams } = data.data;
  const stats = computeStats(results);
  const trend = buildTrend(results, 10);
  const subjects = buildSubjectPerformance(results).slice(0, 8);

  // Recommended: exams not attempted yet, weakest subjects first.
  const attemptedIds = new Set(results.map((r) => r.exam_id));
  const weak = new Map(subjects.map((s) => [s.name, s.average]));
  const recommended = exams
    .filter((e) => !attemptedIds.has(e.id))
    .sort((a, b) => (weak.get(a.subject?.name) ?? 101) - (weak.get(b.subject?.name) ?? 101))
    .slice(0, 3);
  const lastResult = results[0];

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Welcome back, {firstName}!</h1>
        <p className="page-head__text">
          {stats.total === 0
            ? 'You have not attempted any test yet. Start your first one below.'
            : 'Here is how your preparation is going.'}
        </p>
      </div>

      <div className="stat-grid">
        <StatCard icon={ClipboardCheck} label="Tests attempted" value={stats.total} tone="blue" />
        <StatCard icon={TrendingUp} label="Average score" value={formatPercent(stats.average)} tone="green" />
        <StatCard icon={Trophy} label="Highest score" value={formatPercent(stats.highest)} tone="gold" />
        <StatCard icon={Clock} label="Time practised" value={formatDuration(stats.totalSeconds)} tone="purple" />
      </div>

      <section className="panel">
        <h2 className="panel__title">
          <PlayCircle size={18} aria-hidden="true" /> Continue preparation
        </h2>
        {running.length > 0 ? (
          <ul className="list">
            {running.map((a) => (
              <li key={a.id} className="list__item">
                <div>
                  <strong>{a.exam?.title || 'Exam'}</strong>
                  <p className="muted">In progress · started {formatDate(a.started_at)}</p>
                </div>
                <Link to={`/exams/${a.exam_id}/take`} className="btn btn--primary btn--sm">
                  Resume <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : lastResult ? (
          <div className="list__item">
            <div>
              <strong>{lastResult.exam?.title}</strong>
              <p className="muted">
                Last score {formatPercent(lastResult.percentage)} on {formatDate(lastResult.created_at)}
              </p>
            </div>
            <Link to={`/exams/${lastResult.exam_id}`} className="btn btn--outline btn--sm">
              Practise again
            </Link>
          </div>
        ) : (
          <p className="muted">No unfinished tests. Pick an exam to begin.</p>
        )}
      </section>

      {stats.total > 0 ? (
        <div className="grid-2">
          <section className="panel">
            <h2 className="panel__title">Score trend (last {trend.length})</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, 'Score']} labelFormatter={(_, p) => p?.[0]?.payload?.exam || ''} />
                  <Line type="monotone" dataKey="score" stroke={CHART_BLUE} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel">
            <h2 className="panel__title">Subject-wise performance</h2>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjects} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} tickFormatter={(v) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v, _n, p) => [`${v}% (${p.payload.attempts} test${p.payload.attempts === 1 ? '' : 's'})`, 'Average']} />
                  <Bar dataKey="average" fill={CHART_BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Your charts will appear here"
          message="Complete a test to see your score trend and subject-wise performance."
          action={<Link to="/explore" className="btn btn--primary">Explore exams</Link>}
        />
      )}

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            <HistoryIcon size={18} aria-hidden="true" /> Recent examination history
          </h2>
          {results.length > 0 && (
            <Link to="/history" className="link">View all</Link>
          )}
        </div>
        {results.length === 0 ? (
          <p className="muted">No tests attempted yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td data-label="Exam">{r.exam?.title}</td>
                    <td data-label="Date">{formatDate(r.created_at)}</td>
                    <td data-label="Score">{formatPercent(r.percentage)}</td>
                    <td data-label="Result">
                      {r.passed == null ? <span className="badge badge--gray">Completed</span> : r.passed ? <span className="badge badge--green">Passed</span> : <span className="badge badge--red">Failed</span>}
                    </td>
                    <td><Link to={`/results/${r.attempt_id}`} className="link">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">
          <Sparkles size={20} aria-hidden="true" /> Recommended practice tests
        </h2>
        {recommended.length === 0 ? (
          <EmptyState title="No new recommendations" message="You have attempted every available exam. New ones are added regularly." />
        ) : (
          <div className="card-grid">
            {recommended.map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
