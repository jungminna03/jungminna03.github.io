import type { SpriteName } from './sprites';

/** 책상 위 종이 다섯 장 — 좌우 버튼으로 이 순서대로 넘긴다 (첫 화면은 기술 일기) */
export const SECTIONS: { key: SectionKey; path: string; label: string; sprite: SpriteName }[] = [
  { key: 'diary', path: '/diary/', label: '기술 일기', sprite: 'quill' },
  { key: 'portfolio', path: '/portfolio/', label: '포트폴리오', sprite: 'folder' },
  { key: 'jobs', path: '/jobs/', label: '채용 추천', sprite: 'letter' },
  { key: 'trends', path: '/trends/', label: '게임 트렌드', sprite: 'chart' },
  { key: 'tech', path: '/tech/', label: '기술 트렌드', sprite: 'bulb' },
];

export type SectionKey = 'diary' | 'portfolio' | 'jobs' | 'trends' | 'tech';
