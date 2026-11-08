// Shared API client adapter for educk-attendance-portal (:3003 -> :8083)
// Propagates W3C traceparent, X-Correlation-Id, Idempotency-Key, and in-memory JWT token
const ALLOWED_ROLES = new Set(['ACUDIENTE', 'DOCENTE', 'DIRECTIVO']);
export const SHELL_ORIGIN = new URL((typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHELL_ORIGIN) || 'http://localhost:3000').origin;
let portalAccessToken = '';
const DEFAULT_API_BASE =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? ''
    : 'http://localhost:8083';
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  DEFAULT_API_BASE;

export function setPortalAccessToken(token) {
  portalAccessToken = typeof token === 'string' ? token : '';
}

export function isTrustedShellOrigin(candidate, trustedUrl = SHELL_ORIGIN) {
  try {
    if ('Origin' in globalThis && typeof globalThis.Origin?.from === 'function') {
      let candidateOrigin;
      try { candidateOrigin = globalThis.Origin.from(candidate); } catch {
        const raw = typeof MessageEvent !== 'undefined' && candidate instanceof MessageEvent ? candidate.origin : String(candidate ?? '');
        candidateOrigin = globalThis.Origin.from(raw);
      }
      return candidateOrigin.isSameOrigin(globalThis.Origin.from(trustedUrl));
    }
    const rawUrl = typeof candidate === 'string' ? candidate : (typeof candidate?.origin === 'string' ? candidate.origin : '');
    const candidateParsed = new URL(rawUrl), trustedParsed = new URL(trustedUrl);
    return candidateParsed.origin !== 'null' && candidateParsed.origin === trustedParsed.origin;
  } catch {
    return false;
  }
}

export function extractShellContext(event, trustedUrl = SHELL_ORIGIN) {
  if (!isTrustedShellOrigin(event, trustedUrl)) return null;
  const data = event?.data;
  if (!data || data.type !== 'edutrack:context' || typeof data.token !== 'string' || !data.token) return null;
  const role = typeof data.role === 'string' ? data.role.trim().toUpperCase() : '';
  if (!ALLOWED_ROLES.has(role)) return null;
  setPortalAccessToken(data.token);
  return { token: data.token, role, user: data.user || null, view: data.view || '' };
}

function randomHex(byteLength) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: byteLength * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function getSession() {
  return portalAccessToken ? { token: portalAccessToken } : null;
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const session = getSession();
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${randomHex(8)}-${randomHex(8)}`;
  if (!headers.has('traceparent')) headers.set('traceparent', `00-${traceId}-${spanId}-01`);
  if (!headers.has('X-Correlation-Id')) headers.set('X-Correlation-Id', `corr-${idempotencyKey.slice(0, 8)}`);
  if (!headers.has('Idempotency-Key')) headers.set('Idempotency-Key', idempotencyKey);
  const resolvedUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(resolvedUrl, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
