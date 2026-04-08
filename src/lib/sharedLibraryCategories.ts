export const SHARED_LIBRARY_CATEGORIES = [
  { slug: "document-processing", label: "Document Processing" },
  { slug: "development-code-tools", label: "Development & Code Tools" },
  { slug: "data-analysis", label: "Data & Analysis" },
  { slug: "business-marketing", label: "Business & Marketing" },
  { slug: "communication-writing", label: "Communication & Writing" },
  { slug: "creative-media", label: "Creative & Media" },
  { slug: "productivity-organization", label: "Productivity & Organization" },
  { slug: "collaboration-project-management", label: "Collaboration & Project Management" },
  { slug: "security-systems", label: "Security & Systems" },
  { slug: "uncategorized", label: "Uncategorized" },
] as const;

export type SharedLibraryCategorySlug = (typeof SHARED_LIBRARY_CATEGORIES)[number]["slug"];

export const DEFAULT_SHARED_CATEGORY_SLUG: SharedLibraryCategorySlug = "uncategorized";

export function isSharedLibraryCategorySlug(value: string): value is SharedLibraryCategorySlug {
  return SHARED_LIBRARY_CATEGORIES.some((category) => category.slug === value);
}

export function getSharedLibraryCategoryLabel(value: string | null): string | null {
  if (!value) return null;
  return SHARED_LIBRARY_CATEGORIES.find((category) => category.slug === value)?.label ?? null;
}
