// 기술 트렌드 카드뉴스 → src/data/technews.json
// 실행: npm run technews            (원본 서버에서 가져온다)
//       npm run technews -- --from <폴더>   (dates.json · <날짜>.json 을 받아 둔 폴더에서 읽는다)
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import config from '../../config/technews.mjs';
import { fetchJson, readJson, warn, writeJson } from '../lib/util.mjs';
import { normalizeDay } from './normalize.mjs';

const OUTPUT = 'src/data/technews.json';
const fromIndex = process.argv.indexOf('--from');
const fromDir = fromIndex > 0 ? process.argv[fromIndex + 1] : null;
const load = (path) => (fromDir ? readFile(join(fromDir, path), 'utf8').then(JSON.parse) : fetchJson(`${config.source}/data/${path}`));

const previous = await readJson(OUTPUT, null);
try {
  const { dates } = await load('dates.json');
  const days = [];
  for (const date of (dates ?? []).slice(0, config.days)) {
    try {
      const day = normalizeDay(date, await load(`${date}.json`));
      if (day.cards.length) days.push(day);
    } catch (err) {
      warn(`${date} 카드뉴스를 못 가져옴: ${err.message}`);
    }
  }
  if (!days.length) throw new Error('가져온 카드가 없습니다.');
  await writeJson(OUTPUT, { generatedAt: new Date().toISOString(), days });
  console.log(`✓ 기술 트렌드 ${days.length}일치 · 카드 ${days.reduce((n, d) => n + d.cards.length, 0)}장 → ${OUTPUT}`);
} catch (err) {
  // 원본 서버가 꺼져 있으면 어제 데이터를 그대로 둔다 (실패로 처리하지 않음)
  warn(`기술 트렌드 카드뉴스를 못 가져와서 이전 데이터를 유지합니다${previous ? ` (${previous.generatedAt?.slice(0, 10)})` : ''}: ${err.message}`);
}
