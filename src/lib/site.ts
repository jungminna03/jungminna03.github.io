const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** base 경로를 붙인 내부 링크. 예) url('/diary/') → /MyPage/diary/ */
export const url = (path = '/') => `${base}${path.startsWith('/') ? path : `/${path}`}`;

/** 외부 주소는 그대로, 사이트 안 경로는 base 를 붙인다 */
export const asset = (src: string) => (/^https?:\/\//.test(src) ? src : url(src));

const dateParts = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeParts = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const join = (format: Intl.DateTimeFormat, value: Date | string, sep: string) =>
  format
    .formatToParts(new Date(value))
    .filter((part) => part.type !== 'literal')
    .map((part) => part.value)
    .join(sep);

/** 2026.11.24 (한국 시간) */
export const formatDate = (value: Date | string) => join(dateParts, value, '.');

/** 2026.11.24 07:03 (한국 시간) */
export const formatDateTime = (value: Date | string) => `${formatDate(value)} ${join(timeParts, value, ':')}`;
