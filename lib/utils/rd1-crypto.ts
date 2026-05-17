/**
 * Encryption/decryption utilities for rd1 proxy URL obfuscation.
 * Hides host:port patterns from Cloudflare inspection using XOR + base64url encoding.
 * Optimized for Edge Runtime (no Node.js APIs).
 */

// Version prefix allows future algorithm upgrades without breaking old URLs
const VERSION = 'a';

// Secret key for XOR cipher (longer key = harder to brute force)
const SECRET_KEY = 'rd1-proxy-xf-2026-key';

/**
 * Convert byte array to URL-safe base64 string (no +, /, or = padding)
 */
function bytesToBase64Url(bytes: number[]): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert URL-safe base64 string back to byte array
 */
function base64UrlToBytes(encoded: string): number[] {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Array.from(new Uint8Array(atob(padded).split('').map(c => c.charCodeAt(0))));
}

export function encryptPath(path: string): string {
  // XOR each byte with rotating key
  const xored: number[] = [];
  for (let i = 0; i < path.length; i++) {
    xored.push(path.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }

  // Prepend version byte and encode to base64url
  const versionByte = VERSION.charCodeAt(0);
  return bytesToBase64Url([versionByte, ...xored]);
}

export function decryptPath(encoded: string): string {
  // Decode base64url to bytes
  const bytes = base64UrlToBytes(encoded);

  // Verify and strip version prefix
  if (String.fromCharCode(bytes[0]) !== VERSION) {
    throw new Error(`Unsupported encryption version: ${String.fromCharCode(bytes[0])}`);
  }
  const dataBytes = bytes.slice(1);

  // XOR to decrypt
  let result = '';
  for (let i = 0; i < dataBytes.length; i++) {
    result += String.fromCharCode(dataBytes[i] ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }
  return result;
}
