package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.DriverEarningsService;
import com.miniongvang.service.ReportService;
import com.miniongvang.web.WebResponses;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;

@WebServlet("/api/drivers/me/earnings")
public final class DriverEarningsServlet extends HttpServlet {
    @Override protected void doGet(HttpServletRequest req,HttpServletResponse resp) throws IOException {
        try {
            var persistence=(PersistenceContext)getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            var session=req.getSession(false);
            var actor=session==null?null:new AuthService(persistence.entityManagerFactory())
                    .currentActor((String)session.getAttribute("auth.userId"));
            LocalDate from=LocalDate.parse(req.getParameter("tuNgay"));
            LocalDate to=LocalDate.parse(req.getParameter("denNgay"));
            WebResponses.json(resp,200,new DriverEarningsService(persistence.entityManagerFactory()).mine(actor,from,to));
        } catch (ReportService.DateRangeInvalid|IllegalArgumentException invalid) { WebResponses.error(resp,400,"DATE_RANGE_INVALID"); }
        catch (SecurityException forbidden) { WebResponses.error(resp,403,"FORBIDDEN"); }
        catch (RuntimeException failure) { getServletContext().log("Driver earnings failed",failure); WebResponses.error(resp,500,"INTERNAL_ERROR"); }
    }
}
