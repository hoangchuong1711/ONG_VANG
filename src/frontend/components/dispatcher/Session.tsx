"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, dispatchApi, errorMessage, type User } from "@/lib/api/dispatch";
const Context = createContext<{ user: User | null; setUser: (user: User | null) => void; logout: () => Promise<void> } | null>(null);
export function useDispatchSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Dispatcher session provider missing");
  return value;
}
export function DispatchSession({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [failure, setFailure] = useState<unknown>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    dispatchApi.me(controller.signal).then((current) => {
      if (!controller.signal.aborted) { setUser(current); setFailure(undefined); setChecked(true); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) { setUser(null); setFailure(error); setChecked(true); }
    });
    const authError = (event: Event) => {
      setUser(null); setFailure((event as CustomEvent).detail); setChecked(true);
    };
    window.addEventListener("dispatch-auth-error", authError);
    return () => { controller.abort(); window.removeEventListener("dispatch-auth-error", authError); };
  }, [retry]);
  async function logout() {
    await dispatchApi.logout();
    setUser(null); setFailure(undefined); router.replace("/login?role=dispatcher");
  }
  const signIn = pathname === "/dispatcher/sign-in";
  const authFailure = failure instanceof ApiError && ["AUTH_REQUIRED", "SESSION_EXPIRED", "FORBIDDEN"].includes(failure.code);
  return <Context.Provider value={{ user, setUser, logout }}>
    {!checked ? <p role="status" className="p-8">Đang kiểm tra phiên đăng nhập…</p> :
      signIn || user?.vaiTro === "TONG_DAI" ? children :
      <main className="max-w-xl mx-auto my-12 p-6 rounded-2xl border border-stone-200 bg-white space-y-4">
        <h1 className="text-2xl font-bold">{user || (failure instanceof ApiError && failure.code === "FORBIDDEN") ? "Không có quyền điều phối" : "Đăng nhập điều phối"}</h1>
        <p role="alert">{user ? "Khu vực này dành cho tài khoản tổng đài." : failure ? errorMessage(failure) : "Vui lòng đăng nhập tài khoản tổng đài."}</p>
        {!user && failure && !authFailure ? <button className="dispatch-button" onClick={() => setRetry((value) => value + 1)}>Thử kết nối lại</button> :
          <Link className="dispatch-button inline-block" href="/login?role=dispatcher">Đăng nhập tổng đài</Link>}
      </main>}
  </Context.Provider>;
}
