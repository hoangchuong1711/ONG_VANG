package com.miniongvang.dao;

import com.miniongvang.entity.PasswordResetChallenge;
import jakarta.persistence.EntityManager;

public final class PasswordResetChallengeDAO extends BaseDAO<PasswordResetChallenge> {
    public PasswordResetChallengeDAO(EntityManager em) {
        super(em, PasswordResetChallenge.class);
    }

    public void remove(PasswordResetChallenge challenge) {
        em.remove(challenge);
    }
}
