// 스크립트 공용 유틸
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const USER_AGENT = 'Mozilla/5.0 (compatible; mypage-bot/1.0)';

export async function fetchText(url, { timeout = 20_000, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...headers },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, { ...options, headers: { Accept: 'application/json', ...options.headers } });
  return JSON.parse(text);
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text.endsWith('\n') ? text : `${text}\n`);
}

export const writeJson = (path, data) => writeText(path, JSON.stringify(data, null, 2));

export const sha1 = (value) =>
  createHash('sha1')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');

export const unique = (values) => [...new Set(values.filter(Boolean))];

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', middot: '·',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', bull: '•',
};

export function decodeEntities(text = '') {
  return String(text).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
  });
}

/** HTML → 평문. Greenhouse 처럼 한 번 더 이스케이프된 HTML(&lt;p&gt;)도 처리한다. */
export function htmlToText(html = '') {
  let s = String(html ?? '');
  if (/&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li(\s[^>]*)?>/gi, '\n• ')
    .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(s)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 글자(code point) 기준으로 자르고 말줄임표를 붙인다 */
export function truncate(text = '', max = 200) {
  const chars = [...String(text)];
  return chars.length <= max ? String(text) : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/**
 * 날짜 → ISO 문자열. 시간대 표기가 없는 값('2026-11-24 15:57:59')은 defaultOffset 으로 해석한다.
 * 한국·일본 피드는 '+09:00' 을 넘기면 된다.
 */
export function toIso(value, defaultOffset = 'Z') {
  if (value == null || value === '') return undefined;
  let input = typeof value === 'number' ? value : String(value).trim();
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(input)) {
    input = `${input.replace(' ', 'T')}${defaultOffset}`;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** 한국 시간 기준 YYYY-MM-DD */
export function kstDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/** GitHub Actions 에서는 실행 요약에 경고로 표시된다 */
export function warn(message) {
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `⚠ ${message}`);
}
