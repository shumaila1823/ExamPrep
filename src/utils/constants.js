export const APP_NAME = 'ExamPrep Global';
export const TAGLINE = 'One Platform. Every Exam. Endless Possibilities.';

export const EXAM_TYPES = {
  full_mock: { label: 'Full-length mock test', short: 'Full Mock' },
  subject: { label: 'Subject-wise test', short: 'Subject Test' },
  topic: { label: 'Topic-wise test', short: 'Topic Test' },
  quiz: { label: 'Short practice quiz', short: 'Quick Quiz' },
};

export const EXAM_TYPE_OPTIONS = Object.entries(EXAM_TYPES).map(([value, v]) => ({
  value,
  label: v.label,
}));

export const COUNTRIES = [
  'Afghanistan', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bahrain', 'Bangladesh', 'Belgium',
  'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana',
  'Greece', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Italy', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kuwait', 'Lebanon', 'Malaysia', 'Mexico', 'Morocco', 'Nepal', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Russia',
  'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden',
  'Switzerland', 'Tanzania', 'Thailand', 'Turkey', 'Uganda', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uzbekistan', 'Vietnam', 'Other',
];

/** Popular quick links shown under the hero search bar (subject slugs from seed.sql). */
export const POPULAR_SEARCHES = [
  { label: 'MDCAT', to: '/explore?subject=mdcat' },
  { label: 'CSS', to: '/explore?subject=css' },
  { label: 'IELTS', to: '/explore?subject=ielts' },
  { label: 'SAT', to: '/explore?subject=sat' },
  { label: 'Mathematics', to: '/explore?subject=mathematics' },
  { label: 'Banking', to: '/explore?subject=banking-tests' },
];
