import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ListChecks, Target, Star } from 'lucide-react';
import { EXAM_TYPES } from '../../utils/constants.js';
import { getCategoryIcon } from '../../utils/categoryIcons.js';

export default function ExamCard({ exam }) {
  const Icon = getCategoryIcon(exam.category?.slug);
  return (
    <article className="exam-card">
      <div className="exam-card__top">
        <span className="exam-card__icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="exam-card__badges">
          {exam.is_featured && (
            <span className="badge badge--gold">
              <Star size={12} aria-hidden="true" /> Featured
            </span>
          )}
          <span className="badge badge--blue">{EXAM_TYPES[exam.exam_type]?.short || 'Exam'}</span>
        </div>
      </div>

      <h3 className="exam-card__title">
        <Link to={`/exams/${exam.id}`}>{exam.title}</Link>
      </h3>
      <p className="exam-card__meta">
        {exam.category?.name}
        {exam.subject ? ` · ${exam.subject.name}` : ''}
      </p>
      {exam.description && <p className="exam-card__desc">{exam.description}</p>}

      <ul className="exam-card__stats">
        <li>
          <ListChecks size={15} aria-hidden="true" /> {exam.question_count} questions
        </li>
        <li>
          <Clock size={15} aria-hidden="true" /> {exam.duration_minutes} min
        </li>
        <li>
          <Target size={15} aria-hidden="true" /> {exam.total_marks} marks
        </li>
      </ul>

      <Link to={`/exams/${exam.id}`} className="btn btn--primary btn--sm btn--block">
        View exam <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
