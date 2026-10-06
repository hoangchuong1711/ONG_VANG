package com.miniongvang.DAO;

import com.miniongvang.entity.HangThanhVien;
import jakarta.persistence.EntityManager;

public final class HangThanhVienDAO extends BaseDAO<HangThanhVien> {
    public HangThanhVienDAO(EntityManager em) { super(em, HangThanhVien.class); }
}

