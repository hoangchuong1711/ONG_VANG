package com.miniongvang.controller;

import com.miniongvang.config.PersistenceContext;
import com.miniongvang.config.PersistenceListener;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

/** Servlet adapter; API mapping and responses are handled by DesignV2ApiController. */
@WebServlet("/api/v2/*")
public final class DesignV2Servlet extends HttpServlet {
    private final DesignV2ApiController api = new DesignV2ApiController();

    @Override protected void service(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        PersistenceContext persistence = (PersistenceContext) getServletContext()
                .getAttribute(PersistenceListener.ATTRIBUTE);
        api.handle(persistence, getServletContext(), req, resp);
    }
}
