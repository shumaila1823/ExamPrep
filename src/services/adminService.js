import { supabase } from '../supabase/client';

/*
 * All functions here only succeed for users whose profile role is 'admin' -
 * the database (Row Level Security + SECURITY DEFINER functions) enforces
 * this, so calling them from a student account simply returns an error.
 */

async function saveRow(table, payload, select = '*') {
  const { id, ...fields } = payload;
  const query = id
    ? supabase.from(table).update(fields).eq('id', id)
    : supabase.from(table).insert(fields);
  const { data, error } = await query.select(select).single();
  if (error) throw error;
  return data;
}

async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

/* ---------- Overview ---------- */
export async function adminFetchOverview() {
  const [exams, questions, students, attempts, messages] = await Promise.all([
    countRows('exams'),
    countRows('questions'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .then(({ count, error }) => {
        if (error) throw error;
        return count || 0;
      }),
    countRows('results'),
    countRows('contact_messages'),
  ]);
  return { exams, questions, students, attempts, messages };
}

/* ---------- Exams ---------- */
export async function adminListExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*, category:categories(id, name), subject:subjects(id, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminFetchExam(examId) {
  const { data, error } = await supabase
    .from('exams')
    .select('*, category:categories(id, name), subject:subjects(id, name)')
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function adminSaveExam(payload) {
  return saveRow('exams', payload);
}

export function adminDeleteExam(examId) {
  return deleteRow('exams', examId);
}

export async function adminSetPublished(examId, isPublished) {
  const { error } = await supabase
    .from('exams')
    .update({ is_published: isPublished })
    .eq('id', examId);
  if (error) throw error;
}

/* ---------- Questions ---------- */
export async function adminListQuestions(examId) {
  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, sort_order, question_text, options(id, sort_order, option_text), question_answers(correct_option_id, explanation)'
    )
    .eq('exam_id', examId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((q) => {
    const answer = Array.isArray(q.question_answers) ? q.question_answers[0] : q.question_answers;
    const options = (q.options || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: q.id,
      sort_order: q.sort_order,
      question_text: q.question_text,
      options,
      correct_option_id: answer?.correct_option_id || null,
      explanation: answer?.explanation || '',
    };
  });
}

/** Creates or updates a question (with its four options and answer) in one transaction. */
export async function adminSaveQuestion({ id, examId, questionText, options, correctIndex, explanation }) {
  const { data, error } = await supabase.rpc('admin_upsert_question', {
    p_question: {
      id: id || null,
      exam_id: examId,
      question_text: questionText,
      options,
      correct_index: correctIndex,
      explanation: explanation || null,
    },
  });
  if (error) throw error;
  return data;
}

export function adminDeleteQuestion(questionId) {
  return deleteRow('questions', questionId);
}

/* ---------- Categories & subjects ---------- */
export function adminSaveCategory(payload) {
  return saveRow('categories', payload);
}
export function adminDeleteCategory(id) {
  return deleteRow('categories', id);
}
export function adminSaveSubject(payload) {
  return saveRow('subjects', payload);
}
export function adminDeleteSubject(id) {
  return deleteRow('subjects', id);
}

/* ---------- Resources ---------- */
export async function adminListResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*, category:categories(id, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export function adminSaveResource(payload) {
  return saveRow('resources', payload);
}
export function adminDeleteResource(id) {
  return deleteRow('resources', id);
}

/* ---------- Contact messages ---------- */
export async function adminListMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export function adminDeleteMessage(id) {
  return deleteRow('contact_messages', id);
}
