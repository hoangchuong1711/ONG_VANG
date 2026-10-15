package com.miniongvang.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="password_reset_challenge")
public class PasswordResetChallenge {
    @Id @Column(name="ma_tk", length=36) private String accountId;
    @Column(name="otp_hash", length=255) private String otpHash;
    @Column(name="otp_expires_at", nullable=false) private Instant otpExpiresAt;
    @Column(name="attempts", nullable=false) private int attempts;
    @Column(name="token_hash", length=64) private String tokenHash;
    @Column(name="token_expires_at") private Instant tokenExpiresAt;
    @Column(name="auth_version", nullable=false) private long authVersion;
    public PasswordResetChallenge() {}
    public PasswordResetChallenge(String accountId) { this.accountId = accountId; }
    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String value) { otpHash = value; }
    public Instant getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(Instant value) { otpExpiresAt = value; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int value) { attempts = value; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String value) { tokenHash = value; }
    public Instant getTokenExpiresAt() { return tokenExpiresAt; }
    public void setTokenExpiresAt(Instant value) { tokenExpiresAt = value; }
    public long getAuthVersion() { return authVersion; }
    public void setAuthVersion(long value) { authVersion = value; }
}
