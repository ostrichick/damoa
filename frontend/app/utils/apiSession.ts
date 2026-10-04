const SESSION_KEY = "damoa_session_token";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getOrCreateSessionToken(): string {
  if (typeof window === "undefined") {
    throw new Error("Session token is only available in the browser.");
  }

  const existing = localStorage.getItem(SESSION_KEY);
  if (existing && isUuid(existing)) {
    return existing;
  }

  const token = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, token);

  // Pre-auth profile caches cannot safely be associated with the new session.
  localStorage.removeItem("damoa_saved_profiles");
  localStorage.removeItem("damoa_saved_profile");
  return token;
}

export function authHeaders(initial?: HeadersInit): Headers {
  const headers = new Headers(initial);
  headers.set("Authorization", `Bearer ${getOrCreateSessionToken()}`);
  return headers;
}
