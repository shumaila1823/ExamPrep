import { Link } from 'react-router-dom';
import { ExternalLink, Zap, Layers, BookOpen, Timer, BookMarked } from 'lucide-react';
import { fetchExams, fetchResources } from '../services/examService.js';
import { useAsync } from '../hooks/useAsync.js';
import ExamCard from '../components/exams/ExamCard.jsx';
import { CardSkeletons } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

const MODES = [
  { type: 'full_mock', icon: Timer, title: 'Full-length mock tests', text: 'Complete papers that simulate the real exam.' },
  { type: 'subject', icon: BookOpen, title: 'Subject-wise tests', text: 'Revise one whole subject at a time.' },
  { type: 'topic', icon: Layers, title: 'Topic-wise tests', text: 'Drill a single topic until it is strong.' },
  { type: 'quiz', icon: Zap, title: 'Short practice quizzes', text: 'Quick sessions for busy days.' },
];

export default function Practice() {
  const quizzes = useAsync(() => fetchExams({ examType: 'quiz', limit: 6 }), []);
  const resources = useAsync(fetchResources, []);

  return (
    <div className="container section">
      <div className="page-head">
        <h1 className="page-head__title">Practice</h1>
        <p className="page-head__text">
          Choose how you want to practise, then jump into a test. Everything here is free.
        </p>
      </div>

      <div className="card-grid card-grid--four">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <Link key={mode.type} to={`/explore?type=${mode.type}`} className="feature-card feature-card--link">
              <span className="feature-card__icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="feature-card__title">{mode.title}</h2>
              <p className="feature-card__text">{mode.text}</p>
            </Link>
          );
        })}
      </div>

      <section className="block">
        <div className="section__head section__head--row">
          <div>
            <h2 className="section__title section__title--sm">Quick practice quizzes</h2>
            <p className="section__subtitle">Short tests you can finish in minutes.</p>
          </div>
          <Link to="/explore?type=quiz" className="btn btn--outline btn--sm">
            See all quizzes
          </Link>
        </div>
        {quizzes.loading ? (
          <CardSkeletons count={3} />
        ) : quizzes.error ? (
          <ErrorState error={quizzes.error} onRetry={quizzes.reload} />
        ) : quizzes.data.length === 0 ? (
          <EmptyState title="No quizzes yet" message="Quick quizzes will appear here once they are published." />
        ) : (
          <div className="card-grid">
            {quizzes.data.map((exam) => (
              <ExamCard key={exam.id} exam={exam} />
            ))}
          </div>
        )}
      </section>

      <section className="block">
        <div className="section__head">
          <h2 className="section__title section__title--sm">Free practice resources</h2>
          <p className="section__subtitle">
            Trusted external websites for extra study material. They are third-party sites and are
            opened in a new tab.
          </p>
        </div>
        {resources.loading ? (
          <CardSkeletons count={3} height={120} />
        ) : resources.error ? (
          <ErrorState error={resources.error} onRetry={resources.reload} />
        ) : resources.data.length === 0 ? (
          <EmptyState icon={BookMarked} title="No resources yet" message="Study resources will be listed here." />
        ) : (
          <div className="card-grid">
            {resources.data.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card"
              >
                <div className="resource-card__top">
                  <h3 className="resource-card__title">{resource.title}</h3>
                  <ExternalLink size={16} aria-hidden="true" />
                </div>
                {resource.category && <span className="badge badge--gray">{resource.category.name}</span>}
                {resource.description && <p className="resource-card__text">{resource.description}</p>}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
