package com.miniongvang.config;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import com.miniongvang.service.DesignV2PaymentService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@WebListener
public class PersistenceListener implements ServletContextListener {
    public static final String ATTRIBUTE = PersistenceContext.class.getName();
    private ScheduledExecutorService reconciliationWorker;
    private final DesignV2PaymentService paymentService = new DesignV2PaymentService();

    @Override public void contextInitialized(ServletContextEvent event) {
        event.getServletContext().getSessionCookieConfig().setHttpOnly(true);
        event.getServletContext().getSessionCookieConfig().setPath("/");
        event.getServletContext().setSessionTrackingModes(java.util.Set.of(jakarta.servlet.SessionTrackingMode.COOKIE));
        PersistenceContext persistence = PersistenceContext.start(
                System.getenv("DB_URL"), System.getenv("DB_USER"), System.getenv("DB_PASSWORD"));
        try {
            event.getServletContext().setAttribute(RouteConfiguration.ATTRIBUTE, RouteConfiguration.fromEnvironment());
            event.getServletContext().setAttribute(ATTRIBUTE, persistence);
            if ("true".equalsIgnoreCase(System.getenv("DESIGN_V2_RECONCILE_JOB"))) {
                reconciliationWorker = Executors.newSingleThreadScheduledExecutor(task -> {
                    Thread thread = new Thread(task, "design-v2-vnpay-reconcile");
                    thread.setDaemon(true);
                    return thread;
                });
                reconciliationWorker.scheduleWithFixedDelay(() -> {
                    try { paymentService.reconcilePending(persistence); }
                    catch (Exception failure) {
                        event.getServletContext().log("designV2 reconciliation cycle failed", failure);
                    }
                }, 60, 300, TimeUnit.SECONDS);
            }
        } catch (RuntimeException failure) {
            persistence.close();
            throw failure;
        }
    }

    @Override public void contextDestroyed(ServletContextEvent event) {
        if (reconciliationWorker != null) reconciliationWorker.shutdownNow();
        PersistenceContext persistence = (PersistenceContext) event.getServletContext().getAttribute(ATTRIBUTE);
        if (persistence != null) persistence.close();
    }
}
