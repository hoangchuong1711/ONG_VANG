package com.miniongvang.service;
import com.miniongvang.security.ActorContext;
import com.miniongvang.dto.customer.CustomerDtos.Customer;
import com.miniongvang.dto.customer.CustomerDtos.CustomerPage;
import com.miniongvang.dto.quote.QuoteDtos.MembershipView;

import com.miniongvang.dao.CustomerDAO;
import com.miniongvang.entity.KhachHang;
import com.miniongvang.entity.enums.AccountRole;
import com.miniongvang.entity.enums.AccountStatus;
import jakarta.persistence.EntityManagerFactory;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

/** DTO for the dispatcher customer picker. The quote remains the source of final pricing. */
public final class CustomerService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final TransactionRunner transactions;
    private final Clock clock;

    public CustomerService(EntityManagerFactory factory) { this(factory, Clock.systemUTC()); }
    public CustomerService(EntityManagerFactory factory, Clock clock) {
        this.transactions = new TransactionRunner(factory);
        this.clock = clock;
    }

    public CustomerPage search(ActorContext actor, int page, int size, String query) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw new IllegalArgumentException("Invalid page");
        String normalized = query == null ? null : query.strip().replaceAll("\\s+", " ");
        if (normalized != null && (normalized.isEmpty() || normalized.length() > 100))
            throw new IllegalArgumentException("Invalid query");
        return transactions.run(em -> {
            if (actor == null || actor.vaiTro() != AccountRole.TONG_DAI)
                throw new SecurityException("FORBIDDEN");
            var account = em.find(com.miniongvang.entity.TaiKhoan.class, actor.maNguoiDung());
            if (account == null || account.getVaiTro() != AccountRole.TONG_DAI
                    || account.getTrangThai() != AccountStatus.HOAT_DONG)
                throw new SecurityException("FORBIDDEN");
            var result = new CustomerDAO(em).search(normalized, page, size);
            Instant now = clock.instant();
            var membership = new MembershipPolicyService(clock);
            List<Customer> items = result.items().stream().map(customer -> view(customer, membership, em, now)).toList();
            return new CustomerPage(items, page, size, result.total(),
                    (result.total() + size - 1) / size);
        });
    }

    private static Customer view(KhachHang customer, MembershipPolicyService membership,
                                 jakarta.persistence.EntityManager em, Instant now) {
        var account = customer.getTaiKhoan();
        MembershipView tier = null;
        if (customer.getMaHang() != com.miniongvang.entity.enums.MembershipTier.THUONG) {
            var decision = membership.evaluate(em, customer, java.math.BigDecimal.ZERO, now);
            var policy = decision.policy();
            tier = new MembershipView(customer.getMaHang().name(), customer.getMaHang().name(),
                    policy == null ? "0.00" : policy.getTyLeGiam().setScale(2).toPlainString(),
                    customer.getThanhVienDen() == null ? null
                            : customer.getThanhVienDen().minusMillis(1).atZone(VIETNAM).toLocalDate().toString(),
                    decision.active());
        }
        return new Customer(customer.getId(), account.getHoTen(), account.getSoDienThoai(),
                account.getEmail(), customer.getDiaChiMacDinh(), tier);
    }

}
