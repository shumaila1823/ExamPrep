import { LayoutDashboard, History, UserCircle, Trophy, BookOpen } from 'lucide-react';
import SidebarLayout from './SidebarLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/history', label: 'Test history', icon: History },
  { to: '/explore', label: 'Find exams', icon: BookOpen },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile settings', icon: UserCircle },
];

export default function DashboardLayout() {
  const { displayName } = useAuth();
  return <SidebarLayout heading="My Dashboard" subheading={displayName} links={LINKS} />;
}
