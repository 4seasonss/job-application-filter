// Which countries does a posting's free-text location name?
//
// Upstream locations are hand-typed and inconsistent: "Seattle, WA, United
// States", "Redmond, WA" (no country), "US, CA, Santa Clara, US", "Toronto, ON,
// Canada", "Multi Location", and multi-country strings that list several places
// at once. So this answers a set, not a single country, and it answers "unknown"
// honestly instead of guessing: filtering on a guess would silently drop jobs
// you are eligible for.
//
// Returns a Set drawn from 'US', 'CA' and 'OTHER'. An empty set means the text
// gave nothing to go on.

const US_NAME = /\b(?:united states(?: of america)?|usa|u\.s\.a?\.?)\b|(?:^|[\s,(])us(?=$|[\s,).-])/i;
const CANADA_NAME = /\bcanada\b/i;

const US_STATE_CODES = new Set(
  'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR GU VI'.split(' '),
);
const US_STATE_NAMES = new RegExp(
  '\\b(?:alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|puerto rico)\\b',
  'i',
);

const CA_PROVINCE_CODES = new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' '));
const CA_PROVINCE_NAMES =
  /\b(?:alberta|british columbia|manitoba|new brunswick|newfoundland|nova scotia|ontario|prince edward island|quebec|québec|saskatchewan)\b/i;

// Countries seen in the feed plus the obvious ones likely to show up. A miss
// here is harmless: the posting is classed "unknown" and kept.
const OTHER_COUNTRIES = new RegExp(
  '\\b(?:united kingdom|england|scotland|wales|northern ireland|ireland|australia|new zealand|india|germany|france|netherlands|spain|italy|poland|portugal|sweden|norway|denmark|finland|switzerland|austria|belgium|israel|singapore|japan|china|hong kong|taiwan|south korea|korea|brazil|mexico|argentina|colombia|chile|peru|costa rica|philippines|vietnam|thailand|malaysia|indonesia|united arab emirates|uae|dubai|saudi arabia|egypt|nigeria|kenya|south africa|turkey|t[uü]rkiye|romania|czech republic|czechia|hungary|ukraine|bulgaria|greece|serbia|croatia|lithuania|latvia|estonia|luxembourg|pakistan|bangladesh|sri lanka|uk)\\b',
  'i',
);

// A two-letter state/province code counts only when it is set off like one:
// after a comma or at the start, in capitals. Lowercase "in"/"or"/"me" and
// mid-sentence capitals are ordinary words, not places.
function codes(text, valid) {
  const found = [];
  for (const m of text.matchAll(/(?:^|,\s*|\s-\s)([A-Z]{2})(?=$|[\s,)\-(])/g)) {
    if (valid.has(m[1])) found.push(m[1]);
  }
  return found;
}

const cache = new Map();

export function countriesIn(location) {
  const text = String(location ?? '').trim();
  if (!text) return new Set();
  if (cache.has(text)) return cache.get(text);

  const found = new Set();

  if (US_NAME.test(text)) found.add('US');
  if (CANADA_NAME.test(text)) found.add('CA');
  if (OTHER_COUNTRIES.test(text)) found.add('OTHER');

  // Only reach for state and province hints when the text names no country at
  // all — "Redmond, WA" — so "Paris, TX" style ambiguity never overrides an
  // explicit country.
  if (found.size === 0) {
    const usCodes = codes(text, US_STATE_CODES);
    const caCodes = codes(text, CA_PROVINCE_CODES);
    if (usCodes.length || US_STATE_NAMES.test(text)) found.add('US');
    if (caCodes.length || CA_PROVINCE_NAMES.test(text)) found.add('CA');
  }

  cache.set(text, found);
  return found;
}

/**
 * True when the posting is clearly outside the allowed countries. A posting that
 * lists an allowed country alongside others is NOT outside — it is available
 * there — and one we cannot place is not outside either.
 */
export function isOutside(location, allowed = ['US', 'CA']) {
  const found = countriesIn(location);
  if (found.size === 0) return false;
  return ![...found].some((c) => allowed.includes(c));
}
