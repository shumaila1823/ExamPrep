import { Link } from 'react-router-dom';
import Logo from '../common/Logo.jsx';
import { TAGLINE } from '../../utils/constants.js';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo light />
          <p className="footer__tagline">{TAGLINE}</p>
          <p className="footer__text">
            Free, high-quality exam preparation for students everywhere. Practice timed MCQ tests,
            get instant results and track your progress.
          </p>
        </div>

        <div>
          <h4 className="footer__title">Platform</h4>
          <ul className="footer__list">
            <li><Link to="/explore">Explore Exams</Link></li>
            <li><Link to="/practice">Practice &amp; Resources</Link></li>
            <li><Link to="/leaderboard">Leaderboard</Link></li>
            <li><Link to="/register">Create free account</Link></li>
            <li><Link to="/login">Student login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer__title">Exam categories</h4>
          <ul className="footer__list">
            <li><Link to="/explore?category=academic">Academic</Link></li>
            <li><Link to="/explore?category=competitive">Competitive</Link></li>
            <li><Link to="/explore?category=job-recruitment">Job Recruitment</Link></li>
            <li><Link to="/explore?category=admission">Admission</Link></li>
            <li><Link to="/explore?category=international">International</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer__title">Company</h4>
          <ul className="footer__list">
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/forgot-password">Forgot password</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>&copy; {year} ExamPrep Global. 100% free for every student.</p>
          <p>Built for learners, by educators and developers.</p>
        </div>
      </div>
    </footer>
  );
}
