import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  UserPlus,
  Compass,
  PenLine,
  BarChart3,
  ShieldCheck,
  Timer,
  Gift,
  Globe2,
  LineChart,
  Smartphone,
  Quote,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';
import { fetchCategories, fetchFeaturedExams, fetchPlatformStats } from '../services/examService.js';
import { useAsync } from '../hooks/useAsync.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useAuth } from '../context/AuthContext.jsx';
import ExamCard from '../components/exams/ExamCard.jsx';
import { CardSkeletons } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { getCategoryIcon } from '../utils/categoryIcons.js';
import { POPULAR_SEARCHES } from '../utils/constants.js';
import { formatNumber } from '../utils/format.js';

const STEPS = [
  { icon: UserPlus, title: 'Create a free account', text: 'Register in under a minute with your email. No fees, ever.' },
  { icon: Compass, title: 'Choose your exam', text: 'Browse exam categories or search for the test you are preparing for.' },
  { icon: PenLine, title: 'Take a timed test', text: 'Answer MCQs in a realistic exam interface with a countdown timer.' },
  { icon: BarChart3, title: 'Review and improve', text: 'Get instant results, explanations and progress charts to guide your revision.' },
];

const FEATURES = [
  { icon: Gift, title: '100% free', text: 'Every exam and feature is free for registered students.' },
  { icon: Timer, title: 'Realistic exam mode', text: 'Timer, question navigator, review marks and auto-submit.' },
  { icon: ShieldCheck, title: 'Fair and secure', text: 'Answers are graded on the server, so results cannot be tampered with.' },
  { icon: LineChart, title: 'Track your progress', text: 'Score history and subject-wise charts show where to focus.' },
  { icon: Globe2, title: 'Made for global learners', text: 'Academic, competitive, admission, job and international tests.' },
  { icon: Smartphone, title: 'Works on every device', text: 'Practice on your phone, tablet or computer.' },
];

// Clearly marked sample content - replace with real student feedback once available.
const TESTIMONIALS = [
  { name: 'Sample Student A', role: 'MDCAT aspirant', text: 'The timed mock tests helped me get comfortable with exam pressure. The explanations after each test are really useful.' },
  { name: 'Sample Student B', role: 'CSS candidate', text: 'I like that I can see which subjects are weak from the charts. It makes revision much more focused.' },
  { name: 'Sample Student C', role: 'IELTS learner', text: 'Short quizzes fit into my day, and the question navigator makes long tests easy to manage.' },
];

function Stat({ value, label, suffix = '' }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <p className="stat__value">
        {formatNumber(shown)}
        {suffix}
      </p>
      <p className="stat__label">{label}</p>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');

  const categories = useAsync(fetchCategories, []);
  const featured = useAsync(() => fetchFeaturedExams(6), []);
  const stats = useAsync(fetchPlatformStats, []);

  const onSearch = (event) => {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/explore?q=${encodeURIComponent(term)}` : '/explore');
  };

  const s = stats.data || { exams: 0, questions: 0, students: 0, attempts: 0 };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="container hero__inner">
          <span className="pill">
            <Sparkles size={14} aria-hidden="true" /> One Platform. Every Exam. Endless Possibilities.
          </span>
          <h1 className="hero__title">
            Your Success <span className="hero__accent">Starts Here!</span>
          </h1>
          <p className="hero__subtitle">
            ExamPrep Global is a free exam preparation platform for students around the world.
            Practice academic, competitive, admission, job recruitment and international exams
            with timed MCQ tests, instant results and detailed explanations.
          </p>

          <form className="hero__search" onSubmit={onSearch} role="search">
            <Search size={20} className="hero__search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exams, e.g. MDCAT, IELTS, Algebra…"
              aria-label="Search examinations"
              maxLength={80}
            />
            <button type="submit" className="btn btn--primary">
              Search
            </button>
          </form>

          <div className="hero__popular">
            <span>Popular:</span>
            {POPULAR_SEARCHES.map((item) => (
              <Link key={item.label} to={item.to} className="chip">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hero__cta">
            <Link to="/explore" className="btn btn--accent btn--lg">
              Explore Exams <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn--glass btn--lg">
                Create free account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">Examination categories</h2>
            <p className="section__subtitle">
              From school subjects to international tests - find the category that matches your goal.
            </p>
          </div>

          {categories.loading ? (
            <CardSkeletons count={5} height={190} />
          ) : categories.error ? (
            <ErrorState error={categories.error} onRetry={categories.reload} />
          ) : categories.data.length === 0 ? (
            <EmptyState title="No categories yet" message="Categories will appear here once they are added." />
          ) : (
            <div className="card-grid card-grid--categories">
              {categories.data.map((category) => {
                const Icon = getCategoryIcon(category.slug);
                return (
                  <Link key={category.id} to={`/explore?category=${category.slug}`} className="category-card">
                    <span className="category-card__icon">
                      <Icon size={26} aria-hidden="true" />
                    </span>
                    <h3 className="category-card__title">{category.name}</h3>
                    <p className="category-card__text">{category.description}</p>
                    <p className="category-card__tags">
                      {category.subjects.slice(0, 4).map((subject) => (
                        <span key={subject.id} className="tag">
                          {subject.name}
                        </span>
                      ))}
                      {category.subjects.length > 4 && (
                        <span className="tag tag--more">+{category.subjects.length - 4} more</span>
                      )}
                    </p>
                    <span className="category-card__link">
                      Browse <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED EXAMS */}
      <section className="section section--tint">
        <div className="container">
          <div className="section__head section__head--row">
            <div>
              <h2 className="section__title">Featured examinations</h2>
              <p className="section__subtitle">Popular tests to start practising today.</p>
            </div>
            <Link to="/explore" className="btn btn--outline">
              View all exams <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {featured.loading ? (
            <CardSkeletons count={3} />
          ) : featured.error ? (
            <ErrorState error={featured.error} onRetry={featured.reload} />
          ) : featured.data.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="No exams published yet"
              message="Published exams will be shown here. Administrators can add exams from the admin panel."
            />
          ) : (
            <div className="card-grid">
              {featured.data.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">How it works</h2>
            <p className="section__subtitle">Four simple steps from sign-up to success.</p>
          </div>
          <ol className="steps">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="step">
                  <span className="step__number">{index + 1}</span>
                  <span className="step__icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__text">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* STATISTICS */}
      <section className="stats-band">
        <div className="container stats-band__inner">
          <Stat value={s.exams} label="Published exams" />
          <Stat value={s.questions} label="Practice questions" />
          <Stat value={s.students} label="Registered students" />
          <Stat value={s.attempts} label="Tests completed" />
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">Why choose ExamPrep Global?</h2>
            <p className="section__subtitle">Everything you need to prepare with confidence.</p>
          </div>
          <div className="card-grid card-grid--features">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="feature-card">
                  <span className="feature-card__icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="feature-card__title">{feature.title}</h3>
                  <p className="feature-card__text">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section section--tint">
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">What students say</h2>
            <p className="section__subtitle">
              <strong>Sample content:</strong> these testimonials are placeholders shown for design
              purposes and are not from real students.
            </p>
          </div>
          <div className="card-grid">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="testimonial">
                <Quote size={26} className="testimonial__quote" aria-hidden="true" />
                <blockquote className="testimonial__text">{t.text}</blockquote>
                <figcaption className="testimonial__author">
                  <span className="avatar avatar--sm">{t.name.slice(-1)}</span>
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </span>
                  <span className="badge badge--gray">Sample</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="section">
        <div className="container">
          <div className="cta">
            <h2 className="cta__title">Ready to start preparing?</h2>
            <p className="cta__text">
              Join ExamPrep Global today. It is completely free - just register and begin your first test.
            </p>
            <div className="cta__buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn--accent btn--lg">
                  Go to my dashboard <ArrowRight size={18} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn--accent btn--lg">
                    Sign up free <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <Link to="/login" className="btn btn--glass btn--lg">
                    I already have an account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
