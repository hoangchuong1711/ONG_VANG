package com.miniongvang.dto.report;

import java.util.List;
import com.miniongvang.entity.enums.*;

/** JSON contract types for report endpoints. */
public final class ReportDtos {
    private ReportDtos() {}

    public record Metrics(String giaTriDonHoanTat,String tienThucThu,String tienThuChuaPhanBo,
                              String cuocConPhaiThuCuoiKy,long soDonHoanTat,long soDonHuy) {}

    public record Bucket(String batDau,String ketThuc,Metrics chiTieu) {}

    public enum Group { NGAY, TUAN, THANG }

    public record Report(String tuNgay,String denNgay,String muiGio,Group nhomTheo,Metrics tong,List<Bucket> items) {}
}
