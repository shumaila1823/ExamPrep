import { Link } from 'react-router-dom';
import { FileText, HelpCircle, Users, ClipboardCheck, Mail, Plus } from 'lucide-react';
import { adminFetchOverview, adminListExams } from '../../services/adminService.js';
import { useAsync } from '../../hooks/useAsync.js';
import StatCard from '../../components/dashboard/StatCard.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';
import { formatDate, formatNumber } from '../../utils/format.js';

export default function AdminOverview() {
  const data = useAsync(async () => {
    const [overview, exams] = await Promise.all([adminFetchOverview(), adminListExams()]);
    return { overview, exams };
  }, []);

  if (data.loading) return <PageLoader label="Loading admin overview…" />;
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  const { overview, exams } = data.data;

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Admin overview</h1>
        <p className="page-head__text">Manage exams, questions and platform content.</p>
      </div>

      <div className="stat-grid">
        <StatCard icon={FileText} label="Exams" value={formatNumber(overview.exams)} tone="blue" />
        <StatCard icon={HelpCircle} label="Questions" value={formatNumber(overview.questions)} tone="purple" />
        <StatCard icon={Users} label="Students" value={formatNumber(overview.students)} tone="green" />
        <StatCard icon={ClipboardCheck} label="Tests completed" value={formatNumber(overview.attempts)} tone="gold" />
        <StatCard icon={Mail} label="Contact messages" value={formatNumber(overview.messages)} tone="blue" />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Latest exams</h2>
          <Link to="/admin/exams" className="btn btn--primary btn--sm">
            <Plus size={16} aria-hidden="true" /> Manage exams
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Questions</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {exams.slice(0, 6).map((e) => (
                <tr key={e.id}>
                  <td data-label="Title"><Link to={`/admin/exams/${e.id}/questions`} className="link">{e.title}</Link></td>
                  <td data-label="Category">{e.category?.name}</td>
                  <td data-label="Questions">{e.question_count}</td>
                  <td data-label="Status">{e.is_published ? <span className="badge badge--green">Published</span> : <span className="badge badge--gray">Draft</span>}</td>
                  <td data-label="Created">{formatDate(e.created_at)}</td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr><td colSpan={5} className="muted">No exams yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
