package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.service.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

@WebServlet(urlPatterns={"/api/reports/revenue","/api/reports/revenue/export"})
public final class ReportServlet extends HttpServlet {
    private static final ObjectMapper JSON=new ObjectMapper();
    @Override protected void doGet(HttpServletRequest req,HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control","no-store");
        boolean export=req.getServletPath().endsWith("/export");
        try {
            var persistence=(PersistenceContext)getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            var session=req.getSession(false);
            String id=session==null?null:(String)session.getAttribute("auth.userId");
            var actor=id==null?null:new AuthService(persistence.entityManagerFactory()).current(id);
            LocalDate from=date(req,"tuNgay"),to=date(req,"denNgay");
            String group=parameter(req,"nhomTheo",false);
            var report=new ReportService(persistence.entityManagerFactory()).revenue(actor,from,to,
                    group==null?ReportService.Group.NGAY:ReportService.Group.valueOf(group));
            if(export) {
                byte[] bytes;
                try { bytes=new RevenueExcelExporter().export(report); }
                catch(IOException|RuntimeException failure) {
                    getServletContext().log("Revenue export failed",failure); error(resp,500,"EXPORT_FAILED"); return;
                }
                resp.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                resp.setHeader("Content-Disposition","attachment; filename=\"revenue-"+from+"-"+to+".xlsx\"");
                resp.setContentLength(bytes.length);resp.getOutputStream().write(bytes);
            } else { resp.setContentType("application/json;charset=UTF-8");JSON.writeValue(resp.getOutputStream(),report); }
        } catch(ReportService.DateRangeInvalid invalid) { error(resp,400,"DATE_RANGE_INVALID"); }
        catch(IllegalArgumentException invalid) { error(resp,400,"VALIDATION_ERROR"); }
        catch(SecurityException forbidden) { error(resp,403,"FORBIDDEN"); }
        catch(RuntimeException failure) { getServletContext().log("Revenue report failed",failure);if(!resp.isCommitted()) error(resp,500,"INTERNAL_ERROR"); }
    }
    private static LocalDate date(HttpServletRequest req,String name) {
        String value=parameter(req,name,true);
        try { if(!value.matches("\\d{4}-\\d{2}-\\d{2}")) throw new ReportService.DateRangeInvalid();return LocalDate.parse(value); }
        catch(DateTimeParseException invalid) { throw new ReportService.DateRangeInvalid(); }
    }
    private static String parameter(HttpServletRequest req,String name,boolean required) {
        String[] values=req.getParameterValues(name);
        if(values==null) { if(required) throw new IllegalArgumentException("Missing query parameter");return null; }
        if(values.length!=1 || values[0].isBlank()) throw new IllegalArgumentException("Invalid query parameter");
        return values[0];
    }
    private static void error(HttpServletResponse resp,int status,String code) throws IOException {
        resp.setStatus(status);resp.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(resp.getOutputStream(),new Error(code,"Không thể thực hiện yêu cầu: "+code,new Object[0],UUID.randomUUID().toString()));
    }
    private record Error(String code,String message,Object[] fieldErrors,String traceId) {}
}
