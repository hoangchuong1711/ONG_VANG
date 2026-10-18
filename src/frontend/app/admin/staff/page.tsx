"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeading } from "@/components/admin/AdminUI";
import { request } from "@/lib/api-client";
import { dateTime } from "@/lib/admin-live";

type Staff = { ma_tk: string; username: string; ho_ten: string; so_dien_thoai: string | null; email: string | null;
  vai_tro: "TONG_DAI" | "CHU_DOI_XE"; trang_thai: "HOAT_DONG" | "KHOA"; ngay_tao: string };
const fresh = () => ({ username: "", hoTen: "", soDienThoai: "", email: "", matKhau: "" });

export default function AdminStaffPage() {
  const [items, setItems] = useState<Staff[]>([]), [form, setForm] = useState(fresh()), [editing, setEditing] = useState<Staff | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Staff | null>(null), [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const load = useCallback(async () => { setLoading(true); try { setItems((await request<{items:Staff[]}>("/admin/staff")).items); setError(""); }
    catch(e) { setItems([]); setError(e instanceof Error ? e.message : "Không tải được danh sách nhân sự"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const change = (key: keyof ReturnType<typeof fresh>, value: string) => setForm((old) => ({...old,[key]:value}));
  const startEdit = (staff: Staff) => { setEditing(staff); setForm({ username:staff.username,hoTen:staff.ho_ten,soDienThoai:staff.so_dien_thoai ?? "",email:staff.email ?? "",matKhau:"" }); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const payload = { username:form.username,hoTen:form.hoTen,soDienThoai:form.soDienThoai || null,email:form.email || null,...(!editing ? {matKhau:form.matKhau} : {}) };
      if (editing) await request(`/admin/staff/${editing.ma_tk}`,"PATCH",payload); else await request("/admin/staff","POST",payload);
      setNotice(editing ? "Đã cập nhật tài khoản tổng đài." : "Đã tạo tài khoản tổng đài."); setEditing(null); setForm(fresh()); await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Không lưu được tài khoản"); } finally { setBusy(false); } };
  const setStatus = async (staff: Staff) => { setBusy(true); setError(""); setNotice(""); try { await request(`/admin/staff/${staff.ma_tk}/status`,"POST",{hanhDong:staff.trang_thai === "HOAT_DONG" ? "KHOA" : "MO_KHOA"});
      setNotice(staff.trang_thai === "HOAT_DONG" ? "Đã khóa tài khoản và thu hồi các phiên đăng nhập." : "Đã mở khóa tài khoản."); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : "Không đổi được trạng thái"); } finally { setBusy(false); } };
  const resetPassword = async (event: React.FormEvent) => { event.preventDefault(); if (!passwordTarget) return; setBusy(true); setError(""); setNotice("");
    try { await request(`/admin/staff/${passwordTarget.ma_tk}/password`,"POST",{matKhau:newPassword}); setNotice("Đã cấp mật khẩu mới; phiên đăng nhập cũ của nhân viên đã bị thu hồi."); setPasswordTarget(null); setNewPassword(""); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : "Không cấp lại được mật khẩu"); } finally { setBusy(false); } };

  return <>
    <AdminHeading eyebrow="Hệ thống" title="Nhân sự và quyền" description="Quản lý tài khoản tổng đài. Chủ đội xe chỉ được xem và không thể tự khóa qua màn này." actions={<button className="admin-button" onClick={() => void load()}>Làm mới</button>} />
    {error && <p role="alert" className="admin-feedback error">{error}</p>}{notice && <p role="status" className="admin-feedback">{notice}</p>}
    <section className="admin-panel admin-staff-form"><div className="admin-section-head"><div><h2>{editing ? "Sửa nhân viên tổng đài" : "Thêm nhân viên tổng đài"}</h2><p>Vai trò được cấp cố định là TONG_DAI. Mật khẩu được lưu dưới dạng BCrypt.</p></div></div>
      <form className="admin-form-body" onSubmit={submit}><div className="admin-form-grid">
        <div className="admin-field"><label>Tên đăng nhập</label><input required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" disabled={Boolean(editing)} value={form.username} onChange={(e)=>change("username",e.target.value.toLowerCase())} /></div>
        <div className="admin-field"><label>Họ tên</label><input required maxLength={100} value={form.hoTen} onChange={(e)=>change("hoTen",e.target.value)} /></div>
        <div className="admin-field"><label>Số điện thoại</label><input type="tel" pattern="0[0-9]{9}" title="Nhập 10 chữ số, bắt đầu bằng 0" value={form.soDienThoai} onChange={(e)=>change("soDienThoai",e.target.value)} /></div>
        <div className="admin-field"><label>Email</label><input type="email" maxLength={150} value={form.email} onChange={(e)=>change("email",e.target.value)} /></div>
        {!editing && <div className="admin-field"><label>Mật khẩu khởi tạo (ít nhất 8 ký tự)</label><input required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={form.matKhau} onChange={(e)=>change("matKhau",e.target.value)} /></div>}
      </div><div className="admin-inline-actions"><button className="admin-button primary" disabled={busy}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài khoản"}</button>{editing && <button type="button" className="admin-button" onClick={()=>{setEditing(null);setForm(fresh());}}>Hủy sửa</button>}</div></form>
    </section>
    <section className="admin-panel"><div className="admin-result-bar"><strong>{loading ? "Đang tải..." : `${items.length} tài khoản`}</strong><span>Chủ đội xe đang hoạt động: {items.filter(x=>x.vai_tro==="CHU_DOI_XE" && x.trang_thai==="HOAT_DONG").length}</span></div>
      {items.length > 0 && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Liên hệ</th><th>Trạng thái</th><th>Tạo lúc</th><th>Thao tác</th></tr></thead><tbody>{items.map((staff)=><tr key={staff.ma_tk}>
        <td><strong>{staff.ho_ten}</strong><small>{staff.username}</small></td><td>{staff.vai_tro === "CHU_DOI_XE" ? "Chủ đội xe" : "Tổng đài"}</td>
        <td>{staff.so_dien_thoai ?? "—"}<small>{staff.email ?? ""}</small></td><td>{staff.trang_thai === "HOAT_DONG" ? "Hoạt động" : "Đã khóa"}</td><td>{dateTime(staff.ngay_tao)}</td>
        <td>{staff.vai_tro === "TONG_DAI" ? <div className="admin-inline-actions"><button className="admin-text-button" onClick={()=>startEdit(staff)}>Sửa</button><button className="admin-text-button" onClick={()=>{setPasswordTarget(staff);setNewPassword("");}}>Cấp mật khẩu</button><button className="admin-text-button danger" disabled={busy} onClick={()=>void setStatus(staff)}>{staff.trang_thai === "HOAT_DONG" ? "Khóa" : "Mở khóa"}</button></div> : <small>Không thể thay đổi quyền chủ đội xe tại đây</small>}</td>
      </tr>)}</tbody></table></div>}
      {!loading && !items.length && <div className="admin-empty"><strong>Chưa có nhân sự</strong><p>Tài khoản sẽ hiển thị sau khi tạo.</p></div>}
    </section>
    {passwordTarget && <div className="admin-modal-backdrop" role="presentation"><form className="admin-modal" onSubmit={resetPassword}><h2>Cấp mật khẩu mới</h2><p>Nhân viên {passwordTarget.ho_ten} sẽ phải đăng nhập lại bằng mật khẩu mới.</p><div className="admin-field"><label>Mật khẩu mới</label><input autoFocus required minLength={8} maxLength={72} type="password" autoComplete="new-password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} /></div><div className="admin-modal-actions"><button type="button" className="admin-button" onClick={()=>setPasswordTarget(null)}>Hủy</button><button className="admin-button primary" disabled={busy}>Cấp mật khẩu</button></div></form></div>}
  </>;
}
