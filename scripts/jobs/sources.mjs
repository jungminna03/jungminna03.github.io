// 채용 공고 소스. 대부분 회사가 채용 페이지용으로 공개한 공식 API 라서 인증이 필요 없다.
// HRMOS 만 공식 API 가 없어서 회사의 공개 채용 목록 페이지를 하루 한 번 읽는다 (페이지 사이 1초 쉼).
import { decodeEntities, fetchJson, fetchText, htmlToText, sha1, toIso, unique } from '../lib/util.mjs';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HRMOS 채용 목록 페이지 HTML → 공고 목록 (한 페이지 최대 100건)
 * @param {string} html
 * @param {string} id hrmos.co/pages/<id>
 */
export function parseHrmosList(html, id) {
  const items = html.split('<li class="pg-list-cassette jsc-joblist-cassette">').slice(1);
  return items.flatMap((item) => {
    const url = item.match(/<a href="(https:\/\/hrmos\.co\/pages\/[^"]+\/jobs\/([^"/?#]+))"/);
    const title = item.match(/<h2>([\s\S]*?)<\/h2>/);
    if (!url || !title) return [];
    const tags = [...item.matchAll(/<li(?: class="([^"]*)")?>([\s\S]*?)<\/li>/g)];
    const location = tags.find((t) => t[1] === 'sg-tag-location')?.[2] ?? '';
    const labels = tags.filter((t) => t[1] !== 'sg-tag-location').map((t) => htmlToText(t[2]));
    const body = item.match(/<span class="pg-list-cassette-body[^"]*">([\s\S]*?)<\/span>/)?.[1] ?? '';
    return [
      {
        id: `hrmos:${id}:${url[2]}`,
        title: decodeEntities(htmlToText(title[1])).trim(),
        location: decodeEntities(htmlToText(location)).replace(/\s+他\(\d+\)$/, '').trim(),
        url: url[1],
        department: labels[0],
        postedAt: undefined,
        description: [labels.join(' · '), htmlToText(body)].filter(Boolean).join('\n'),
      },
    ];
  });
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
function countryName(code) {
  if (!code) return undefined;
  try {
    return regionNames.of(String(code).toUpperCase());
  } catch {
    return String(code);
  }
}

const ADAPTERS = {
  // HRMOS 채용 — 공개 채용 목록 페이지 (?page=N, 한 페이지 100건)
  async hrmos({ id }) {
    const jobs = new Map();
    for (let page = 1; page <= 10; page += 1) {
      if (page > 1) await pause(1000);
      const html = await fetchText(`https://hrmos.co/pages/${id}/jobs${page > 1 ? `?page=${page}` : ''}`);
      const found = parseHrmosList(html, id).filter((job) => !jobs.has(job.id));
      for (const job of found) jobs.set(job.id, job);
      if (found.length < 100) break;
    }
    return [...jobs.values()];
  },

  // https://developers.greenhouse.io/job-board.html
  async greenhouse({ id }) {
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`);
    return data.jobs.map((job) => ({
      id: `greenhouse:${id}:${job.id}`,
      title: job.title.trim(),
      location: job.location?.name ?? '',
      url: job.absolute_url,
      department: job.departments?.[0]?.name,
      postedAt: toIso(job.first_published ?? job.updated_at),
      description: htmlToText(job.content),
    }));
  },

  // https://github.com/lever/postings-api
  async lever({ id }) {
    const data = await fetchJson(`https://api.lever.co/v0/postings/${id}?mode=json`);
    return data.map((job) => ({
      id: `lever:${id}:${job.id}`,
      title: job.text.trim(),
      location: unique([job.categories?.location, ...(job.categories?.allLocations ?? []), countryName(job.country)]).join(' / '),
      url: job.hostedUrl,
      department: job.categories?.team ?? job.categories?.department,
      postedAt: toIso(job.createdAt),
      description: [job.descriptionPlain, ...(job.lists ?? []).map((list) => `${list.text}\n${htmlToText(list.content)}`), job.additionalPlain]
        .filter(Boolean)
        .join('\n'),
    }));
  },

  // https://developers.smartrecruiters.com/docs/posting-api — 목록에는 본문이 없어서 enrichDescriptions 로 채운다
  async smartrecruiters({ id }) {
    const postings = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${id}/postings?limit=100&offset=${offset}`);
      postings.push(...page.content);
      if (page.content.length < 100 || postings.length >= page.totalFound) break;
    }
    return postings.map((job) => ({
      id: `smartrecruiters:${id}:${job.id}`,
      title: job.name.trim(),
      location: unique([job.location?.city, countryName(job.location?.country), job.location?.remote ? 'Remote' : '']).join(', '),
      url: `https://jobs.smartrecruiters.com/${id}/${job.id}`,
      department: job.department?.label ?? job.function?.label,
      postedAt: toIso(job.releasedDate),
      description: '',
    }));
  },

  // https://developers.ashbyhq.com/docs/public-job-posting-api
  async ashby({ id }) {
    const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${id}`);
    return data.jobs
      .filter((job) => job.isListed !== false)
      .map((job) => ({
        id: `ashby:${id}:${job.id}`,
        title: job.title.trim(),
        location: unique([job.location, ...(job.secondaryLocations ?? []).map((s) => s.location), job.isRemote ? 'Remote' : '']).join(' / '),
        url: job.jobUrl,
        department: job.department ?? job.team,
        postedAt: toIso(job.publishedAt),
        description: job.descriptionPlain ?? htmlToText(job.descriptionHtml),
      }));
  },
};

/** config/jobs.mjs 의 회사 하나에서 전체 공고를 가져온다 */
export async function fetchCompanyJobs(company) {
  const adapter = ADAPTERS[company.ats];
  if (!adapter) throw new Error(`지원하지 않는 ats: ${company.ats}`);
  const jobs = await adapter(company);
  return jobs.map((job) => ({
    ...job,
    source: company.ats,
    company: company.name,
    companyKey: `${company.ats}:${company.id}`,
  }));
}

/** 직접 적은 공고 (링크드인·마이나비 등) */
export function manualJobs(list = []) {
  return list.map((job) => ({
    id: `manual:${sha1(job.url).slice(0, 12)}`,
    title: job.title,
    location: job.location ?? '',
    url: job.url,
    deadline: job.deadline,
    description: job.note ?? '',
    source: 'manual',
    company: job.company,
    companyKey: 'manual',
  }));
}

/** SmartRecruiters 공고는 필터를 통과한 것만 상세 API 로 본문을 채운다 (추천 정확도용) */
export async function enrichDescriptions(jobs) {
  const targets = jobs.filter((job) => job.source === 'smartrecruiters' && !job.description);
  await Promise.all(
    targets.map(async (job) => {
      const [, company, postingId] = job.id.split(':');
      try {
        const detail = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${postingId}`);
        const sections = detail.jobAd?.sections ?? {};
        job.description = htmlToText(
          [sections.jobDescription?.text, sections.qualifications?.text, sections.additionalInformation?.text].filter(Boolean).join('\n'),
        );
      } catch {
        // 본문 없이 진행
      }
    }),
  );
}
