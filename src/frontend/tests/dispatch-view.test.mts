import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderForView } from '../lib/dispatch-view.ts';
import type { OrderDetail } from '../lib/live-orders.ts';

function detail(): OrderDetail {
  return {
    maDon: 'order-a', thoiGianTao: '2026-10-22T08:00:00Z', diemLayHang: 'A', diemGiaoHang: 'B',
    tenNguoiNhan: 'Recipient', sdtNguoiNhan: '0900000001', quangDuongKm: '2',
    trangThai: 'DANG_GIAO', maKh: 'customer', maTkTao: 'account', benThanhToan: 'NGUOI_DAT',
    nguonLoTrinh: 'GOONG', phuongThucThanhToan: 'TIEN_MAT', kienHang: [],
    thanhToan: { trangThai: 'CHUA_XAC_NHAN', soTienConPhaiThu: '0', canDoiSoat: false },
    cuoc: { cuocGoc: '20000', cuocKm: '10000', cuocKhoiLuong: '0', tongKhoiLuongKg: '1',
      tienPhuThu: '5000', tienGiamGia: '0', tongCuoc: '35000', maBieuPhi: 'fare', phienBanBieuPhi: 1, phuThu: [] },
    nhatKy: [],
  };
}

test('order detail displays latest reported incident without discarding history', () => {
  const order = detail();
  order.nhatKy = [
    { thuTu: 3, loaiSuKien: 'SU_CO', trangThaiSau: 'DANG_GIAO', thoiGian: '2026-10-22T09:00:00Z', ghiChu: 'Latest report' },
    { thuTu: 1, loaiSuKien: 'SU_CO', trangThaiSau: 'DANG_GIAO', thoiGian: '2026-10-22T08:00:00Z', ghiChu: 'Earlier report' },
    { thuTu: 4, loaiSuKien: 'DEN_DIEM_NHAN', trangThaiSau: 'DANG_GIAO', thoiGian: '2026-10-22T10:00:00Z' },
  ];
  assert.equal(orderForView(order, []).incident?.note, 'Latest report');
  assert.equal(order.nhatKy.length, 3);
  assert.equal(order.nhatKy[0].thuTu, 3);
});

test('orders without incident logs do not show a fabricated alert', () => {
  assert.equal(orderForView(detail(), []).incident, undefined);
});
