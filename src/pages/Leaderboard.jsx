import { useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { fetchLeaderboard } from '../services/examService.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatPercent } from '../utils/format.js';

const PERIODS = [
  { label: 'All time', days: null },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 7 days', days: 7 },
];

export default function Leaderboard() {
  const { profile } = useAuth();
  const [periodIndex, setPeriodIndex] = useState(0);
  const board = useAsync(() => fetchLeaderboard(PERIODS[periodIndex].days, 50), [periodIndex]);

  return (
    <div className="container section">
      <div className="page-head">
        <h1 className="page-head__title">Leaderboard</h1>
        <p className="page-head__text">
          Students ranked by average score across all completed tests. Only first names and a last
          initial are shown, and students can hide themselves in their profile settings.
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label="Leaderboard period">
        {PERIODS.map((period, index) => (
          <button
            key={period.label}
            type="button"
            role="tab"
            aria-selected={index === periodIndex}
            className={`tab ${index === periodIndex ? 'is-active' : ''}`}
            onClick={() => setPeriodIndex(index)}
          >
            {period.label}
          </button>
        ))}
      </div>

      {board.loading ? (
        <PageLoader label="Loading leaderboard…" />
      ) : board.error ? (
        <ErrorState error={board.error} onRetry={board.reload} />
      ) : board.data.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No rankings yet"
          message="Complete a test to appear on the leaderboard."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th className="hide-sm">Country</th>
                <th>Tests</th>
                <th>Average</th>
                <th className="hide-sm">Best</th>
              </tr>
            </thead>
            <tbody>
              {board.data.map((row) => {
                const rank = Number(row.rank_no);
                const isMe = profile && row.display_name && profile.full_name &&
                  row.display_name.startsWith(profile.full_name.trim().split(' ')[0]);
                return (
                  <tr key={rank} className={isMe ? 'is-me' : ''}>
                    <td>
                      {rank <= 3 ? (
                        <span className={`medal medal--${rank}`}>
                          <Medal size={16} aria-hidden="true" /> {rank}
                        </span>
                      ) : (
                        rank
                      )}
                    </td>
                    <td>
                      <strong>{row.display_name}</strong>
                    </td>
                    <td className="hide-sm">{row.country || '—'}</td>
                    <td>{row.tests_taken}</td>
                    <td>
                      <strong>{formatPercent(row.average_percentage)}</strong>
                    </td>
                    <td className="hide-sm">{formatPercent(row.best_percentage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
