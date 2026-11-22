import { LayoutDashboard, FileText, Layers, Link2, Mail } from 'lucide-react';
import SidebarLayout from './SidebarLayout.jsx';

const LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/exams', label: 'Exams & questions', icon: FileText },
  { to: '/admin/taxonomy', label: 'Categories & subjects', icon: Layers },
  { to: '/admin/resources', label: 'Free resources', icon: Link2 },
  { to: '/admin/messages', label: 'Contact messages', icon: Mail },
];

export default function AdminLayout() {
  return <SidebarLayout heading="Admin Panel" subheading="Manage exam content" links={LINKS} />;
}
