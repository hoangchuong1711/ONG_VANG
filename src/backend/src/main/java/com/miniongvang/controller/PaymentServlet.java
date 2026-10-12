package com.miniongvang.controller;

import com.miniongvang.web.PaymentEndpoint;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebServlet("/api/payments/*")
public final class PaymentServlet extends HttpServlet {
    @Override protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        PaymentEndpoint.handle(request, response);
    }

    @Override protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        PaymentEndpoint.handle(request, response);
    }
}
