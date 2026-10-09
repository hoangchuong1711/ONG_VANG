package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.entity.enums.*;
import com.miniongvang.service.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebServlet(urlPatterns={"/api/orders/*","/api/drivers"})
public final class DispatchServlet extends HttpServlet {
    private static final ObjectMapper JSON=new ObjectMapper();
    @Override protected void doGet(HttpServletRequest req,HttpServletResponse resp) throws IOException { handle(req,resp); }
    @Override protected void doPost(HttpServletRequest req,HttpServletResponse resp) throws IOException { handle(req,resp); }

    static void handle(HttpServletRequest req,HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control","no-store");
        try {
            var persistence=(PersistenceContext)req.getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            var service=new DispatchService(persistence.entityManagerFactory());
            HttpSession session=req.getSession(false);
            String user=session==null?null:(String)session.getAttribute("auth.userId");
            var actor=user==null?null:new AuthService(persistence.entityManagerFactory()).current(user);
            String path=req.getServletPath()+(req.getPathInfo()==null?"":req.getPathInfo());
            // HttpServlet routes HEAD through doGet. HEAD must never reach writes
            // (the security filter intentionally exempts safe methods from CSRF).
            boolean get="GET".equals(req.getMethod()) || "HEAD".equals(req.getMethod());
            boolean post="POST".equals(req.getMethod());
            Object result;
            int responseStatus=200;
            if (get && path.equals("/api/orders")) {
                result=service.orders(actor,integer(req,"page",0),integer(req,"size",20),
                        date(req,"tuNgay"),date(req,"denNgay"),enumeration(req,"trangThai",OrderStatus.class));
            } else if (get && path.equals("/api/drivers")) {
                result=service.drivers(actor,integer(req,"page",0),integer(req,"size",20),
                        enumeration(req,"trangThaiHoatDong",DriverStatus.class),bool(req,"dangBanChuyen"));
            } else {
                String[] parts=path.split("/",-1);
                if (parts.length<4 || !parts[1].equals("api") || !parts[2].equals("orders"))
                    throw new NoSuchElementException("Endpoint not found");
                String id=parts[3];
                if (get && parts.length==4) result=service.order(actor,id);
                else if (get && parts.length==5 && parts[4].equals("events"))
                    result=service.events(actor,id,integer(req,"page",0),integer(req,"size",20));
                else if (post && parts.length==5 && parts[4].equals("transitions"))
                    result=service.transition(actor,id,OrderStatus.valueOf(body(req,"trangThai")));
                else if (post && parts.length==5 && parts[4].equals("incidents")) {
                    JsonNode incident=bodyFields(req,"loaiSuCo","lyDo");
                    result=service.incident(actor,id,IncidentType.valueOf(incident.get("loaiSuCo").textValue()),incident.get("lyDo").textValue());
                    responseStatus=201;
                }
                else if (get && parts.length==5 && parts[4].equals("driver-suggestions"))
                    result=service.suggestions(actor,id,integer(req,"page",0),integer(req,"size",20));
                else if (post && parts.length==5 && parts[4].equals("assignments"))
                    result=service.assign(actor,id,body(req,"maTx"));
                else if (post && parts.length==5 && parts[4].equals("reject"))
                    result=service.reject(actor,id,body(req,"lyDo"));
                else throw new NoSuchElementException("Endpoint not found");
            }
            send(resp,responseStatus,result);
        } catch (InvalidJson invalid) { error(resp,400,"JSON_INVALID"); }
        catch (DispatchService.DateRangeInvalid invalid) { error(resp,400,"DATE_RANGE_INVALID"); }
        catch (IllegalArgumentException invalid) { error(resp,400,"VALIDATION_ERROR"); }
        catch (SecurityException forbidden) { error(resp,403,"FORBIDDEN"); }
        catch (NoSuchElementException missing) { error(resp,404,"RESOURCE_NOT_FOUND"); }
        catch (DispatchService.Conflict conflict) { error(resp,409,conflict.getMessage()); }
        catch (RuntimeException failure) {
            req.getServletContext().log("Dispatch request failed",failure);
            if (!resp.isCommitted()) error(resp,500,"INTERNAL_ERROR");
        }
    }
    private static String parameter(HttpServletRequest req,String name) {
        String[] values=req.getParameterValues(name);
        if (values==null) return null;
        if (values.length!=1 || values[0].isBlank()) throw new IllegalArgumentException("Invalid query parameter");
        return values[0];
    }
    private static int integer(HttpServletRequest req,String name,int fallback) {
        String value=parameter(req,name); return value==null?fallback:Integer.parseInt(value);
    }
    private static Boolean bool(HttpServletRequest req,String name) {
        String value=parameter(req,name);
        if (value==null) return null;
        if (!value.equals("true") && !value.equals("false")) throw new IllegalArgumentException("Invalid boolean");
        return Boolean.valueOf(value);
    }
    private static LocalDate date(HttpServletRequest req,String name) {
        String value=parameter(req,name);
        try { return value==null?null:LocalDate.parse(value); }
        catch (java.time.format.DateTimeParseException invalid) { throw new DispatchService.DateRangeInvalid(); }
    }
    private static <T extends Enum<T>> T enumeration(HttpServletRequest req,String name,Class<T> type) {
        String value=parameter(req,name); return value==null?null:Enum.valueOf(type,value);
    }
    private static String body(HttpServletRequest req,String field) throws IOException {
        return bodyFields(req,field).get(field).textValue();
    }
    private static JsonNode bodyFields(HttpServletRequest req,String... fields) throws IOException {
        if (req.getContentType()==null || !req.getContentType().toLowerCase(Locale.ROOT).startsWith("application/json"))
            throw new InvalidJson();
        JsonNode body;
        try { body=JSON.readTree(req.getInputStream()); }
        catch (Exception invalid) { throw new InvalidJson(); }
        if (body==null || !body.isObject()) throw new InvalidJson();
        if (body.size()!=fields.length)
            throw new IllegalArgumentException("Invalid request fields");
        for (String field:fields) if (!body.has(field) || !body.get(field).isTextual())
            throw new IllegalArgumentException("Invalid request fields");
        return body;
    }
    private static void send(HttpServletResponse resp,int status,Object body) throws IOException {
        resp.setStatus(status); resp.setContentType("application/json;charset=UTF-8");
        JSON.writeValue(resp.getOutputStream(),body);
    }
    private static void error(HttpServletResponse resp,int status,String code) throws IOException {
        send(resp,status,new ErrorDto(code,"Không thể thực hiện yêu cầu: "+code,new Object[0],UUID.randomUUID().toString()));
    }
    private record ErrorDto(String code,String message,Object[] fieldErrors,String traceId) {}
    private static final class InvalidJson extends RuntimeException {}
}
