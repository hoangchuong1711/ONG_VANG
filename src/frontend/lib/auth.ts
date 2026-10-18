export type Role = "KHACH_HANG" | "TAI_XE" | "TONG_DAI" | "CHU_DOI_XE";

export interface AuthUser {
  maNguoiDung: string;
  hoTen: string;
  vaiTro: Role;
  maKh?: string | null;
  maTx?: string | null;
}

export const homeForRole: Record<Role, string> = {
  KHACH_HANG: "/customer",
  TAI_XE: "/driver",
  TONG_DAI: "/dispatcher",
  CHU_DOI_XE: "/admin",
};

let csrfToken: string | null = null;

export class AuthError extends Error {
  constructor(public code: string, public status: number) {
    super(code);
  }
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function csrf(refresh = false): Promise<string> {
  if (csrfToken && !refresh) return csrfToken;

  const response = await fetch("/api/v2/auth/csrf", { credentials: "same-origin", cache: "no-store" });
  const body = await readJson(response);
  if (!response.ok || typeof body?.token !== "string") {
    throw new AuthError(body?.code ?? "SERVER_ERROR", response.status);
  }
  const token: string = body.token;
  csrfToken = token;
  return token;
}

async function post<T>(path: string, body?: object): Promise<T> {
  const token = await csrf();
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body ?? {}),
  });
  const data = response.status === 204 ? null : await readJson(response);

  if (!response.ok) {
    if (response.status === 401 || data?.code === "CSRF_INVALID") csrfToken = null;
    throw new AuthError(data?.code ?? data?.error?.code ?? "SERVER_ERROR", response.status);
  }
  return data as T;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const user = await post<AuthUser>("/api/v2/auth/login", { username, password });
  await csrf(true); // Login rotates the session and token.
  return user;
}

export async function register(hoTen: string, soDienThoai: string, email: string, password: string): Promise<AuthUser> {
  return post<AuthUser>("/api/v2/auth/register", { username: soDienThoai, hoTen, soDienThoai, email, password });
}

export async function currentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/v2/auth/me", { credentials: "same-origin", cache: "no-store" });
  if (response.status === 401 || response.status === 403) {
    csrfToken = null;
    return null;
  }
  const data = await readJson(response);
  if (!response.ok) throw new AuthError(data?.code ?? "SERVER_ERROR", response.status);
  return data as AuthUser;
}

export async function logout(): Promise<void> {
  try {
    await post<void>("/api/v2/auth/logout");
  } finally {
    csrfToken = null;
  }
}
