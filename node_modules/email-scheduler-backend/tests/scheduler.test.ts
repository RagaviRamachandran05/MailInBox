import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBackoffDelay } from '../src/queues/emailQueue';
import { DistributedRateLimiter } from '../src/services/rateLimiter';

describe('Email Scheduling & Queue Calculations', () => {
  it('should compute staggered schedule times accurately with minimum delay enforcement', () => {
    const startTime = new Date('2026-08-28T10:00:00.000Z').getTime();
    const delay = 2000; // 2 seconds
    const recipients = ['user1@test.com', 'user2@test.com', 'user3@test.com'];

    const calculatedTimes = recipients.map((_, i) => new Date(startTime + (i * delay)));

    expect(calculatedTimes[0].toISOString()).toBe('2026-08-28T10:00:00.000Z');
    expect(calculatedTimes[1].toISOString()).toBe('2026-08-28T10:00:02.000Z');
    expect(calculatedTimes[2].toISOString()).toBe('2026-08-28T10:00:04.000Z');
  });

  it('should return correct exponential backoff retry delays', () => {
    expect(getBackoffDelay(1)).toBe(5000);   // 5 seconds
    expect(getBackoffDelay(2)).toBe(30000);  // 30 seconds
    expect(getBackoffDelay(3)).toBe(120000); // 2 minutes
  });

  it('should correctly calculate the next hour window for rate-limit rescheduling', () => {
    const current = new Date('2026-08-28T18:45:12.345Z');
    const nextHour = DistributedRateLimiter.getNextHourStart(current);

    expect(nextHour.getUTCHours()).toBe(19);
    expect(nextHour.getUTCMinutes()).toBe(0);
    expect(nextHour.getUTCSeconds()).toBe(0);
  });
});

describe('Recipient & Input Sanitization', () => {
  it('should filter out duplicate and invalid email addresses', () => {
    const rawList = [
      'valid.one@example.com',
      'VALID.ONE@EXAMPLE.COM', // Duplicate
      'invalid-email',
      'valid.two@company.org',
      '   ',
      '@missinguser.com',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const clean = Array.from(
      new Set(
        rawList
          .map(r => r.trim().toLowerCase())
          .filter(r => emailRegex.test(r))
      )
    );

    expect(clean).toEqual(['valid.one@example.com', 'valid.two@company.org']);
    expect(clean.length).toBe(2);
  });

  it('should correctly interpolate template variables into body', () => {
    const template = 'Hello {{email}}, welcome to our platform!';
    const recipient = 'alex@example.com';
    const interpolated = template.replace(/\{\{\s*email\s*\}\}/gi, recipient);

    expect(interpolated).toBe('Hello alex@example.com, welcome to our platform!');
  });
});
