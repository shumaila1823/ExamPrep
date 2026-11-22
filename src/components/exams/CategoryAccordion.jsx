import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCategoryIcon } from '../../utils/categoryIcons.js';

/**
 * Expandable + searchable category tree.
 * - Clicking a category name filters by that category.
 * - Clicking the chevron expands / collapses its subjects.
 * - While `search` is non-empty, categories/subjects that do not match are hidden
 *   and matching groups open automatically.
 */
export default function CategoryAccordion({
  categories,
  activeCategorySlug,
  activeSubjectSlug,
  search = '',
  onSelectCategory,
  onSelectSubject,
}) {
  const [expanded, setExpanded] = useState(() => new Set(activeCategorySlug ? [activeCategorySlug] : []));
  const term = search.trim().toLowerCase();

  const visible = useMemo(() => {
    return categories
      .map((category) => {
        const categoryMatches = !term || category.name.toLowerCase().includes(term);
        const subjects =
          term && !categoryMatches
            ? category.subjects.filter((s) => s.name.toLowerCase().includes(term))
            : category.subjects;
        return { ...category, subjects, show: categoryMatches || subjects.length > 0 };
      })
      .filter((category) => category.show);
  }, [categories, term]);

  const toggle = (slug) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (visible.length === 0) {
    return <p className="accordion__empty">No categories or subjects match “{search}”.</p>;
  }

  return (
    <div className="accordion">
      {visible.map((category) => {
        const Icon = getCategoryIcon(category.slug);
        const open = term ? true : expanded.has(category.slug);
        const isActive = activeCategorySlug === category.slug && !activeSubjectSlug;
        return (
          <div key={category.id} className={`accordion__item ${open ? 'is-open' : ''}`}>
            <div className="accordion__header">
              <button
                type="button"
                className={`accordion__name ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  onSelectCategory(category.slug);
                  setExpanded((current) => new Set(current).add(category.slug));
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{category.name}</span>
              </button>
              <button
                type="button"
                className="accordion__chevron"
                onClick={() => toggle(category.slug)}
                aria-expanded={open}
                aria-label={`${open ? 'Collapse' : 'Expand'} ${category.name}`}
              >
                <ChevronDown size={18} aria-hidden="true" />
              </button>
            </div>
            {open && (
              <ul className="accordion__panel">
                {category.subjects.map((subject) => (
                  <li key={subject.id}>
                    <button
                      type="button"
                      className={`accordion__subject ${activeSubjectSlug === subject.slug ? 'is-active' : ''}`}
                      onClick={() => onSelectSubject(category.slug, subject.slug)}
                    >
                      {subject.name}
                    </button>
                  </li>
                ))}
                {category.subjects.length === 0 && (
                  <li className="accordion__none">No subjects yet</li>
                )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
