import { useMemo, useState } from 'react';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { adminListUsers, adminSetUserRole } from '../../services/adminService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { friendlyError } from '../../utils/errors.js';
import { formatDate } from '../../utils/format.js';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { PageLoader } from '../../components/common/Loaders.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Teacher requests' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'student', label: 'Students' },
  { id: 'admin', label: 'Admins' },
];

export default function AdminUsers() {
  const { user } = useAuth();
  const toast = useToast();
  const users = useAsync(adminListUsers, []);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const list = users.data || [];
  const pendingCount = list.filter((u) => u.role === 'student' && u.teacher_requested).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((u) => {
      if (q && !`${u.full_name} ${u.email}`.toLowerCase().includes(q)) return false;
      if (filter === 'pending') return u.role === 'student' && u.teacher_requested;
      if (filter === 'all') return true;
      return u.role === filter;
    });
  }, [list, filter, query]);

  const setRole = async (target, role, message) => {
    setBusyId(target.id);
    try {
      await adminSetUserRole(target.id, role);
      toast.success(message);
      await users.reload();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (users.loading && !users.data) return <PageLoader label="Loading users…" />;
  if (users.error) return <ErrorState error={users.error} onRetry={users.reload} />;

  return (
    <div className="stack">
      <div className="page-head page-head--left">
        <h1 className="page-head__title">Users &amp; teachers</h1>
        <p className="page-head__text">
          Approve teacher requests and manage roles. Teachers can create and manage their own exams; you can supervise all of them.
          {pendingCount > 0 && <strong> {pendingCount} teacher request{pendingCount === 1 ? '' : 's'} waiting.</strong>}
        </p>
      </div>

      <div className="toolbar">
        <div className="field__control toolbar__grow">
          <Search size={18} className="field__icon" aria-hidden="true" />
          <input className="input input--icon" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Filter users">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`tab ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label}{f.id === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Users} title="No users found" message="Try another search or filter." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const isMe = u.id === user.id;
                const pending = u.role === 'student' && u.teacher_requested;
                return (
                  <tr key={u.id}>
                    <td data-label="Name"><strong>{u.full_name || '-'}</strong>{isMe && <span className="muted"> (you)</span>}</td>
                    <td data-label="Email">{u.email || '-'}</td>
                    <td data-label="Role">
                      {u.role === 'admin' && <span className="badge badge--blue">Admin</span>}
                      {u.role === 'teacher' && <span className="badge badge--green">Teacher</span>}
                      {u.role === 'student' && <span className="badge badge--gray">Student</span>}
                      {pending && <span className="badge badge--gold" style={{ marginLeft: 6 }}>Requested teacher</span>}
                    </td>
                    <td data-label="Joined">{formatDate(u.created_at)}</td>
                    <td data-label="Actions">
                      {isMe ? (
                        <span className="muted">-</span>
                      ) : (
                        <div className="row-actions">
                          {u.role !== 'teacher' && (
                            <Button size="sm" variant={pending ? 'primary' : 'outline'} icon={UserCheck} loading={busyId === u.id}
                              onClick={() => setRole(u, 'teacher', `${u.full_name || 'User'} is now a teacher.`)}>
                              {pending ? 'Approve teacher' : 'Make teacher'}
                            </Button>
                          )}
                          {u.role === 'teacher' && (
                            <Button size="sm" variant="outline" icon={UserX} loading={busyId === u.id}
                              onClick={() => setRole(u, 'student', `${u.full_name || 'User'} is now a student.`)}>
                              Remove teacher
                            </Button>
                          )}
                          {pending && (
                            <Button size="sm" variant="ghost" disabled={busyId === u.id}
                              onClick={() => setRole(u, 'student', 'Request declined.')}>
                              Decline
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
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
