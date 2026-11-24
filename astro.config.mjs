// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Actions 에서는 GITHUB_REPOSITORY(owner/repo)로 배포 주소를 자동으로 맞춘다.
//  - 레포 이름이 <owner>.github.io → https://<owner>.github.io/
//  - 그 외 (예: MyPage)            → https://<owner>.github.io/MyPage/
// 커스텀 도메인을 연결하면 site 를 그 주소로, base 를 '/' 로 고정하면 된다.
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? 'jungminna03/jungminna03.github.io').split('/');
const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;

export default defineConfig({
  site: `https://${owner.toLowerCase()}.github.io`,
  base: isUserSite ? '/' : `/${repo}`,
  markdown: {
    // 베이지 종이 위의 어두운 칠판 — 예전 블로그처럼 코드 블록은 어둡게, 색은 따뜻하게
    shikiConfig: { theme: 'gruvbox-dark-medium' },
  },
});
