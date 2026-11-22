import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { fetchMyResults } from '../services/attemptService.js';
import { formatDateTime, formatDuration, formatMarks, formatPercent } from '../utils/format.js';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { PageLoader } from '../components/common/Loaders.jsx';

export default function History() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const results = useAsync(() => fetchMyResults(user.id), [user.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (results.data || []).filter((r) => {
      if (q && !`${r.exam?.title || ''} ${r.exam?.subject?.name || ''}`.toLowerCase().includes(q)) return false;
      if (status === 'passed') return r.passed === true;
      if (status === 'failed') return r.passed === false;
      return true;
    });
  }, [results.data, query, status]);

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Test history</h1>
        <p className="page-head__text">Every test you have completed, with full review of your answers.</p>
      </div>

      {results.loading ? (
        <PageLoader label="Loading history…" />
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : results.data.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No tests yet"
          message="Your completed tests will be listed here."
          action={<Link to="/explore" className="btn btn--primary">Explore exams</Link>}
        />
      ) : (
        <>
          <div className="toolbar">
            <div className="field__control toolbar__grow">
              <Search size={18} className="field__icon" aria-hidden="true" />
              <input className="input input--icon" placeholder="Search by exam or subject" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search history" />
            </div>
            <select className="input toolbar__select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by result">
              <option value="all">All results</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No matching tests" message="Try a different search or filter." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Date</th>
                    <th>Correct</th>
                    <th>Marks</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Result</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Exam">
                        <strong>{r.exam?.title}</strong>
                        <div className="muted">{r.exam?.subject?.name || r.exam?.category?.name}</div>
                      </td>
                      <td data-label="Date">{formatDateTime(r.created_at)}</td>
                      <td data-label="Correct">{r.correct_answers}/{r.total_questions}</td>
                      <td data-label="Marks">{formatMarks(r.obtained_marks)}/{formatMarks(r.total_marks)}</td>
                      <td data-label="Score">{formatPercent(r.percentage)}</td>
                      <td data-label="Time">{formatDuration(r.time_taken_seconds)}</td>
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
        </>
      )}
    </div>
  );
}
