import { LayoutDashboard, FileText, Layers, Link2, Mail, Users } from 'lucide-react';
import SidebarLayout from './SidebarLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/exams', label: 'Exams & questions', icon: FileText },
  { to: '/admin/users', label: 'Users & teachers', icon: Users },
  { to: '/admin/taxonomy', label: 'Categories & subjects', icon: Layers },
  { to: '/admin/resources', label: 'Free resources', icon: Link2 },
  { to: '/admin/messages', label: 'Contact messages', icon: Mail },
];

const TEACHER_LINKS = [{ to: '/admin/exams', label: 'My exams & questions', icon: FileText }];

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  return isAdmin ? (
    <SidebarLayout heading="Admin Panel" subheading="Manage and supervise content" links={ADMIN_LINKS} />
  ) : (
    <SidebarLayout heading="Teacher Panel" subheading="Create exams for your students" links={TEACHER_LINKS} />
  );
}
