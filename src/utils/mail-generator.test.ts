import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRandomUsername,
  generateEmailAddress,
  generateBulkMailboxes,
  extractOtpAndLinks,
  formatExportData,
  formatBytes,
} from './mail-generator.ts';

test('generateRandomUsername creates non-empty valid username with digits', () => {
  const username = generateRandomUsername();
  assert.ok(username.length > 5);
  assert.match(username, /[0-9]{4}/);
});

test('generateRandomUsername with prefix includes sanitized prefix', () => {
  const prefixed = generateRandomUsername('qa-tester');
  assert.ok(prefixed.startsWith('qatest'));
  assert.match(prefixed, /[0-9]{4}/);
});

test('generateEmailAddress combines username and clean domain', () => {
  const email = generateEmailAddress('@tmpinbox.dev', 'bot');
  assert.ok(email.endsWith('@tmpinbox.dev'));
  assert.ok(email.includes('bot'));
  assert.ok(!email.startsWith('@'));
});

test('generateBulkMailboxes generates requested count of unique mailboxes', () => {
  const count = 10;
  const list = generateBulkMailboxes(count, 'fastmailr.net', 'test', 30, 'dev-team');
  assert.equal(list.length, count);
  
  const addresses = new Set(list.map((m) => m.address));
  assert.equal(addresses.size, count, 'All generated addresses must be unique');
  
  for (const m of list) {
    assert.equal(m.domain, 'fastmailr.net');
    assert.equal(m.tag, 'dev-team');
    assert.equal(m.isActive, true);
    assert.ok(m.expiresAt !== 'never');
  }
});

test('extractOtpAndLinks detects 6-digit verification codes accurately', () => {
  const sample1 = extractOtpAndLinks(
    'Please enter your verification code: 829401 to complete your signup.',
    '<p>Thank you for registering. Your OTP is <strong>829401</strong></p>'
  );
  assert.equal(sample1.otpCode, '829401');

  const sample2 = extractOtpAndLinks(
    'Here is your code: 492019',
    '<a href="https://service.com/confirm?token=xyz123">Click here to confirm</a>'
  );
  assert.equal(sample2.otpCode, '492019');
  assert.equal(sample2.verificationUrl, 'https://service.com/confirm?token=xyz123');
});

test('formatExportData exports properly to CSV, JSON, and TXT', () => {
  const sampleMailboxes = generateBulkMailboxes(3, 'tmpinbox.dev', 'batch', 60, 'test');
  
  // JSON
  const jsonOutput = formatExportData(sampleMailboxes, 'json');
  const parsed = JSON.parse(jsonOutput);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].domain, 'tmpinbox.dev');

  // CSV
  const csvOutput = formatExportData(sampleMailboxes, 'csv');
  assert.ok(csvOutput.includes('Address,Username,Domain'));
  assert.equal(csvOutput.split('\n').length, 4); // 1 header + 3 rows

  // TXT
  const txtOutput = formatExportData(sampleMailboxes, 'txt');
  const lines = txtOutput.trim().split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].includes('@tmpinbox.dev'));
});

test('formatBytes converts bytes to formatted strings correctly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1024 * 1024 * 3.5), '3.5 MB');
});
