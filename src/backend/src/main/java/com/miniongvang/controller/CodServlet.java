package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.integration.VnpayGateway;
import com.miniongvang.service.AuthService;
import com.miniongvang.service.CodSettlementService;
import com.miniongvang.service.PaymentService;
import com.miniongvang.web.WebResponses;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.NoSuchElementException;

@WebServlet("/api/cod/*")
public final class CodServlet extends HttpServlet {
    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException { handle(req, resp); }
    @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException { handle(req, resp); }
    private void handle(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            var persistence = (PersistenceContext)getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            var session = req.getSession(false);
            var actor = session == null ? null : new AuthService(persistence.entityManagerFactory())
                    .currentActor((String)session.getAttribute("auth.userId"));
            var service = new CodSettlementService(persistence.entityManagerFactory(), VnpayGateway.fromEnvironment());
            String path = req.getServletPath() + (req.getPathInfo() == null ? "" : req.getPathInfo());
            String[] p = path.split("/");
            if ("GET".equals(req.getMethod()) && path.equals("/api/cod/drivers"))
                WebResponses.json(resp, 200, service.drivers(actor));
            else if ("POST".equals(req.getMethod()) && p.length == 6 && p[3].equals("drivers") && p[5].equals("settlements"))
                WebResponses.json(resp, 201, service.create(actor, p[4], req.getHeader("Idempotency-Key"), req.getRemoteAddr()));
            else if ("GET".equals(req.getMethod()) && p.length == 5 && p[3].equals("settlements"))
                WebResponses.json(resp, 200, service.get(actor, p[4]));
            else if ("POST".equals(req.getMethod()) && p.length == 6 && p[3].equals("settlements") && p[5].equals("reconcile"))
                WebResponses.json(resp, 200, service.reconcile(actor, p[4]));
            else throw new NoSuchElementException();
        } catch (PaymentService.Conflict conflict) { WebResponses.error(resp,409,conflict.getMessage()); }
        catch (NoSuchElementException missing) { WebResponses.error(resp,404,"RESOURCE_NOT_FOUND"); }
        catch (IllegalArgumentException invalid) { WebResponses.error(resp,400,"VALIDATION_ERROR"); }
        catch (SecurityException forbidden) { WebResponses.error(resp,403,"FORBIDDEN"); }
        catch (IllegalStateException unavailable) {
            if ("VNPAY_CONFIG_MISSING".equals(unavailable.getMessage())) WebResponses.error(resp,503,"VNPAY_CONFIG_MISSING");
            else { getServletContext().log("COD request failed",unavailable); WebResponses.error(resp,500,"INTERNAL_ERROR"); }
        }
        catch (RuntimeException failure) { getServletContext().log("COD request failed",failure); WebResponses.error(resp,500,"INTERNAL_ERROR"); }
    }
}
