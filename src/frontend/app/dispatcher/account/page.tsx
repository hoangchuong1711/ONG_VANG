"use client";
import { DispatchShell } from "@/components/dispatcher/Views";
import { useDispatchSession } from "@/components/dispatcher/Session";
export default function DispatcherAccount() {
  const { user } = useDispatchSession();
  return <DispatchShell><h1 className="text-3xl font-extrabold">Tài khoản tổng đài</h1><section className="dispatch-panel space-y-3"><p>Họ tên: <strong>{user?.hoTen}</strong></p><p>Mã tài khoản: {user?.maNguoiDung}</p><p>Vai trò: {user?.vaiTro}</p></section></DispatchShell>;
}
