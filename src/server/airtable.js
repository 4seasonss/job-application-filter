// Adapter for Airtable's public "shared view" data endpoint.
//
// This is an internal, undocumented endpoint — the same one the embed iframe
// calls. Everything fragile about this project lives in this one file on
// purpose: if Airtable changes the handshake, this is the only thing to fix.
//
// The handshake: GET the embed page, scrape the prefetch descriptor it inlines
// (a signed access policy plus a request id), then replay that request with the
// page's cookies and application id.

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function unescapeJs(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const raw = headers.get('set-cookie');
  return raw ? [raw] : [];
}

async function openSharedView({ baseId, shareId }) {
  const shareUrl = `https://airtable.com/embed/${baseId}/${shareId}`;
  const res = await fetch(shareUrl, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
  });
  if (!res.ok) throw new Error(`share page ${shareUrl} responded ${res.status}`);

  const html = await res.text();
  const cookies = readSetCookies(res.headers)
    .map((c) => c.split(';')[0])
    .join('; ');

  const path = html.match(/urlWithParams:\s*"([^"]+)"/)?.[1];
  if (!path) throw new Error('could not find urlWithParams — Airtable changed the embed page');

  const appId =
    html.match(/"x-airtable-application-id":\s*"([^"]+)"/)?.[1] ??
    html.match(/x-airtable-application-id["'\s:]+([a-zA-Z0-9]{17})/)?.[1] ??
    baseId;
  const pageLoadId = html.match(/"x-airtable-page-load-id":\s*"([^"]+)"/)?.[1];

  return { shareUrl, cookies, appId, pageLoadId, url: `https://airtable.com${unescapeJs(path)}` };
}

// Airtable stores single/multi selects as opaque choice ids; the human-readable
// labels only exist in the column's typeOptions. Flatten them into one lookup.
function buildChoiceMap(columns) {
  const map = new Map();
  for (const column of columns) {
    const choices = column.typeOptions?.choices ?? {};
    for (const choice of Object.values(choices)) map.set(choice.id, choice.name);
  }
  return map;
}

function cellReader(columns, choices) {
  const idByName = new Map(columns.map((c) => [c.name, c.id]));
  return (row, name) => {
    const value = row.cellValuesByColumnId?.[idByName.get(name)];
    if (value == null) return null;
    if (Array.isArray(value)) return value.map((v) => choices.get(v) ?? v);
    if (typeof value === 'string') return choices.get(value) ?? value;
    return value;
  };
}

/** Fetch one category and return its rows in a source-agnostic shape. */
export async function fetchAirtableCategory(key, { label, baseId, shareId }) {
  const session = await openSharedView({ baseId, shareId });

  const res = await fetch(session.url, {
    headers: {
      'user-agent': UA,
      accept: '*/*',
      'x-airtable-application-id': session.appId,
      ...(session.pageLoadId ? { 'x-airtable-page-load-id': session.pageLoadId } : {}),
      'x-time-zone': 'America/New_York',
      'x-user-locale': 'en',
      'x-requested-with': 'XMLHttpRequest',
      ...(session.cookies ? { cookie: session.cookies } : {}),
      referer: session.shareUrl,
    },
  });
  if (!res.ok) throw new Error(`readSharedViewData responded ${res.status} for ${key}`);

  const body = await res.json();
  const table = body?.data?.table;
  if (!table?.rows || !table?.columns) throw new Error(`unexpected payload shape for ${key}`);

  const read = cellReader(table.columns, buildChoiceMap(table.columns));

  return table.rows.map((row) => {
    const apply = read(row, 'Apply');
    return {
      id: `${key}:${row.id}`,
      category: key,
      categoryLabel: label,
      title: read(row, 'Position Title') ?? '',
      company: read(row, 'Company') ?? '',
      location: read(row, 'Location') ?? '',
      salary: read(row, 'Salary') ?? '',
      date: read(row, 'Date') ?? '',
      url: typeof apply === 'object' ? (apply?.url ?? '') : '',
      workModel: read(row, 'Work Model') ?? '',
      companySize: read(row, 'Company Size') ?? '',
      industries: read(row, 'Company Industry') ?? [],
      // 'yes' | 'no' | 'not sure' | '' — see README for why '' and 'not sure'
      // are treated as the same unknown.
      h1b: (read(row, 'H1b Sponsored') ?? '').toLowerCase(),
      isNewGrad: (read(row, 'Is New Grad') ?? '').toLowerCase() === 'yes',
      qualifications: (read(row, 'Qualifications') ?? '').slice(0, 2400),
    };
  });
}
