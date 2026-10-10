package com.miniongvang.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** Successful create-order response, scoped to actor + operation + key. */
@Entity
@Table(name="order_creation_request")
public class OrderCreationRequest {
    @Id @Column(name="request_id", length=64) private String id;
    @Column(name="ma_tk", nullable=false, length=36) private String actorId;
    @Column(name="ma_don", nullable=false, length=36) private String orderId;
    @Column(name="request_json", nullable=false, columnDefinition = "nvarchar(max)") private String requestJson;
    @Column(name="response_json", nullable=false, columnDefinition = "nvarchar(max)") private String responseJson;
    @Column(name="expires_at", nullable=false) private Instant expiresAt;
    public String getId() { return id; }
    public void setId(String value) { id=value; }
    public String getActorId() { return actorId; }
    public void setActorId(String value) { actorId=value; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String value) { orderId=value; }
    public String getRequestJson() { return requestJson; }
    public void setRequestJson(String value) { requestJson=value; }
    public String getResponseJson() { return responseJson; }
    public void setResponseJson(String value) { responseJson=value; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant value) { expiresAt=value; }
}
