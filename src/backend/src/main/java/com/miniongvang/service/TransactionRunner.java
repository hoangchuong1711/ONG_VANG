package com.miniongvang.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import java.util.function.Function;

/** All DAOs participating in a service operation receive this same EntityManager. */
public final class TransactionRunner {
    private final EntityManagerFactory factory;
    private static final ThreadLocal<Boolean> ACTIVE = ThreadLocal.withInitial(() -> false);

    public TransactionRunner(EntityManagerFactory factory) { this.factory = factory; }

    public <T> T run(Function<EntityManager, T> work) {
        if (ACTIVE.get()) throw new IllegalStateException("Nested independent transactions are not supported");
        ACTIVE.set(true);
        try (EntityManager em = factory.createEntityManager()) {
            EntityTransaction tx = em.getTransaction();
            tx.begin();
            try {
                T result = work.apply(em);
                em.flush();
                tx.commit();
                return result;
            } catch (RuntimeException | Error failure) {
                try { if (tx.isActive()) tx.rollback(); }
                catch (RuntimeException rollbackFailure) { failure.addSuppressed(rollbackFailure); }
                throw failure;
            }
        } finally {
            ACTIVE.remove();
        }
    }
}
