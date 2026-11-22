import { supabase } from '../supabase/client';

/**
 * Starts a new attempt, or resumes the running one for this exam.
 * Returns { id, exam_id, status, duration_minutes, started_at, server_now }.
 */
export async function startAttempt(examId) {
  const { data, error } = await supabase.rpc('start_attempt', { p_exam_id: examId });
  if (error) throw error;
  return data;
}

/**
 * Sends the student's answers ({ [questionId]: optionId }) to the database,
 * which grades them server-side and returns the stored result row.
 */
export async function submitAttempt(attemptId, answers) {
  const { data, error } = await supabase.rpc('submit_attempt', {
    p_attempt_id: attemptId,
    p_answers: answers || {},
  });
  if (error) throw error;
  return data;
}

/** Full review (questions, selected + correct answers, explanations) of a submitted attempt. */
export async function fetchAttemptReview(attemptId) {
  const { data, error } = await supabase.rpc('get_attempt_review', {
    p_attempt_id: attemptId,
  });
  if (error) throw error;
  return data;
}

/** All results of one student, newest first. */
export async function fetchMyResults(userId) {
  const { data, error } = await supabase
    .from('results')
    .select(
      `id, attempt_id, exam_id, total_questions, correct_answers, incorrect_answers, unanswered,
       obtained_marks, total_marks, percentage, passed, time_taken_seconds, created_at,
       exam:exams(id, title, exam_type, category:categories(name, slug), subject:subjects(name, slug))`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Attempts that were started but not submitted and whose time has not run out. */
export async function fetchMyInProgressAttempts(userId) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, started_at, duration_minutes, exam:exams(id, title, question_count)')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(
    (a) => new Date(a.started_at).getTime() + a.duration_minutes * 60000 > Date.now()
  );
}
