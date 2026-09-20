// Registry of upstream job sources.
//
// newgrad-jobs.com is a Webflow shell; the listings themselves live in public
// Airtable shared views, one base per category. Each entry below is the base +
// share id scraped from the category links on the homepage.
//
// The MVP only pulls `swe`, but the rest are here so adding a category is a
// one-line change in DEFAULT_CATEGORIES rather than a research task.

export const AIRTABLE_CATEGORIES = {
  swe: { label: 'Software Engineering', baseId: 'appjDG7vmPOm1pO7S', shareId: 'shr763VHjlzPBDCgN' },
  aiml: { label: 'Machine Learning and AI', baseId: 'appoxNzAIRReFCzZV', shareId: 'shrmDBF1vNPtzNjzl' },
  de: { label: 'Data Engineer', baseId: 'appqYfRGKpLQ8UsdH', shareId: 'shrFnvW20reJCEkYZ' },
  eng: { label: 'Engineering and Development', baseId: 'appTmAS0zZwcwxhoo', shareId: 'shrZzO1d5s5qGPRgr' },
  cs: { label: 'Cybersecurity', baseId: 'app5K4hbJeNczKe80', shareId: 'shrmicWx3O72527KW' },
  da: { label: 'Data Analyst', baseId: 'appZ5SmkwkcW7Xd8C', shareId: 'shr51y9s2uIRlkvI8' },
  pm: { label: 'Product Management', baseId: 'appYvVTjJYHpq712D', shareId: 'shrpI5GFPocw2qcre' },
  ba: { label: 'Business Analyst', baseId: 'appK8wuhdzqC2KtWr', shareId: 'shrlXw5IPUECgZH9Q' },
  pjm: { label: 'Project Management', baseId: 'appKHKHFeCVewSlMF', shareId: 'shrPAr81oEpL5lxdU' },
};

export const DEFAULT_CATEGORIES = ['swe'];
