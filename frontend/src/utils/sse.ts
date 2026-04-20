import type { StreamStatusPayload } from '../types';

export interface ParsedSseResult {
  events: StreamStatusPayload[];
  buffer: string;
}

export function parseSseChunk(chunk: string, previousBuffer = ''): ParsedSseResult {
  const fullText = `${previousBuffer}${chunk}`;
  const blocks = fullText.split(/\r?\n\r?\n/);
  const nextBuffer = blocks.pop() ?? '';
  const events: StreamStatusPayload[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    const dataText = dataLines.join('\n');
    try {
      const payload = JSON.parse(dataText) as StreamStatusPayload;
      events.push(payload);
    } catch {
      // Preserve malformed payloads in the stream for debugging.
      events.push({
        status: 'error',
        message: `Malformed stream payload: ${dataText.slice(0, 200)}`,
      });
    }
  }

  return { events, buffer: nextBuffer };
}
