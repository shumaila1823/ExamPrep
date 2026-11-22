import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function Logo({ light = false, to = '/' }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo--light' : ''}`} aria-label="ExamPrep Global home">
      <span className="logo__mark">
        <GraduationCap size={22} aria-hidden="true" />
      </span>
      <span className="logo__text">
        ExamPrep <span className="logo__accent">Global</span>
      </span>
    </Link>
  );
}
