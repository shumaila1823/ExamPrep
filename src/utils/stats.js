/** Aggregate numbers for the student dashboard. `results` is newest-first. */
export function computeStats(results) {
  const list = results || [];
  const total = list.length;
  if (total === 0) return { total: 0, average: 0, highest: 0, totalSeconds: 0 };
  const percentages = list.map((r) => Number(r.percentage) || 0);
  return {
    total,
    average: percentages.reduce((a, b) => a + b, 0) / total,
    highest: Math.max(...percentages),
    totalSeconds: list.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0),
  };
}

/** Last `limit` results in chronological order for the trend line chart. */
export function buildTrend(results, limit = 10) {
  return [...(results || [])]
    .slice(0, limit)
    .reverse()
    .map((r, i) => ({
      name: `#${i + 1}`,
      score: Number(r.percentage) || 0,
      exam: r.exam?.title || 'Exam',
      date: r.created_at,
    }));
}

/** Average percentage per subject (falls back to the category name). */
export function buildSubjectPerformance(results) {
  const groups = new Map();
  (results || []).forEach((r) => {
    const label = r.exam?.subject?.name || r.exam?.category?.name || 'General';
    const g = groups.get(label) || { name: label, sum: 0, attempts: 0 };
    g.sum += Number(r.percentage) || 0;
    g.attempts += 1;
    groups.set(label, g);
  });
  return [...groups.values()]
    .map((g) => ({
      name: g.name,
      average: Math.round((g.sum / g.attempts) * 10) / 10,
      attempts: g.attempts,
    }))
    .sort((a, b) => b.attempts - a.attempts || b.average - a.average);
}
