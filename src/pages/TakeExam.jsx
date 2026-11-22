import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { startAttempt } from '../services/attemptService.js';
import { fetchExam, fetchExamQuestions } from '../services/examService.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageLoader } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ExamRunner from '../components/exam/ExamRunner.jsx';

/**
 * Starts (or resumes) an attempt on the server, loads the questions (which never
 * contain correct answers) and hands over to the exam runner.
 */
export default function TakeExam() {
  const { examId } = useParams();

  const load = useAsync(async () => {
    const attempt = await startAttempt(examId);
    const [exam, questions] = await Promise.all([fetchExam(examId), fetchExamQuestions(examId)]);
    if (!exam || questions.length === 0) throw new Error('This exam has no questions yet.');
    // The deadline uses the SERVER clock so a wrong clock on the student's device cannot change the time limit.
    const skew = Date.now() - new Date(attempt.server_now).getTime();
    const deadlineMs = new Date(attempt.started_at).getTime() + attempt.duration_minutes * 60000 + skew;
    return { attempt, exam, questions, deadlineMs };
  }, [examId]);

  const data = useMemo(() => load.data, [load.data]);

  if (load.loading) return <PageLoader label="Preparing your exam…" />;
  if (load.error || !data) {
    return (
      <div className="container section">
        <Link to={`/exams/${examId}`} className="back-link">
          <ArrowLeft size={16} aria-hidden="true" /> Back to exam
        </Link>
        <ErrorState title="Could not start the exam" error={load.error} onRetry={load.reload} />
      </div>
    );
  }

  return <ExamRunner key={data.attempt.id} {...data} />;
}
