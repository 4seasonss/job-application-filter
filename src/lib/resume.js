// Resume ingestion — entirely client side.
//
// The file never leaves the browser. We extract its text, derive which role
// lanes it supports, and keep only that derivation. A resume carries a name, a
// phone number and an address; uploading it would create a real breach surface
// in exchange for keywords we can pull out locally in under a second.

import { ROLE_PROFILES } from '../config/profiles.js';
import { findTerm } from './match.js';

/** Pull raw text out of a PDF using pdf.js, loaded on demand. */
async function readPdf(file) {
  const [pdfjs, workerUrl] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = await Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) => {
      const page = await doc.getPage(i + 1);
      const content = await page.getTextContent();
      return content.items.map((item) => item.str).join(' ');
    }),
  );
  return pages.join('\n');
}

export async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return readPdf(file);
  if (name.endsWith('.txt') || name.endsWith('.md')) return file.text();
  throw new Error('Upload a PDF or a .txt file, or paste the text instead.');
}

/**
 * "Expected May 2027", "Class of 2027", "Graduating Dec 2026" — and failing
 * that, the latest plausible year mentioned, which on a student resume is
 * almost always the expected graduation.
 */
export function detectGraduationYear(text, fallback) {
  const explicit = text.match(
    /(?:expected|graduat\w*|class of|anticipated)[^.\n]{0,40}?\b(20(?:2[4-9]|3[0-5]))\b/i,
  );
  if (explicit) return Number(explicit[1]);

  const years = [...text.matchAll(/\b(20(?:2[4-9]|3[0-5]))\b/g)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : fallback;
}

/**
 * Score the resume against the same keyword lanes we score postings with, then
 * normalize into lane weights. Using one vocabulary for both sides is what
 * makes the result legible: the terms that set your weights are the same terms
 * that light up on a job card.
 */
export function deriveProfile(text) {
  const haystack = text.toLowerCase();

  const lanes = ROLE_PROFILES.map((profile) => {
    const matched = [];
    for (const signal of profile.signals) {
      for (const term of signal.terms) {
        // Record the word as it appears in the resume, so a stem like
        // 'containeriz*' reads back as "containerized" in the UI.
        const hit = findTerm(haystack, term);
        if (hit) matched.push(hit.trim());
      }
    }
    return { id: profile.id, label: profile.label, matched, hits: matched.length };
  });

  const best = Math.max(...lanes.map((l) => l.hits), 0);

  // Nothing recognisable in the file (a scanned image, an unusual layout, a
  // non-technical resume). Returning all-zero weights would disable every lane
  // and rank nothing, so hand back null and let the caller keep its defaults.
  if (best === 0) return { profiles: null, lanes: [], skills: [] };

  const profiles = Object.fromEntries(
    lanes.map((lane) => {
      // Strongest lane lands at 1.8x, the rest scale down from there. Nothing
      // hits 2.0 so there is headroom left for the user to push a lane higher.
      const weight = best === 0 ? 1 : Math.round((lane.hits / best) * 18) / 10;
      return [lane.id, { enabled: lane.hits > 0, weight: Math.max(weight, 0.1) }];
    }),
  );

  return {
    profiles,
    lanes: lanes.filter((l) => l.hits > 0).sort((a, b) => b.hits - a.hits),
    skills: [...new Set(lanes.flatMap((l) => l.matched))].sort(),
  };
}
