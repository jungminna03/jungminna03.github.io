// @ts-check
/**
 * 기술 트렌드 카드뉴스 — GitHub Actions 가 매일 `npm run technews` 로 가져온다.
 * 원본: 다른 사람이 운영하는 카드뉴스 서버 (GitHub 트렌딩 저장소 · Hugging Face 논문 요약).
 * 서버가 꺼져 있거나 바뀌면 어제 데이터를 그대로 둔다.
 */
export default {
  source: 'https://lseungbin.tail810031.ts.net', // 이 주소의 data/dates.json · data/<날짜>.json 을 읽는다
  days: 7, // 최근 며칠치를 보여줄지
};
