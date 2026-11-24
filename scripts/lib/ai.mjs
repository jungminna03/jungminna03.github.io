// Claude API 호출 래퍼 — 채용 추천, 카드뉴스, 포폴·자소서 생성이 함께 쓴다.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

/** 기본 모델. 저장소 Variables 나 .env 의 CLAUDE_MODEL 로 바꿀 수 있다 (예: claude-sonnet-5-5, claude-haiku-5-5). */
export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

// 안전 분류기가 요청을 거절하면 서버가 권장 대체 모델로 같은 요청을 다시 실행한다.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

/** API 키(또는 `ant auth login` 프로필)가 있을 때만 AI 기능을 쓴다. */
export const aiEnabled = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);

let client;
const anthropic = () => (client ??= new Anthropic());

/** 테스트에서 가짜 클라이언트를 넣을 때 쓴다 */
export function setClient(next) {
  client = next;
}

/**
 * 구조화 출력(JSON)으로 받아서 zod 스키마로 검증한 객체를 돌려준다.
 * @template {import('zod').ZodType} S
 * @param {{ system: string, prompt: string, schema: S, effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max', maxTokens?: number }} options
 * @returns {Promise<import('zod').infer<S>>}
 */
export async function generateObject({ system, prompt, schema, effort = 'medium', maxTokens = 32_000 }) {
  // parse 는 직접 부른다. SDK 자동 파싱에 맡기면 거절·잘린 응답에서도 JSON 해석부터 시도해서 진짜 원인이 가려진다.
  const { parse, ...format } = betaZodOutputFormat(schema);
  const message = await anthropic()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      ...FALLBACK,
      output_config: { effort, format },
      system,
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage();
  ensureFinished(message);
  return parse(textOf(message));
}

/** 마크다운 같은 자유 텍스트로 받는다 */
export async function generateText({ system, prompt, effort = 'high', maxTokens = 64_000 }) {
  const message = await anthropic()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      ...FALLBACK,
      output_config: { effort },
      system,
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage();
  ensureFinished(message);
  return textOf(message).trim();
}

/**
 * 웹 검색을 쓰게 하고 자유 텍스트로 받는다. 검색 결과·인용에 실제로 나온 URL 목록도 함께 돌려준다.
 * 서버 쪽 검색 루프가 길어져 pause_turn 으로 멈추면 그대로 이어서 요청한다.
 * @param {{ system: string, prompt: string, maxSearches?: number, effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max', maxTokens?: number }} options
 * @returns {Promise<{ text: string, sources: { url: string, title: string }[] }>}
 */
export async function researchText({ system, prompt, maxSearches = 10, effort = 'medium', maxTokens = 64_000 }) {
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }];
  /** @type {any[]} */
  const messages = [{ role: 'user', content: prompt }];
  /** @type {any[]} */
  const blocks = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const message = await anthropic()
      .beta.messages.stream({ model: MODEL, max_tokens: maxTokens, ...FALLBACK, output_config: { effort }, system, tools, messages })
      .finalMessage();
    blocks.push(...message.content);
    if (message.stop_reason !== 'pause_turn') {
      ensureFinished(message);
      break;
    }
    console.log('  [AI] 검색이 길어져서 이어서 요청합니다 (pause_turn)');
    messages.push({ role: 'assistant', content: message.content });
  }
  return { text: textOf({ content: blocks }).trim(), sources: sourcesOf(blocks) };
}

/** 검색 결과 블록과 텍스트 인용에서 URL 을 모은다 (중복 제거) */
export function sourcesOf(blocks) {
  /** @type {Map<string, string>} */
  const found = new Map();
  const add = (url, title) => url && !found.has(url) && found.set(url, title || url);
  for (const block of blocks) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content) if (result.type === 'web_search_result') add(result.url, result.title);
    }
    if (block.type === 'text') for (const c of block.citations ?? []) add(c.url, c.title);
  }
  return [...found].map(([url, title]) => ({ url, title }));
}

const textOf = (message) =>
  message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

function ensureFinished(message) {
  const { model, usage, stop_reason: stop } = message;
  console.log(`  [AI] ${model} · 입력 ${usage.input_tokens} · 출력 ${usage.output_tokens} 토큰`);
  if (stop === 'refusal') {
    throw new Error(`Claude 가 요청을 거절했습니다 (${message.stop_details?.category ?? '사유 미상'}).`);
  }
  if (stop === 'max_tokens') throw new Error('응답이 max_tokens 한도에서 잘렸습니다.');
}
