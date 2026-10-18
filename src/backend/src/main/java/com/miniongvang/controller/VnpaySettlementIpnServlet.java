package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import com.miniongvang.service.DesignV2PaymentService;
import com.miniongvang.web.WebResponses;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/** Keep the previously registered VNPay IPN URL working with the V2 settlement ledger. */
@WebServlet("/api/payments/vnpay/ipn")
public final class VnpaySettlementIpnServlet extends HttpServlet {
    private final DesignV2PaymentService payments = new DesignV2PaymentService();

    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        try {
            PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            WebResponses.json(resp, 200, payments.handleIpn(persistence, req.getQueryString()));
        } catch (Exception failure) {
            getServletContext().log("VNPay settlement IPN error", failure);
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}
