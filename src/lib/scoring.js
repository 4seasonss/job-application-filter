// Pure scoring engine: no React, no fetching, no side effects.
//
// Two distinct layers, deliberately kept apart:
//   1. Knockouts  — reasons a posting is genuinely unapplicable to you.
//   2. Match points — everything else, so ranking degrades gracefully instead
//      of emptying the board.
//
// Every point a posting earns or loses comes back as a labelled reason, because
// a ranked list you can't interrogate is a list you can't trust or tune.

import { ROLE_PROFILES, MAX_POINTS_PER_PROFILE, SECONDARY_LANE_FACTOR } from '../config/profiles.js';
import { matchesTerm } from './match.js';
import { isOutside } from './location.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(dateString, now) {
  const then = Date.parse(dateString);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/** First knockout that applies, or null when the posting survives. */
function knockout(job, config, age) {
  // Company rules come first: they are explicit intent, so when one fires it
  // should be the reason shown rather than some incidental filter behind it.
  // Matching is whole-word, so hiding "Meta" does not hide "Metadata Inc".
  const companyHit = (list) => list.some((name) => matchesTerm(job.company, name));
  if (config.companiesExclude?.length && companyHit(config.companiesExclude))
    return 'Company hidden by you';
  if (config.companiesInclude?.length && !companyHit(config.companiesInclude))
    return 'Not one of your companies';

  if (config.usCanadaOnly && isOutside(job.location)) return 'Outside the US and Canada';
  if (config.sponsorship === 'only_yes' && job.h1b !== 'yes')
    return 'Sponsorship not confirmed';
  if (config.sponsorship !== 'off' && job.h1b === 'no')
    return 'Does not sponsor H1b';
  if (config.excludeCitizenshipRequired && job.requiresCitizenship)
    return 'Requires US citizenship or clearance';
  if (config.excludeCitizenshipRequired && job.refusesSponsorship)
    return 'Posting rules out sponsorship';
  if (job.minYears > config.maxYearsExperience)
    return `Wants ${job.minYears}+ years of experience`;
  if (config.newGradOnly && !job.isNewGrad)
    return 'Not tagged as a new-grad role';
  if (age !== null && age > config.postedWithinDays)
    return `Posted ${age} days ago`;
  if (config.workModels.length && !config.workModels.includes(job.workModel))
    return `Work model is ${job.workModel || 'unlisted'}`;

  if (config.locations.length) {
    const location = job.location.toLowerCase();
    const remoteOk = config.workModels.includes('Remote') && job.workModel === 'Remote';
    if (!remoteOk && !config.locations.some((l) => location.includes(l.toLowerCase())))
      return 'Outside your locations';
  }

  const query = config.search.trim().toLowerCase();
  if (query && !job.searchText.includes(query) && !job.company.toLowerCase().includes(query))
    return 'No search match';

  return null;
}

/** Score one keyword lane, returning its points and the terms that hit. */
function scoreProfile(profile, settings, searchText) {
  let points = 0;
  const matched = [];
  for (const signal of profile.signals) {
    for (const term of signal.terms) {
      if (matchesTerm(searchText, term)) {
        points += signal.points;
        matched.push(term.trim());
      }
    }
  }
  return {
    id: profile.id,
    label: profile.label,
    points: Math.min(points, MAX_POINTS_PER_PROFILE) * settings.weight,
    matched,
  };
}

export function evaluate(job, config, now = Date.now()) {
  const age = daysSince(job.date, now);
  const excluded = knockout(job, config, age);
  if (excluded) return { job, excluded, score: 0, reasons: [], lanes: [] };

  const reasons = [];
  const add = (label, points, detail) => {
    if (points) reasons.push({ label, points: Math.round(points), detail });
  };

  const lanes = ROLE_PROFILES
    .filter((p) => config.profiles[p.id]?.enabled)
    .map((p) => scoreProfile(p, config.profiles[p.id], job.searchText))
    .filter((lane) => lane.points > 0)
    .sort((a, b) => b.points - a.points);

  // Best lane counts fully; the runner-up counts partially, so a posting that
  // spans two of your strengths outranks one that only hits a single lane.
  if (lanes[0]) add(lanes[0].label, lanes[0].points, lanes[0].matched.join(', '));
  if (lanes[1]) add(`also ${lanes[1].label}`, lanes[1].points * SECONDARY_LANE_FACTOR, lanes[1].matched.join(', '));

  const w = config.weights;
  if (job.isNewGrad) add('New grad role', w.newGradFlag);
  if (job.gradYears.includes(config.graduationYear)) add(`Targets ${config.graduationYear} grads`, w.gradYearMatch);
  if (job.h1b === 'yes') add('Sponsors H1b', w.sponsorshipYes);
  if (config.workModels.includes(job.workModel)) add(job.workModel, w.workModelMatch);
  if (config.locations.some((l) => job.location.toLowerCase().includes(l.toLowerCase())))
    add('Preferred location', w.locationMatch);
  if (job.salary) add('Salary listed', w.salaryListed);
  if (age !== null && config.postedWithinDays > 0)
    add(age === 0 ? 'Posted today' : `Posted ${age}d ago`, w.recency * Math.max(0, 1 - age / config.postedWithinDays));
  if (job.advancedDegree) add('Wants a graduate degree', -w.advancedDegreePenalty);
  if (job.minYears > 0)
    add(`Wants ${job.minYears}y experience`, -w.yearsOverPenalty * job.minYears);

  const score = reasons.reduce((sum, r) => sum + r.points, 0);
  return { job, excluded: null, score, reasons: reasons.sort((a, b) => b.points - a.points), lanes };
}

export function rank(jobs, config, now = Date.now()) {
  const results = [];
  const dropped = new Map();

  for (const job of jobs) {
    const result = evaluate(job, config, now);
    if (result.excluded) {
      dropped.set(result.excluded, (dropped.get(result.excluded) ?? 0) + 1);
      continue;
    }
    results.push(result);
  }

  // A "strong" match is one whose keyword lanes carried it, not one coasting on
  // recency and a salary line.
  const matches = config.hideWeakMatches ? results.filter((r) => r.lanes.length > 0) : results;

  matches.sort(
    config.sortBy === 'date'
      ? (a, b) => b.job.date.localeCompare(a.job.date) || b.score - a.score
      : (a, b) => b.score - a.score,
  );

  return {
    matches,
    total: jobs.length,
    dropped: [...dropped.entries()].sort((a, b) => b[1] - a[1]),
  };
}
