import { BookOpen, Trophy, Briefcase, GraduationCap, Globe, Layers } from 'lucide-react';

const ICONS = {
  academic: BookOpen,
  competitive: Trophy,
  'job-recruitment': Briefcase,
  admission: GraduationCap,
  international: Globe,
};

/** Returns a lucide icon component for a category slug (falls back to Layers). */
export function getCategoryIcon(slug) {
  return ICONS[slug] || Layers;
}
