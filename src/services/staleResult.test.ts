import { describe, it, expect } from 'vitest';
import { shouldClearResult } from './staleResult';

describe('shouldClearResult', () => {
  it('does not clear when nothing has been analyzed yet', () => {
    expect(shouldClearResult(null, 'some new log text')).toBe(false);
    expect(shouldClearResult(undefined, 'some new log text')).toBe(false);
    expect(shouldClearResult(null, '')).toBe(false);
  });

  it('does not clear when the new text is identical or differs only by leading/trailing whitespace', () => {
    const sampleLog = '[14:02] alert: 504 gateway timeout\n[14:05] alex: checking redis';
    expect(shouldClearResult(sampleLog, sampleLog)).toBe(false);
    expect(shouldClearResult(sampleLog, `  ${sampleLog}  `)).toBe(false);
    expect(shouldClearResult(sampleLog, `\n\n${sampleLog}\n`)).toBe(false);
    expect(shouldClearResult(`  ${sampleLog} \n`, sampleLog)).toBe(false);
  });

  it('clears when a different log text is provided', () => {
    const originalLog = '[14:02] alert: 504 gateway timeout\n[14:05] alex: checking redis';
    const modifiedLog = '[14:02] alert: 504 gateway timeout\n[14:05] alex: checking postgres';
    const completelyDifferentLog = '[09:00] user: system down';

    expect(shouldClearResult(originalLog, modifiedLog)).toBe(true);
    expect(shouldClearResult(originalLog, completelyDifferentLog)).toBe(true);
    expect(shouldClearResult(originalLog, '')).toBe(true);
  });
});
