import { Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from './supabase/client.js';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProtectedRoute from './components/routes/ProtectedRoute.jsx';
import AdminRoute from './components/routes/AdminRoute.jsx';

import Home from './pages/Home.jsx';
import Explore from './pages/Explore.jsx';
import ExamDetail from './pages/ExamDetail.jsx';
import Practice from './pages/Practice.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Profile from './pages/Profile.jsx';
import TakeExam from './pages/TakeExam.jsx';
import Result from './pages/Result.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminExams from './pages/admin/AdminExams.jsx';
import AdminQuestions from './pages/admin/AdminQuestions.jsx';
import AdminTaxonomy from './pages/admin/AdminTaxonomy.jsx';
import AdminResources from './pages/admin/AdminResources.jsx';
import AdminMessages from './pages/admin/AdminMessages.jsx';

function SetupNotice() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">Connect Supabase to get started</h1>
        <p className="auth-card__sub">
          The app could not find your Supabase settings. Copy <code>.env.example</code> to <code>.env</code>, fill in{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>.
          On Vercel, add the same two variables in Project Settings → Environment Variables and redeploy.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="exams/:examId" element={<ExamDetail />} />
          <Route path="practice" element={<Practice />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          {/* Logged-in students */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="history" element={<History />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="results/:attemptId" element={<Result />} />
          </Route>

          {/* Administrators only */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="exams/:examId/questions" element={<AdminQuestions />} />
              <Route path="taxonomy" element={<AdminTaxonomy />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="messages" element={<AdminMessages />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Distraction-free exam screen (no navbar/footer), students only */}
        <Route element={<ProtectedRoute />}>
          <Route path="exams/:examId/take" element={<TakeExam />} />
        </Route>
      </Routes>
    </>
  );
}
