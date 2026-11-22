import { Link } from 'react-router-dom';
import { Target, Heart, Globe2, ShieldCheck } from 'lucide-react';

const VALUES = [
  { icon: Heart, title: 'Free for everyone', text: 'Quality preparation should not depend on how much a student can pay.' },
  { icon: Globe2, title: 'Global by design', text: 'Exams for students in every country, from school level to professional certification.' },
  { icon: ShieldCheck, title: 'Trustworthy results', text: 'Tests are graded securely on the server and every result is tied to your own account.' },
  { icon: Target, title: 'Focused on progress', text: 'Clear statistics and explanations help you learn from every attempt.' },
];

export default function About() {
  return (
    <div className="container section">
      <div className="page-head">
        <h1 className="page-head__title">About ExamPrep Global</h1>
        <p className="page-head__text">One Platform. Every Exam. Endless Possibilities.</p>
      </div>

      <div className="prose">
        <p>
          ExamPrep Global is a free online examination preparation platform. Students from different
          countries can practise for academic, competitive, admission, aptitude and job recruitment
          examinations in one place.
        </p>
        <p>
          Every test follows a real exam format: multiple-choice questions, a countdown timer, a question
          navigator and instant, detailed results with explanations. Registered students also get a
          personal dashboard to follow their progress over time.
        </p>
        <p>
          Our mission is simple: make good exam practice available to every learner, wherever they live.
        </p>
      </div>

      <div className="card-grid card-grid--two">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.title} className="feature-card">
              <span className="feature-card__icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="feature-card__title">{value.title}</h2>
              <p className="feature-card__text">{value.text}</p>
            </div>
          );
        })}
      </div>

      <div className="cta cta--compact">
        <h2 className="cta__title">Start practising today</h2>
        <div className="cta__buttons">
          <Link to="/register" className="btn btn--accent btn--lg">
            Create free account
          </Link>
          <Link to="/explore" className="btn btn--glass btn--lg">
            Explore exams
          </Link>
        </div>
      </div>
    </div>
  );
}
