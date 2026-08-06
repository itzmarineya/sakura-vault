/* Netlify Function — Sakura VM same-origin site loader
   Deploy this folder with the Vault to Netlify. The VM calls this function
   only for pages that refuse normal iframe embedding. */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_HOPS = 5;

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
function safeUrl(value) {
  let u;
  try { u = new URL(value); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  // Do not turn the public Netlify function into a path to private services.
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h === '::1' || h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.') || h.endsWith('.local')) return null;
  return u;
}

async function fetchPage(target, hop = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(target, {
      redirect: 'manual', signal: controller.signal,
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if ([301, 302, 303, 307, 308].includes(response.status) && hop < MAX_HOPS) {
      const next = response.headers.get('location');
      const u = next && safeUrl(new URL(next, target).href);
      if (!u) throw new Error('Blocked redirect');
      return fetchPage(u.href, hop + 1);
    }
    const data = await response.arrayBuffer();
    if (data.byteLength > MAX_BYTES) throw new Error('Page is too large for the VM loader');
    return { status: response.status, type: response.headers.get('content-type') || 'text/html; charset=utf-8', body: Buffer.from(data).toString('base64') };
  } finally { clearTimeout(timeout); }
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (q.ping === '1') return json(200, { ok: true, service: 'sakura-vm-netlify-loader' });
  const url = safeUrl(q.url || '');
  if (!url) return json(400, { ok: false, error: 'Please provide a public http(s) URL.' });
  try {
    const page = await fetchPage(url.href);
    return {
      statusCode: page.status || 200,
      isBase64Encoded: true,
      headers: { 'Content-Type': page.type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: page.body
    };
  } catch (err) {
    return json(502, { ok: false, error: 'VM loader could not fetch this page: ' + (err.message || 'unknown error') });
  }
};
