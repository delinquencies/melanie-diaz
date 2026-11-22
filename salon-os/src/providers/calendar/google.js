// Google Calendar provider — official OAuth 2.0 + Calendar API v3 endpoints only.
// Read-only scopes: Salon OS reads busy time; Google is never the appointment database.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid", "email",
];
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export function googleConfigured(env) {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

export function buildAuthUrl(env, state) {
  const u = new URL(AUTH);
  u.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  u.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

async function post(fetchFn, url, form) {
  const res = await fetchFn(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`google_${body.error || res.status}`), { code: "google_error", status: 502 });
  return body;
}

export async function exchangeCode(env, fetchFn, code, now) {
  const t = await post(fetchFn, TOKEN, {
    code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: "authorization_code",
  });
  return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: now.getTime() + (t.expires_in || 3600) * 1000, scope: t.scope };
}

export async function ensureFresh(env, fetchFn, tokens, now) {
  if (tokens.expires_at - 60000 > now.getTime()) return { tokens, refreshed: false };
  if (!tokens.refresh_token) throw Object.assign(new Error("google_reauth_required"), { code: "google_reauth_required", status: 409 });
  const t = await post(fetchFn, TOKEN, {
    client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: tokens.refresh_token, grant_type: "refresh_token",
  });
  return { tokens: { ...tokens, access_token: t.access_token, expires_at: now.getTime() + (t.expires_in || 3600) * 1000 }, refreshed: true };
}

async function get(fetchFn, url, accessToken) {
  const res = await fetchFn(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`google_${res.status}`), { code: "google_error", status: 502 });
  return body;
}

export async function listCalendars(fetchFn, accessToken) {
  const body = await get(fetchFn, `${API}/users/me/calendarList?minAccessRole=freeBusyReader`, accessToken);
  return (body.items || []).map((c) => ({ externalId: c.id, name: c.summaryOverride || c.summary || c.id, primary: !!c.primary }));
}

/** freeBusy returns only busy intervals — no titles or descriptions are ever fetched. */
export async function freeBusy(fetchFn, accessToken, calendarIds, timeMin, timeMax) {
  const res = await fetchFn(`${API}/freeBusy`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`google_${res.status}`), { code: "google_error", status: 502 });
  const out = {};
  for (const [id, v] of Object.entries(body.calendars || {})) out[id] = (v.busy || []).map((b) => ({ start: b.start, end: b.end }));
  return out;
}
