// Thin wrapper around fetch() that automatically attaches the current
// user's JWT (if any) as an Authorization header, and calls a registered
// "unauthorized" handler whenever the backend returns 401 — used by
// App.jsx to log the user out and bounce them back to the login page the
// moment their session expires or is otherwise rejected.

let authToken = null;
let unauthorizedHandler = () => {};

export function setAuthToken(token) {
  authToken = token;
}

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Don't fire on the auth endpoints themselves (e.g. a genuinely wrong
    // login password also returns 401, which should just show an error on
    // the login form, not trigger a "your session expired" logout loop).
    if (!url.includes("/auth/login") && !url.includes("/auth/register") && !url.includes("/auth/google")) {
      unauthorizedHandler();
    }
  }

  return res;
}