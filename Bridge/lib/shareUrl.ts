import pako from 'pako';
import type { GroupAssignment } from './groupSolver';

export interface SharePayload {
  /** Event ID */
  e: string;
  /** Groups: label + players */
  g: { l: string; p: string[] }[];
  /** Buff overrides (playerName_buffId keys) */
  b?: string[];
}

/**
 * Encode groups + buff overrides into a compact hash fragment.
 * Format: #share=<base64url-of-deflateRaw-json>
 */
export function encodeShareUrl(
  eventId: string,
  groups: GroupAssignment[],
  buffOverrides?: Set<string>,
): string {
  const payload: SharePayload = {
    e: eventId,
    g: groups.map(g => ({ l: g.label, p: [...g.players] })),
  };
  if (buffOverrides && buffOverrides.size > 0) {
    payload.b = Array.from(buffOverrides);
  }

  const json = JSON.stringify(payload);
  const compressed = pako.deflateRaw(new TextEncoder().encode(json));
  // base64url: standard base64 with +/= replaced for URL safety
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const url = new URL(window.location.href.split('#')[0]);
  return `${url.origin}${url.pathname}#share=${base64}`;
}

/**
 * Decode a share hash fragment. Returns null if not present or invalid.
 */
export function decodeShareHash(hash: string): SharePayload | null {
  if (!hash.startsWith('#share=')) return null;
  const base64url = hash.slice('#share='.length);
  if (!base64url) return null;

  try {
    // Restore standard base64
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const decompressed = pako.inflateRaw(bytes);
    const json = new TextDecoder().decode(decompressed);
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}
