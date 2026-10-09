package com.miniongvang.DAO;

import com.miniongvang.entity.BaoGia;
import jakarta.persistence.EntityManager;

public final class BaoGiaDAO extends BaseDAO<BaoGia> {
    public BaoGiaDAO(EntityManager em) { super(em, BaoGia.class); }
}
