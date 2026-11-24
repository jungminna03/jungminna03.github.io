import { getCollection, type CollectionEntry } from 'astro:content';

/** 배포 빌드에서는 draft 를 숨기고, 로컬 개발 서버에서는 보여준다. 최신순. */
export async function getDiary() {
  const entries = await getCollection('diary', ({ data }) => import.meta.env.DEV || !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 최신순 */
export async function getCardNews() {
  const sets = await getCollection('cardnews');
  return sets.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || b.id.localeCompare(a.id));
}

/** buildPortfolio() 입력 형태로 변환 */
export const toPortfolioEntry = ({ id, data }: CollectionEntry<'diary'>) => ({
  id,
  title: data.title,
  date: data.date,
  tags: data.tags,
  project: data.project,
  skills: data.skills,
  highlight: data.highlight,
});
