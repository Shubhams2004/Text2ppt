import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseProjectBackupJson,
  convertMarkdownToCode,
  convertCsvToCode,
  ProjectState,
} from './projectStorage';

describe('Client-Side Local Storage & Backup Engine', () => {
  it('parses valid project backup JSON and extracts state cleanly', () => {
    const backupJson = JSON.stringify({
      app: 'Code2PPT STUDIO',
      format: 'code2ppt-project-backup',
      version: 1,
      title: 'Quarterly Review',
      inputMode: 'code',
      activeSlideIndex: 2,
      theme: 'emerald',
      code: 'presentation "Quarterly Review"\nslide "S1"\ntext "T1"',
    });

    const parsed = parseProjectBackupJson(backupJson);
    assert.ok(parsed);
    assert.equal(parsed?.title, 'Quarterly Review');
    assert.equal(parsed?.inputMode, 'code');
    assert.equal(parsed?.activeSlideIndex, 2);
    assert.equal(parsed?.theme, 'emerald');
    assert.match(parsed?.code || '', /Quarterly Review/);
  });

  it('rejects invalid or empty backup files gracefully without throwing', () => {
    assert.equal(parseProjectBackupJson('not valid json'), null);
    assert.equal(parseProjectBackupJson('{}'), null);
    assert.equal(parseProjectBackupJson('null'), null);
  });

  it('converts Markdown headings and bullets to valid Code2PPT markup', () => {
    const markdown = `# Architecture Overview

## Current Bottlenecks
- Single point of failure
- Database connection pool exhaustion
- Deployment downtime

## Modernized Microservices
- Independent scaling
- Zero-downtime canary rollouts
`;

    const code = convertMarkdownToCode(markdown);
    assert.match(code, /presentation "Architecture Overview"/);
    assert.match(code, /slide "Current Bottlenecks"/);
    assert.match(code, /bullet "Single point of failure"/);
    assert.match(code, /slide "Modernized Microservices"/);
    assert.match(code, /bullet "Zero-downtime canary rollouts"/);
  });

  it('converts CSV spreadsheets into structured Code2PPT table slides', () => {
    const csv = `Quarter, Revenue, Growth, Status
Q1, $4.2M, 18%, Complete
Q2, $5.1M, 22%, Complete
Q3, $6.8M, 33%, Pending`;

    const code = convertCsvToCode(csv, 'Financial Performance');
    assert.match(code, /presentation "Financial Performance"/);
    assert.match(code, /slide "Financial Performance"/);
    assert.match(code, /table headers=/);
    assert.match(code, /"Revenue"/);
    assert.match(code, /"\$4.2M"/);
  });
});
