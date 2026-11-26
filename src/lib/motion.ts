// 움직임 줄이기(OS 설정)를 켠 컴퓨터에서도 사이트 버튼으로 애니메이션을 다시 켤 수 있다.
// 켰는지는 <html data-motion="on"> 으로 표시하고 localStorage 에 기억한다 (Desk.astro 의 head 스크립트가 처음에 붙인다).

const KEY = 'motion';

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const motionForced = () => document.documentElement.dataset.motion === 'on';

/** 지금 애니메이션을 생략해야 하는지 */
export const reduceMotion = () => prefersReducedMotion() && !motionForced();

export function setMotionForced(on: boolean) {
  if (on) document.documentElement.dataset.motion = 'on';
  else delete document.documentElement.dataset.motion;
  try {
    if (on) localStorage.setItem(KEY, 'on');
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 브라우저면 이번 방문에만 적용된다
  }
}
