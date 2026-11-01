/**
 * Heals domains.json: node heal.mjs
 *
 * Each site's current domain is opened at its root. A site that moves redirects its old domain to
 * the new one for a while (2026-11-01: new9.hdhub4u.cl → new10.hdhub4u.cl, 4khdhub.fans →
 * 4khdhub.one, hubcloud.one → hubcloud.ist), so a redirect to a domain of the same site, by its
 * hostname label, is the new domain, and is written to domains.json. A domain that does not answer
 * names no new one: it is reported, to be edited by hand.
 *
 * In GitHub Actions it gives the workflow `changed` (true or false), `message` (for the commit)
 * and `unreachable` (one line per domain, empty when every one answers).
 */
import { appendFile, readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('./domains.json', import.meta.url);
// Some sites answer a client without a browser's User-Agent with a challenge page.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const TIMEOUT_MS = 20_000;

// "new10.hdhub4u.cl" is a domain of hdhub4u: one of its labels is the site's.
const isDomainOf = (hostname, label) => hostname.split('.').includes(label);

/**
 * @param {string} label - The site, "hdhub4u".
 * @param {string} origin - Its domain in domains.json, "https://new10.hdhub4u.cl".
 * @returns {Promise<{ label: string, origin: string, current?: string, problem?: string }>}
 *   `current`: where the site answers now; `problem`: why it did not.
 */
async function check(label, origin) {
  try {
    const response = await fetch(`${origin}/`, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await response.body?.cancel();
    const final = new URL(response.url);
    // A 4xx is the site answering: HubCDN's root is HTTP 403 (2026-11-01), its files answer. A 5xx
    // (and Cloudflare's 52x) is a site that is down.
    if (response.status >= 500) return { label, origin, problem: `HTTP ${response.status} at ${final.origin}` };
    if (!isDomainOf(final.hostname, label)) return { label, origin, problem: `redirects to ${final.origin}, not a domain of ${label}` };
    return { label, origin, current: final.origin };
  } catch (error) {
    return { label, origin, problem: error.name === 'TimeoutError' ? 'no answer in 20 s' : (error.cause?.code ?? error.message) };
  }
}

const domains = JSON.parse(await readFile(FILE, 'utf8'));
const results = await Promise.all(Object.entries(domains).map(([label, origin]) => check(label, origin)));

const moved = results.filter(({ current, origin }) => current && current !== origin);
const unreachable = results.filter(({ problem }) => problem);
for (const { label, origin, current, problem } of results) {
  console.log(`${label}: ${problem ? `${origin} UNREACHABLE (${problem})` : current === origin ? `${origin} ok` : `${origin} → ${current}`}`);
}

if (moved.length) {
  for (const { label, current } of moved) domains[label] = current;
  await writeFile(FILE, `${JSON.stringify(domains, null, 2)}\n`);
}

if (process.env.GITHUB_OUTPUT) {
  const message = `heal: ${moved.map(({ label, current }) => `${label} is ${current}`).join(', ')}`;
  const lines = unreachable.map(({ label, origin, problem }) => `- ${label}: ${origin} (${problem})`).join('\n');
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${moved.length > 0}\nmessage=${message}\nunreachable<<END\n${lines}\nEND\n`);
}
