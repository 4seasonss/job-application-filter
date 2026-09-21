import { ROLE_PROFILES } from './profiles.js';

// Scoring weights for everything that isn't a role keyword. All editable.
export const DEFAULT_WEIGHTS = {
  newGradFlag: 12,      // posting is explicitly tagged as a new-grad role
  gradYearMatch: 10,    // posting names your graduation year
  sponsorshipYes: 18,   // H1b sponsorship confirmed rather than unknown
  workModelMatch: 6,
  locationMatch: 8,
  recency: 10,          // full value on a posting from today, 0 at the cutoff
  salaryListed: 3,
  yearsOverPenalty: 10, // per year of experience demanded beyond your maximum
  advancedDegreePenalty: 8,
};

// Seeded for the first user: a May 2027 CS grad on an F-1 visa who needs H1b
// sponsorship. Everything here is editable in the UI and saved per browser.
export const DEFAULT_CONFIG = {
  graduationYear: 2027,
  maxYearsExperience: 1,
  postedWithinDays: 30,

  // 'exclude_no' keeps confirmed sponsors and unknowns, drops explicit no's.
  // 'only_yes' is far stricter than it sounds — see README.
  sponsorship: 'exclude_no',
  // Catches "must be a US citizen" / clearance requirements that the
  // sponsorship column misses entirely.
  excludeCitizenshipRequired: true,

  newGradOnly: false,   // the tag is missing on ~70% of rows, so boost, don't gate
  workModels: [],       // empty means no restriction
  locations: [],        // substring match against the posting's location
  companiesExclude: [], // never show these companies
  companiesInclude: [], // when non-empty, show ONLY these companies
  search: '',

  profiles: Object.fromEntries(
    ROLE_PROFILES.map((p) => [p.id, { enabled: true, weight: p.weight }]),
  ),
  weights: { ...DEFAULT_WEIGHTS },
  sortBy: 'score',
  hideWeakMatches: false,
};

// Starting points for people who aren't the first user.
export const PRESETS = {
  'F-1 / needs sponsorship': {},
  'US authorized': { sponsorship: 'off', excludeCitizenshipRequired: false },
  'Show everything': {
    sponsorship: 'off',
    excludeCitizenshipRequired: false,
    maxYearsExperience: 20,
    postedWithinDays: 365,
  },
};

/**
 * Merge a saved profile over the current defaults.
 *
 * `profiles` and `weights` have to merge one level deeper than the rest: a
 * profile saved before a lane or weight existed would otherwise come back
 * missing that key, and the UI reads those without guarding.
 */
export function mergeConfig(saved) {
  if (!saved) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    profiles: { ...DEFAULT_CONFIG.profiles, ...(saved.profiles ?? {}) },
    weights: { ...DEFAULT_WEIGHTS, ...(saved.weights ?? {}) },
  };
}
