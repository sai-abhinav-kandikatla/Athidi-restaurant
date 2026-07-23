"use client";

let csrfToken: string | null = null;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  let response = await send(path, init, mutating);
  if (mutating && response.status === 403) {
    const payload = await safeJson(response);
    if (payload?.error?.code === "csrf_rejected") {
      csrfToken = null;
      response = await send(path, init, true);
    } else {
      throw apiClientError(response.status, payload);
    }
  }
  const payload = await safeJson(response);
  if (!response.ok) throw apiClientError(response.status, payload);
  return payload?.data as T;
}

async function send(path: string, init: RequestInit, mutating: boolean) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (mutating) {
    const token = await getCsrfToken();
    if (token) headers.set("x-csrf-token", token);
  }
  return fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/v1/security/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await safeJson(response);
  if (!response.ok || typeof payload?.data?.token !== "string") {
    throw new ApiClientError("The security token could not be created.", response.status, "csrf_unavailable");
  }
  csrfToken = payload.data.token;
  return csrfToken;
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function apiClientError(status: number, payload: any) {
  return new ApiClientError(
    payload?.error?.message ?? "The request could not be completed.",
    status,
    payload?.error?.code ?? "request_failed",
  );
}

