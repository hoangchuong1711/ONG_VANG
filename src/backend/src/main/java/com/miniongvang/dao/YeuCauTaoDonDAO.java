package com.miniongvang.dao;

import com.miniongvang.entity.TaiKhoan;
import com.miniongvang.entity.YeuCauTaoDon;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

public final class YeuCauTaoDonDAO extends BaseDAO<YeuCauTaoDon> {
    public YeuCauTaoDonDAO(EntityManager em) { super(em, YeuCauTaoDon.class); }
    public TaiKhoan lockActor(String id) { return em.find(TaiKhoan.class, id, LockModeType.PESSIMISTIC_WRITE); }
}
