package com.miniongvang.service;

import com.miniongvang.service.DesignV2FinanceReportService.DriverLine;
import com.miniongvang.service.DesignV2FinanceReportService.Report;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Exports the already calculated JSON report, without a second finance query. */
public final class DesignV2FinanceExcelExporter {
    public byte[] export(Report report) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            entry(zip, "[Content_Types].xml", "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                    + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
                    + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                    + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
                    + "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/></Types>");
            entry(zip, "_rels/.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                    + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            entry(zip, "xl/workbook.xml", "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
                    + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
                    + "<sheets><sheet name=\"Tai chinh V2\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            entry(zip, "xl/_rels/workbook.xml.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
                    + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>");
            StringBuilder sheet = new StringBuilder("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
                    + "<cols><col min=\"1\" max=\"2\" width=\"26\" customWidth=\"1\"/>"
                    + "<col min=\"3\" max=\"6\" width=\"25\" customWidth=\"1\"/></cols><sheetData>");
            row(sheet, 1, "Báo cáo tài chính designV2 (VND)", report.muiGio());
            row(sheet, 2, "Từ ngày", report.tuNgay(), "Trước ngày", report.denNgayKhongGom());
            row(sheet, 3, "Tài xế", "Mã tài xế", "Công ty phát sinh", "Tài xế phát sinh", "VNPay đã nhận", "Còn phải nộp cuối kỳ");
            moneyRow(sheet, 4, "Tổng", "", report.congTyPhatSinh().toPlainString(),
                    report.thuNhapTaiXePhatSinh().toPlainString(), report.daNhanVnpay().toPlainString(),
                    report.conPhaiNopCuoiKy().toPlainString());
            int index = 5;
            for (DriverLine driver : report.taiXe())
                moneyRow(sheet, index++, driver.hoTen(), driver.maTx(), driver.congTyPhatSinh().toPlainString(),
                        driver.thuNhapTaiXePhatSinh().toPlainString(), driver.daNhanVnpay().toPlainString(),
                        driver.conPhaiNopCuoiKy().toPlainString());
            sheet.append("</sheetData></worksheet>");
            entry(zip, "xl/worksheets/sheet1.xml", sheet.toString());
        }
        return output.toByteArray();
    }

    private static void row(StringBuilder sheet, int index, String... values) {
        sheet.append("<row r=\"").append(index).append("\">");
        for (int i = 0; i < values.length; i++) stringCell(sheet, index, i, values[i]);
        sheet.append("</row>");
    }

    private static void moneyRow(StringBuilder sheet, int index, String name, String id, String... values) {
        sheet.append("<row r=\"").append(index).append("\">");
        stringCell(sheet, index, 0, name);
        stringCell(sheet, index, 1, id);
        for (int i = 0; i < values.length; i++)
            sheet.append("<c r=\"").append((char) ('C' + i)).append(index)
                    .append("\"><v>").append(values[i]).append("</v></c>");
        sheet.append("</row>");
    }

    private static void stringCell(StringBuilder sheet, int row, int column, String value) {
        sheet.append("<c r=\"").append((char) ('A' + column)).append(row)
                .append("\" t=\"inlineStr\"><is><t>").append(escape(value))
                .append("</t></is></c>");
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    private static void entry(ZipOutputStream zip, String name, String xml) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        entry.setTime(0);
        zip.putNextEntry(entry);
        zip.write(("<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + xml).getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
