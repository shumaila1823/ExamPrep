import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SearchX, SlidersHorizontal } from 'lucide-react';
import { fetchCategories, fetchExams } from '../services/examService.js';
import { useAsync } from '../hooks/useAsync.js';
import { useDebounce } from '../hooks/useDebounce.js';
import CategoryAccordion from '../components/exams/CategoryAccordion.jsx';
import ExamCard from '../components/exams/ExamCard.jsx';
import { CardSkeletons } from '../components/common/Loaders.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { EXAM_TYPE_OPTIONS } from '../utils/constants.js';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [treeSearch, setTreeSearch] = useState('');

  const categorySlug = params.get('category') || '';
  const subjectSlug = params.get('subject') || '';
  const examType = params.get('type') || '';
  const [queryInput, setQueryInput] = useState(params.get('q') || '');
  const q = useDebounce(queryInput, 350);

  const categories = useAsync(fetchCategories, []);

  // Resolve slugs in the URL to ids.
  const { categoryId, subjectId, activeCategory, activeSubject } = useMemo(() => {
    const list = categories.data || [];
    let cat = list.find((c) => c.slug === categorySlug) || null;
    let sub = null;
    if (subjectSlug) {
      for (const c of list) {
        const found = c.subjects.find((s) => s.slug === subjectSlug);
        if (found) {
          sub = found;
          if (!cat) cat = c;
          break;
        }
      }
    }
    return {
      categoryId: cat?.id || null,
      subjectId: sub?.id || null,
      activeCategory: cat,
      activeSubject: sub,
    };
  }, [categories.data, categorySlug, subjectSlug]);

  const waitingForCategories = Boolean((categorySlug || subjectSlug) && categories.loading);

  const exams = useAsync(
    () =>
      waitingForCategories
        ? Promise.resolve([])
        : fetchExams({
            search: q,
            categoryId: subjectId ? null : categoryId,
            subjectId,
            examType: examType || undefined,
          }),
    [q, categoryId, subjectId, examType, waitingForCategories]
  );

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setParams(next, { replace: true });
  };

  const hasFilters = Boolean(categorySlug || subjectSlug || examType || queryInput);
  const clearAll = () => {
    setQueryInput('');
    setTreeSearch('');
    setParams({}, { replace: true });
  };

  return (
    <div className="container section">
      <div className="page-head">
        <h1 className="page-head__title">Explore Exams</h1>
        <p className="page-head__text">
          Search and filter by category, subject and test type. Exams are free - log in to attempt them.
        </p>
      </div>

      <div className="explore">
        <aside className={`explore__filters ${filtersOpen ? 'is-open' : ''}`}>
          <div className="filter-card">
            <h2 className="filter-card__title">Categories</h2>
            <div className="field__control">
              <Search size={16} className="field__icon" aria-hidden="true" />
              <input
                type="search"
                className="input input--icon input--sm"
                placeholder="Find a category or subject"
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                aria-label="Search categories and subjects"
              />
            </div>
            {categories.loading ? (
              <p className="muted">Loading categories…</p>
            ) : categories.error ? (
              <ErrorState error={categories.error} onRetry={categories.reload} />
            ) : (
              <CategoryAccordion
                categories={categories.data}
                activeCategorySlug={categorySlug}
                activeSubjectSlug={subjectSlug}
                search={treeSearch}
                onSelectCategory={(slug) => updateParams({ category: slug, subject: '' })}
                onSelectSubject={(catSlug, subSlug) => updateParams({ category: catSlug, subject: subSlug })}
              />
            )}
          </div>

          <div className="filter-card">
            <h2 className="filter-card__title">Test type</h2>
            <div className="radio-list">
              <label className="radio">
                <input type="radio" name="type" checked={!examType} onChange={() => updateParams({ type: '' })} />
                <span>All types</span>
              </label>
              {EXAM_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="radio">
                  <input
                    type="radio"
                    name="type"
                    checked={examType === option.value}
                    onChange={() => updateParams({ type: option.value })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <section className="explore__results" aria-live="polite">
          <div className="explore__toolbar">
            <div className="field__control explore__search">
              <Search size={18} className="field__icon" aria-hidden="true" />
              <input
                type="search"
                className="input input--icon"
                placeholder="Search exams by title or description…"
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value);
                  updateParams({ q: e.target.value.trim() });
                }}
                aria-label="Search examinations"
                maxLength={80}
              />
            </div>
            <button
              type="button"
              className="btn btn--outline explore__filter-toggle"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Filters
            </button>
          </div>

          {hasFilters && (
            <div className="active-filters">
              {activeCategory && !activeSubject && (
                <button type="button" className="chip chip--active" onClick={() => updateParams({ category: '', subject: '' })}>
                  {activeCategory.name} <X size={13} aria-hidden="true" />
                </button>
              )}
              {activeSubject && (
                <button type="button" className="chip chip--active" onClick={() => updateParams({ subject: '' })}>
                  {activeSubject.name} <X size={13} aria-hidden="true" />
                </button>
              )}
              {examType && (
                <button type="button" className="chip chip--active" onClick={() => updateParams({ type: '' })}>
                  {EXAM_TYPE_OPTIONS.find((o) => o.value === examType)?.label || examType} <X size={13} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="link-btn" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {exams.loading ? (
            <CardSkeletons count={4} />
          ) : exams.error ? (
            <ErrorState error={exams.error} onRetry={exams.reload} />
          ) : exams.data.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No exams found"
              message="Try a different search term or remove some filters."
              action={
                hasFilters ? (
                  <button type="button" className="btn btn--primary" onClick={clearAll}>
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : (
            <>
              <p className="results-count">
                Showing {exams.data.length} exam{exams.data.length === 1 ? '' : 's'}
              </p>
              <div className="card-grid card-grid--two">
                {exams.data.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
