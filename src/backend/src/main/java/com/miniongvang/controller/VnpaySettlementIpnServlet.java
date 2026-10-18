package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/** Keep the previously registered VNPay IPN URL working with the V2 settlement ledger. */
@WebServlet("/api/payments/vnpay/ipn")
public final class VnpaySettlementIpnServlet extends HttpServlet {
    @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setHeader("Cache-Control", "no-store");
        try {
            PersistenceContext persistence = (PersistenceContext) getServletContext().getAttribute(PersistenceListener.ATTRIBUTE);
            DesignV2Servlet.handleVnpayIpn(persistence, req, resp);
        } catch (Exception failure) {
            getServletContext().log("VNPay settlement IPN error", failure);
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}
