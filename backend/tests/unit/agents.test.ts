// tests/unit/agents.test.ts — Backend unit tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractJSON } from '../../src/agents/openRouter';

// ── extractJSON ───────────────────────────────────────────────────
describe('extractJSON', () => {
  it('parses clean JSON', () => {
    const result = extractJSON('{"key": "value"}');
    expect(result.key).toBe('value');
  });

  it('extracts JSON from markdown-wrapped response', () => {
    const messy = `Here is the result:\n\`\`\`json\n{"enhancedPrompt": "Epic"}\n\`\`\`\nEnjoy!`;
    const result = extractJSON(messy);
    expect(result.enhancedPrompt).toBe('Epic');
  });

  it('extracts JSON from prose-wrapped response', () => {
    const messy = `Sure! Here you go: {"strategy": "Go viral"} Hope that helps.`;
    const result = extractJSON(messy);
    expect(result.strategy).toBe('Go viral');
  });

  it('throws if no JSON found', () => {
    expect(() => extractJSON('No JSON here at all')).toThrow();
  });

  it('throws if JSON is malformed', () => {
    expect(() => extractJSON('{ broken json: }')).toThrow();
  });
});

// ── Queue idempotency ─────────────────────────────────────────────
describe('Campaign idempotency key generation', () => {
  it('generates a deterministic key for the same prompt + tenant', () => {
    const prompt = 'Launch a viral TikTok campaign for my sneakers';
    const tenantId = 'tenant_abc';
    const key1 = `campaign:${tenantId}:${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
    const key2 = `campaign:${tenantId}:${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
    expect(key1).toBe(key2);
  });

  it('generates a different key for different tenants', () => {
    const prompt = 'Same prompt';
    const key1 = `campaign:tenant_A:${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
    const key2 = `campaign:tenant_B:${Buffer.from(prompt).toString('base64').slice(0, 32)}`;
    expect(key1).not.toBe(key2);
  });
});
