// 실제 SDK 에 가짜 fetch 를 넣어서, API 키 없이 요청 형식과 응답 처리를 검증한다.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { generateObject, generateText, MODEL, setClient } from './ai.mjs';

const sse = (events) =>
  new Response(events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  });

const messageEvents = (text, stopReason = 'end_turn') => [
  {
    type: 'message_start',
    message: {
      id: 'msg_test', type: 'message', role: 'assistant', model: MODEL, content: [],
      stop_reason: null, stop_sequence: null, usage: { input_tokens: 12, output_tokens: 1 },
    },
  },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 7 } },
  { type: 'message_stop' },
];

function useFakeClient(respond) {
  const calls = [];
  setClient(
    new Anthropic({
      apiKey: 'test-key',
      maxRetries: 0,
      fetch: async (url, init) => {
        calls.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body) });
        return respond();
      },
    }),
  );
  return calls;
}

test('generateObject: 구조화 출력 + 서버 fallback 으로 요청하고 zod 로 검증한 결과를 준다', async () => {
  const calls = useFakeClient(() => sse(messageEvents('{"picks":[{"name":"a"}]}')));
  const schema = z.object({ picks: z.array(z.object({ name: z.string() })) });

  const result = await generateObject({ system: 'sys', prompt: 'hello', schema });

  assert.deepEqual(result, { picks: [{ name: 'a' }] });
  const [{ url, headers, body }] = calls;
  assert.match(url, /\/v1\/messages/);
  assert.equal(body.model, MODEL);
  assert.equal(body.stream, true);
  assert.equal(body.fallbacks, 'default');
  assert.equal(body.output_config.effort, 'medium');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.output_config.format.parse, undefined);
  assert.equal(body.thinking, undefined); // Opus 5.5 는 adaptive 가 기본 — 따로 보내지 않는다
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hello' }]);
  assert.match(headers.get('anthropic-beta') ?? '', /server-side-fallback-2026-07-01/);
});

test('generateObject: 스키마에 안 맞는 응답이면 에러', async () => {
  useFakeClient(() => sse(messageEvents('{"picks":"nope"}')));
  await assert.rejects(generateObject({ system: 's', prompt: 'p', schema: z.object({ picks: z.array(z.string()) }) }));
});

test('generateObject: 거절(refusal)은 JSON 파싱 오류가 아니라 거절로 알린다', async () => {
  useFakeClient(() => sse(messageEvents('', 'refusal')));
  await assert.rejects(generateObject({ system: 's', prompt: 'p', schema: z.object({}) }), /거절/);
});

test('generateText: 잘린 응답(max_tokens)이면 에러', async () => {
  useFakeClient(() => sse(messageEvents('# 포트폴리오', 'max_tokens')));
  await assert.rejects(generateText({ system: 's', prompt: 'p' }), /max_tokens/);
});

test('generateText: 텍스트를 돌려준다', async () => {
  const calls = useFakeClient(() => sse(messageEvents('  # 포트폴리오\n내용  ')));
  assert.equal(await generateText({ system: 's', prompt: 'p' }), '# 포트폴리오\n내용');
  assert.equal(calls[0].body.output_config.effort, 'high');
});
