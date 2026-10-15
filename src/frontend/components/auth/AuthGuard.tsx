"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentUser, homeForRole, type Role } from "@/lib/auth";

function requiredRole(path: string): Role | null {
  if (path === "/admin" || path.startsWith("/admin/")) return "CHU_DOI_XE";
  if (path === "/dispatcher" || path.startsWith("/dispatcher/")) return "TONG_DAI";
  if (path === "/driver" || path.startsWith("/driver/")) return "TAI_XE";

  const customerPages = ["/customer", "/create-order", "/orders", "/account"];
  const customerDetails = ["/tracking/", "/payment/", "/rating/"];
  if (customerPages.some(base => path === base || path.startsWith(base + "/"))
      || customerDetails.some(base => path.startsWith(base))) return "KHACH_HANG";
  return null;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const role = requiredRole(pathname ?? "");

  useEffect(() => {
    if (!role) return;
    let active = true;

    async function checkSession() {
      try {
        const user = await currentUser();
        if (!active) return;
        if (!user) router.replace("/login?reason=session");
        else if (user.vaiTro !== role) router.replace(homeForRole[user.vaiTro]);
        else {
          setAllowed(true);
          setCheckedPath(pathname);
        }
      } catch {
        if (active) {
          setAllowed(false);
          setCheckedPath(pathname);
        }
      }
    }

    void checkSession();
    const timer = window.setInterval(() => void checkSession(), 60_000);
    const onFocus = () => void checkSession();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname, role, router]);

  if (!role) return children;
  if (checkedPath !== pathname || !allowed) return <div className="min-h-dvh p-8 text-sm text-stone-600" role="status">Đang kiểm tra phiên đăng nhập...</div>;
  return children;
}
