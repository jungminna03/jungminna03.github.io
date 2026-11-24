// 기술 일기(src/content/diary/**/*.md)를 Astro 밖(스크립트)에서 읽는다.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const DIARY_DIR = 'src/content/diary';

/** Astro glob 로더와 같은 규칙에 가깝게: 소문자, 공백 → '-', 문자·숫자·-·_ 만 남김 */
const slugify = (segment) =>
  segment
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');

/** 마크다운 → 대략적인 평문 (프롬프트용) */
export function markdownToText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' [코드] ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** frontmatter 와 본문을 나눈다 */
export function parseEntry(file, raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = (match && parseYaml(match[1])) || {};
  const body = (match ? match[2] : raw).trim();
  return {
    id: file.replace(/\\/g, '/').replace(/\.md$/, '').split('/').map(slugify).join('/'),
    title: String(data.title ?? file),
    date: new Date(data.date),
    tags: data.tags ?? [],
    project: data.project,
    skills: data.skills ?? [],
    highlight: data.highlight,
    draft: Boolean(data.draft),
    body,
  };
}

/** 최신순. 기본으로 draft 는 뺀다 */
export async function loadDiary({ includeDrafts = false, dir = DIARY_DIR } = {}) {
  let files;
  try {
    files = (await readdir(dir, { recursive: true })).filter((file) => file.endsWith('.md'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const entries = await Promise.all(files.map(async (file) => parseEntry(file, await readFile(join(dir, file), 'utf8'))));
  return entries
    .filter((entry) => includeDrafts || !entry.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
