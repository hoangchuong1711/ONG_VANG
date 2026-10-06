package com.miniongvang.DAO;

import jakarta.persistence.EntityManager;

/** A DAO never owns a transaction or EntityManager. */
public abstract class BaseDAO<T> {
    protected final EntityManager em;
    private final Class<T> type;

    protected BaseDAO(EntityManager em, Class<T> type) {
        this.em = em;
        this.type = type;
    }

    public T find(String id) { return em.find(type, id); }
    public T persist(T entity) { em.persist(entity); return entity; }
}
