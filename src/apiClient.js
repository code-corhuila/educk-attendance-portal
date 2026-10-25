// Shared API client adapter for educk-attendance-portal (:3003 -> :8083)
// Propagates W3C traceparent, X-Correlation-Id, Idempotency-Key, and JWT session token
const SESSION_KEY = 'edutrack_session';
const DEFAULT_API_BASE =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? ''
    : 'http://localhost:8083';
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  DEFAULT_API_BASE;
function randomHex(byteLength) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: byteLength * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
export function getSession() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
    if (raw) return JSON.parse(raw);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('edutrack_token') : null;
    return token ? { token } : null;
  } catch {
    return null;
  }
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
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    return await fetch(resolvedUrl, { ...options, headers, signal: controller.signal });
  } catch {
    // Resilient local buffer fallback when educk-attendance-api (:8083) container is offline
    if (typeof localStorage !== 'undefined' && options.body) {
      try {
        const queue = JSON.parse(localStorage.getItem('edutrack_attendance_buffer') || '[]');
        queue.push({ url: resolvedUrl, body: JSON.parse(options.body), traceId, timestamp: new Date().toISOString() });
        localStorage.setItem('edutrack_attendance_buffer', JSON.stringify(queue.slice(-50)));
      } catch { /* ignore storage quota errors */ }
    }
    return new Response(JSON.stringify({ status: 'BUFFERED_LOCALLY', traceId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    clearTimeout(timer);
  }
}
