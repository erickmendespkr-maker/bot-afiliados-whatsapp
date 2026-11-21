import test from 'node:test';
import assert from 'node:assert/strict';
import { getLatestQr, setLatestQr } from '../src/whatsapp/webQr.js';

test('QR is unavailable until WhatsApp supplies one', () => {
  setLatestQr(null);
  assert.equal(getLatestQr(), null);
});

test('QR remains transient and can be revoked after connection', () => {
  setLatestQr('temporary-qr-test-only');
  assert.equal(getLatestQr(), 'temporary-qr-test-only');
  setLatestQr(null);
  assert.equal(getLatestQr(), null);
});

test('replacing QR invalidates previous pairing payload', () => {
  setLatestQr('old-qr-test-only');
  setLatestQr('new-qr-test-only');
  assert.equal(getLatestQr(), 'new-qr-test-only');
  setLatestQr(null);
});
