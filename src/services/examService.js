import { supabase } from '../supabase/client';

const EXAM_SELECT =
  '*, category:categories(id, name, slug), subject:subjects(id, name, slug)';

/** Removes characters that have special meaning in PostgREST filters. */
function sanitizeSearch(term) {
  return String(term || '').replace(/[%,()*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*, subjects(*)')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((category) => ({
    ...category,
    subjects: (category.subjects || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));
}

export async function fetchExams({ search = '', categoryId, subjectId, examType, limit } = {}) {
  let query = supabase.from('exams').select(EXAM_SELECT).eq('is_published', true);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (subjectId) query = query.eq('subject_id', subjectId);
  if (examType) query = query.eq('exam_type', examType);
  const term = sanitizeSearch(search);
  if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  query = query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** Featured exams, or the newest exams when none are marked as featured. */
export async function fetchFeaturedExams(limit = 6) {
  const { data, error } = await supabase
    .from('exams')
    .select(EXAM_SELECT)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (data && data.length > 0) return data;
  return fetchExams({ limit });
}

export async function fetchExam(examId) {
  const { data, error } = await supabase
    .from('exams')
    .select(EXAM_SELECT)
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Questions + options for an exam. These never include the correct answers. */
export async function fetchExamQuestions(examId) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, sort_order, question_text, options(id, sort_order, option_text)')
    .eq('exam_id', examId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map((q) => ({
    ...q,
    options: (q.options || []).slice().sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function fetchResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, url, category:categories(name, slug)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchPlatformStats() {
  const { data, error } = await supabase.rpc('get_platform_stats');
  if (error) throw error;
  return data || { exams: 0, questions: 0, students: 0, attempts: 0 };
}

export async function fetchLeaderboard(days = null, limit = 50) {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_days: days,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function sendContactMessage({ name, email, subject, message }) {
  const { error } = await supabase.from('contact_messages').insert({
    name: name.trim(),
    email: email.trim(),
    subject: subject ? subject.trim() : null,
    message: message.trim(),
  });
  if (error) throw error;
}
