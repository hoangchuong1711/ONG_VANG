package com.miniongvang.DAO;

import com.miniongvang.entity.OrderCreationRequest;
import com.miniongvang.entity.TaiKhoan;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

public final class OrderCreationRequestDAO extends BaseDAO<OrderCreationRequest> {
    public OrderCreationRequestDAO(EntityManager em) { super(em, OrderCreationRequest.class); }
    // Serializes only the short DB phase for a single actor, including first use of a key.
    public TaiKhoan lockActor(String id) { return em.find(TaiKhoan.class, id, LockModeType.PESSIMISTIC_WRITE); }
}
