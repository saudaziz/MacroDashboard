import { describe, expect, it } from 'vitest';
import { parseSseChunk } from './sse';

describe('parseSseChunk', () => {
  it('parses complete SSE payload blocks', () => {
    const input = 'data: {"status":"routing","message":"ok"}\n\ndata: {"status":"analysis_complete"}\n\n';
    const { events, buffer } = parseSseChunk(input);

    expect(buffer).toBe('');
    expect(events).toHaveLength(2);
    expect(events[0]?.status).toBe('routing');
    expect(events[1]?.status).toBe('analysis_complete');
  });

  it('keeps partial payload in buffer until complete', () => {
    const first = parseSseChunk('data: {"status":"routing"');
    expect(first.events).toHaveLength(0);
    expect(first.buffer).toContain('routing');

    const second = parseSseChunk(',"message":"x"}\n\n', first.buffer);
    expect(second.buffer).toBe('');
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.message).toBe('x');
  });
});
