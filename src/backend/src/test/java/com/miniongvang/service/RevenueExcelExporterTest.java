package com.miniongvang.service;
import com.miniongvang.dto.report.ReportDtos.Bucket;
import com.miniongvang.dto.report.ReportDtos.Metrics;
import com.miniongvang.dto.report.ReportDtos.Report;

import org.junit.jupiter.api.Test;
import java.io.*;
import java.util.*;
import java.util.zip.*;
import javax.xml.parsers.DocumentBuilderFactory;
import static org.junit.jupiter.api.Assertions.*;

class RevenueExcelExporterTest {
    private static Report sample() {
        var m=new Metrics("50000.00","55000.00","5000.00","0.00",1,0);
        return new Report("2026-10-05","2026-10-06","Asia/Ho_Chi_Minh",com.miniongvang.dto.report.ReportDtos.Group.NGAY,m,
                List.of(new Bucket("2026-10-04T17:00:00Z","2026-10-05T17:00:00Z",m)));
    }
    @Test void workbookContainsActualNumbersAndSameFilterAndMetricsAsReport() throws Exception {
        var report=sample();var bytes=new RevenueExcelExporter().export(report);
        Map<String,byte[]> parts=new HashMap<>();
        try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            for(ZipEntry e;(e=zip.getNextEntry())!=null;) parts.put(e.getName(),zip.readAllBytes());
        }
        assertEquals(6,parts.size());assertTrue(parts.containsKey("[Content_Types].xml"));
        var factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        for(var xml:parts.values()) factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        var sheet=factory.newDocumentBuilder().parse(new ByteArrayInputStream(parts.get("xl/worksheets/sheet1.xml")));
        var cells=sheet.getElementsByTagNameNS("*","c");Map<String,String> values=new HashMap<>();
        for(int i=0;i<cells.getLength();i++){var c=(org.w3c.dom.Element)cells.item(i);values.put(c.getAttribute("r"),c.getTextContent());}
        assertEquals(report.tuNgay(),values.get("B2"));assertEquals(report.denNgay(),values.get("D2"));
        assertEquals(report.tong().giaTriDonHoanTat(),values.get("C5"));assertEquals(report.tong().tienThucThu(),values.get("D5"));
        assertEquals(report.tong().tienThuChuaPhanBo(),values.get("E5"));assertEquals(report.tong().cuocConPhaiThuCuoiKy(),values.get("F5"));
        assertEquals(report.items().getFirst().chiTieu().giaTriDonHoanTat(),values.get("C6"));
        assertEquals("1",values.get("G5"));
    }
    @Test void outputFailureDoesNotMutateReportAndExportCanBeRetried() throws Exception {
        var report=sample();var exporter=new RevenueExcelExporter();byte[] before=exporter.export(report);
        assertThrows(IOException.class,()->exporter.write(report,new OutputStream(){@Override public void write(int b)throws IOException{throw new IOException("Injected export failure");}}));
        assertEquals(sample(),report);assertArrayEquals(before,exporter.export(report));
    }
}
