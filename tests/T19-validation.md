# T19 — Báo cáo hồi quy backend trên SQL Server designV1

Ngày kiểm thử: 12/10/2026 (Asia/Bangkok, UTC+07:00). Người chạy local: Le Nguyen Thanh Hien, Windows 11/Git Bash. Nhánh `feat/t19-backend-integration`; HEAD cho lượt HTTP được người dùng xác nhận: `f3b94f12aacc6c9c0a7912bf841a6de9ecbbdd48`. Retest Java 73 test chạy sau bản test bổ sung và sửa assertion DT04 được cung cấp tại `a75fea9`; log cuối không kèm git rev-parse HEAD riêng. Kết quả dưới đây được đối chiếu từ log terminal người dùng cung cấp, không phải chạy SQL Server trong cloud.

SQL Server 2022 (JDBC báo 16.0), database test riêng `mini_ong_vang_test`, cổng 15433; backend test cổng 18081. Flyway validate 4 migration designV1 V1–V4, JPA validate trong startup. Không sử dụng kết quả PostgreSQL hoặc schema cũ làm bằng chứng.

## Kết luận và giới hạn

**Các suite đã chạy đạt: 73 Java tests và 348 HTTP checks nghiệp vụ**, contract check và invariant mới trước/sau reset đạt. Các nhánh DT04/DT05/DT07 thiếu trước đó đã được bổ sung và retest đạt lúc 16:08:21 (+07:00). Ma trận DT01–DT27 dưới đây ghi Expected, Actual và nguồn test. Phần thực hiện/kiểm thử T19 sẵn sàng review; trạng thái Done theo CONTRIBUTING vẫn cần reviewer khác approve, CI PR đạt và merge vào develop.

VNPay dùng gateway/callback có chữ ký giả lập trong integration test, không gọi Sandbox thật. Không có test UI chức năng. Kết quả PASS trong ma trận áp dụng các tình huống/assertion được nêu và không chứng minh các luồng ngoài phạm vi hoặc Sandbox thật.

Dòng kết quả và SHA-256 của các log gốc: [T19-evidence.md](T19-evidence.md).

## Expected / Actual của lần thực thi cuối

| Bước | Expected | Actual | Kết quả |
| --- | --- | --- | --- |
| Maven clean verify | Toàn bộ test chạy với REQUIRE_TEST_DB=true, không lỗi/skip | 16:08:21: 73 tests, 0 failures/errors/skipped; Auth 5, SQL Server 2, DesignV1 54, unit 12; BUILD SUCCESS | PASS |
| OpenAPI/Postman/CSRF | Contract, examples và artifact đồng bộ | 29 operations / 12 UCs / 287 examples; 2 CSRF tests pass | PASS |
| Smoke chung sau rebuild V4 | Spec/assets và DB thật hoạt động | Spec khớp source; health=200 connected; Swagger JS/CSS được phục vụ | PASS |
| T10 tạo đơn | Validate/replay/concurrency đạt | 24 HTTP checks | PASS |
| T16 lịch sử | Ownership/phân trang/lọc/tổng/schema đạt | 27 HTTP checks | PASS |
| T13 hủy | Quyền/lý do/hủy và giải phóng tài xế đạt | 34 HTTP checks | PASS |
| T17 báo cáo/Excel | Quyền, receipts/unallocated và XLSX khớp JSON | 53 HTTP checks | PASS |
| T14 tiền mặt | Quyền/trạng thái/replay/chặn thu trùng | 32 HTTP checks | PASS |
| T11 điều phối | Quyền/CSRF/gán/từ chối và race | 85 HTTP checks | PASS |
| Invariant trước reset | Profile/role/order/event/policy và payment hợp lệ | sqlcmd -b: designV1 invariant reconciliation passed | PASS |
| Reset/seed rồi T12 | Fixture mới; tiến trình/sự cố/hoàn tất | 15:54:08 reset/seed BUILD SUCCESS; 93 HTTP checks | PASS |
| Invariant sau progress | Dữ liệu lượt progress nhất quán | sqlcmd -b: designV1 invariant reconciliation passed | PASS |

348 = 24 + 27 + 34 + 53 + 32 + 85 + 93; smoke chung và contract không cộng vào số này. Các lần chạy lặp lại chỉ là retest, không cộng để tăng số lượng case.

## Truy vết 12 UC

| UC | Kiểm thử thực thi | Kết quả và phạm vi |
| --- | --- | --- |
| UC-01 | AuthServiceIntegrationTest + đăng ký/login/session/CSRF trong các smoke | PASS |
| UC-02 | DesignV1IntegrationTest + smoke:orders | PASS |
| UC-03 | FareCalculatorTest + quote/order integration, DT04/DT07 mới | PASS |
| UC-04 | RouteServiceTest, GoongRouteProviderTest + smoke:orders | PASS; Goong HTTP provider giả lập |
| UC-05 | Membership/window/policy integration, DT05 expiry mới | PASS |
| UC-08 | Cash payment integration + smoke:payment/reports | PASS |
| UC-10 | VNPay IPN/Return/query integration trên SQL Server | PASS giả lập; Sandbox thật chưa chạy |
| UC-12 | Dispatch integration + smoke:dispatch | PASS |
| UC-13 | Lifecycle integration + smoke:progress | PASS |
| UC-14 | Cancellation/rollback/race integration + smoke:cancel | PASS |
| UC-15 | Report integration, exporter unit + smoke:reports | PASS |
| UC-19 | History/detail integration + smoke:history | PASS |

## Ma trận DT01–DT27

Các tên test không có tiền tố lớp thuộc `src/backend/src/test/java/com/miniongvang/persistence/DesignV1IntegrationTest.java`. Actual được xác nhận từ suite 54 test đạt cùng các log smoke; không có log kết quả từng assertion riêng. HTTP đã chạy trên f3b94f1; các commit sau đó chỉ thay test Java, không đổi mã nghiệp vụ, migration, smoke script hoặc invariant SQL.

| DT | Expected | Test / bằng chứng | Actual | Kết quả |
| --- | --- | --- | --- | --- |
| DT01 | Sai role/hồ sơ trùng bị chặn; không để dữ liệu dở dang | `dt01WrongProfileRoleAndDuplicateProfileAreRejectedAtomically` | Trigger V4 trả đúng lỗi 51080/81/82; unique hồ sơ chặn trùng; số dòng/profile giữ nguyên | PASS |
| DT02 | Hai đăng ký cùng SĐT chỉ tạo một khách | `AuthServiceIntegrationTest.concurrentDuplicateRegistrationCreatesOnlyOneCustomer` | Một winner; một lỗi trùng; một account/profile | PASS |
| DT03 | Chính sách công bố không chồng phạm vi | `concurrentPolicyPublicationSerializesEmptyScopeAndAuditsWinner` | Một công bố thắng; không overlap; audit winner | PASS |
| DT04 | Policy công bố bất biến; phiên bản mới không đổi giá đơn cũ | `publishedPoliciesRejectDirectMutationAndControlledSuccessorsDoNotOverlap; dt04PublishedSuccessorNeverChangesCommittedOrderFare` | Policy successor cho quote mới giá khác; cước/giá/mã policy của đơn cũ giữ nguyên. hieuLucDen được đóng đúng boundary theo quy tắc cho phép | PASS |
| DT05 | Đúng mốc hết hạn thành viên/policy, không lệ thuộc timezone máy | `membershipWindowAndZeroOrFullDiscountUseExactBoundaries; dt05PublishedMembershipPolicyExpiresAtExactBoundaryInEveryClockZone` | Trước policy expiry 1 ms còn giảm; đúng/sau mốc giảm 0 dù thành viên còn hạn; ba Clock zone UTC/HCM/New York cho cùng kết quả | PASS |
| DT06 | Làm tròn đúng, không âm/tràn; miễn cước không tạo payment | `FareCalculatorTest; membershipWindowAndZeroOrFullDiscountUseExactBoundaries; freeOrderDoesNotCreatePayment` | Số học/overflow, 0%/100% và miễn cước đạt | PASS |
| DT07 | Quote hết hạn 300 giây; thay giá/tuyến/kiện trả lỗi | `quoteExpiresAtExactlyThreeHundredSeconds; dt07ChangedPolicyOrParcelsRejectsQuoteWithoutPartialOrder; smoke:orders` | 300 giây QUOTE_EXPIRED; đổi giá/kiện/tuyến QUOTE_CHANGED; số dòng 6 bảng aggregate/cache không tăng; quote mới được chấp nhận đúng giá | PASS |
| DT08 | Replay cùng key/payload khi route lỗi không tạo thêm đơn | `committedOrderReplaysWithoutRouteProviderOrLiveQuote` | Response gốc giữ nguyên khi route timeout và quote đã hết hạn | PASS |
| DT09 | Cùng key khác payload conflict; key hết hạn đúng 24 giờ dùng lại, đơn cũ còn nguyên | `quoteAndOrderKeepVersionedFareAndReplayResponse; dt09IdempotencyExpiresAtExactlyTwentyFourHoursWithoutDeletingOldOrder` | Replay trước 24 giờ; quote cũ hết hạn; quote mới cùng key tạo đơn khác; 2 đơn/1 cache | PASS |
| DT10 | Lỗi ghi aggregate/event/cache rollback toàn bộ | `failedIdempotencyWriteRollsBackWholeOrderAggregate` | Inject lỗi cuối ghi cache; số dòng 6 bảng trước/sau bằng nhau | PASS |
| DT11 | Không gán trùng cùng đơn hoặc cùng tài xế | `concurrentAssignmentsLeaveOnlyOneActiveDriver; smoke:dispatch` | Hai lượt 8 request: mỗi lượt 1 winner; 7 conflict/unavailable | PASS |
| DT12 | Gợi ý và gán cùng chặn xe/GPLX/account không hợp lệ | `dt12SuggestionsAndAssignmentRejectEveryIneligibleDriver; assignmentRechecksAccountAndVehicleAfterConcurrentChange` | 4 tình huống thiếu xe/xe tắt/GPLX hết hạn/account khóa bị loại và chặn gán; không audit dư | PASS |
| DT13 | Không gán lại người từ chối cùng đơn; giữ lịch sử | `rejectedDriverCannotBeAssignedAgainToSameOrder; t16DetailIncludesRejectedAssignmentsAndConfirmedPayment` | Tài xế cũ DRIVER_UNAVAILABLE; tài xế khác nhận; lịch sử TU_CHOI còn | PASS |
| DT14 | Chặn nhảy/lùi trạng thái; retry không nhân event | `smoke:progress` | Sai cạnh 409; 8 request mỗi bước cùng trả trạng thái nhưng chỉ thêm 1 event | PASS |
| DT15 | Retry hoàn tất đơn cũ không tác động phân công mới | `dt15CompletedReplayCannotCloseDriversNewAssignment; smoke:progress` | Giữ timestamp/event đơn cũ và assignment mới đang hoạt động | PASS |
| DT16 | Hủy trước/đúng 300 giây; race lấy hàng nhất quán | `cancellationChecksOwnerRoleReasonStateAndExactDeadline; dt16CancellationRacingPickupLeavesOneConsistentOutcome` | 299.999 giây được hủy; 300/301 bị chặn; barrier race chỉ một trạng thái thắng và driver/assignment khớp | PASS |
| DT17 | Event trùng timestamp vẫn có thứ tự xác định | `t16EventsUseSequenceWhenTimestampsTie; smoke:progress` | thuTu xác định; phân trang mỗi event khớp danh sách | PASS |
| DT18 | Không thu trước hoàn tất hoặc tạo payment cho miễn cước | `cashPaymentRequiresCompletionAndCorrectConfirmer; freeOrderDoesNotCreatePayment` | Trạng thái chưa hoàn tất bị chặn; miễn cước không tạo attempt | PASS |
| DT19 | Return chưa xác thực IPN không xác nhận đã thu | `vnpayIpnSettlesOnceAndReturnNeverSettles` | Return KHONG_THAY_DOI; daXacNhanDu=false tới khi IPN hợp lệ | PASS (giả lập) |
| DT20 | Khử lặp/sai chữ ký/sai tiền/timeout/callback muộn | `vnpayInvalidMismatchLateAndTimeoutAreRetained; concurrentVnpayIpnsCreateOneConfirmation; signedQueryResultCanSettleButPendingQueryCannot` | Sai/không khớp được lưu; timeout CHUA_RO_KET_QUA; duplicate khử lặp; callback muộn đối soát; xác nhận tối đa một | PASS (giả lập) |
| DT21 | Payment đơn A không xác nhận đơn B | `paymentCannotSettleAnotherOrder` | FK ghép chặn sai cặp; payment hợp lệ vẫn xác nhận được | PASS |
| DT22 | Khách và tài xế không hoàn tất đơn không được xác nhận tiền mặt | `cashPaymentRequiresCompletionAndCorrectConfirmer; smoke:payment` | Hai vai trò sai nhận 403; người hoàn tất/tổng đài hợp lệ | PASS |
| DT23 | Giữ hai khoản thu thực tế nhưng chỉ một xác nhận đủ | `secondRealCollectionRemainsUnallocated; vnpayInvalidMismatchLateAndTimeoutAreRetained` | Khoản dư có bằng chứng/canDoiSoat, không tạo xác nhận đủ thứ hai | PASS |
| DT24 | Thu kỳ sau không xóa công nợ kỳ trước | `t17LaterReceiptDoesNotEraseEarlierReceivable` | Công nợ đầu kỳ giữ đúng; tiền nằm ở kỳ thu | PASS |
| DT25 | Sai chủ không đọc được đơn/event; tài xế từ chối mất quyền | `t16DetailKeepsPolicyVersionsAndProtectsOwnership; t16DetailIncludesRejectedAssignmentsAndConfirmedPayment; smoke:history/dispatch` | Sai chủ 404; driver từ chối không truy cập được đơn | PASS |
| DT26 | Không xóa account/policy/order làm mất lịch sử | `dt26DeletingReferencedAccountPolicyOrOrderCannotEraseHistory` | SQL exception từ FK/trigger; số dòng và 5 event lịch sử giữ nguyên | PASS |
| DT27 | Nhiều kiện/phụ thu/payment event không nhân tiền | `t17UnallocatedReceiptAndManyChildrenDoNotMultiplyFare; t16HistoryFiltersPagesAndSummarizesWithoutChildMultiplication; smoke:reports` | Cước/thu chưa phân bổ/tổng các trang đúng; Excel khớp JSON | PASS |

## Bug / sửa / retest

| ID | Expected / vấn đề | Actual ban đầu | Sửa và retest | Trạng thái |
| --- | --- | --- | --- | --- |
| ENV-T19-01 | Executor tải được SQL Server image | MCR Forbidden trên cloud | Docker Windows tải được image; suite SQL Server và HTTP thực thi | Giải quyết cho local; cloud vẫn hạn chế |
| T19-COV-01 | CI chạy smoke tiền mặt có sẵn | Workflow không gọi smoke:payment riêng | Thêm bước sau reports; local 32 checks đạt | Local PASS; CI PR chờ xác nhận |
| T19-BUG-01 | Hồ sơ đúng vai trò, role account bất biến | Rà DDL thấy FK chỉ kiểm tra account tồn tại | V4 thêm 3 trigger; DT01 retest kiểm tra đúng mã lỗi và rollback đạt | Fixed / PASS local |
| T19-BUG-02 | Test invariant không làm thay đổi session cho Hibernate | 15:42:50: 70 tests, 11 errors ở seed, row count -1 | finally SET NOCOUNT OFF cả positive/negative; 15:46:57: 70 tests, 0 errors | Fixed / PASS local |

Không coi các dòng ERROR từ lỗi constraint/fault injection trong suite đạt là bug chưa sửa. Lần đầu người dùng dùng cú pháp PowerShell trong Git Bash chỉ chạy 12 unit tests; lần đó bị loại khỏi bằng chứng SQL Server. Kết quả 63 tests/d00db8c trước bổ sung V4 là lịch sử; 70 tests là lượt trước bổ sung DT04/DT05/DT07, kết quả cuối là 73 tests.

## Đối chiếu dữ liệu

`scripts/check-design-v1-invariants.sql` đã chạy trên DB test **trước reset** sau reports/payment/dispatch, và **sau reset + progress**. Script kiểm tra Flyway V2/V4 và trigger bật, role/profile, đầy đủ aggregate, trạng thái assignment/event, thứ tự event và policy không overlap. Phần thanh toán kiểm tra xác nhận thuộc đúng đơn HOAN_TAT/payment thành công và số tiền bằng tổng cước, tối đa một attempt chưa giải quyết kể cả hai trạng thái pending khác nhau, không tạo payment trước hoàn tất/cho đơn miễn cước, callback DA_AP_DUNG phải có chữ ký hợp lệ và liên kết payment.

Test `t19InvariantQueryAcceptsValidPaymentAndDetectsWrongConfirmedAmount` xác nhận script chấp nhận khoản thu đúng và trả SQL error 51010 khi cố đổi tiền của khoản đã xác nhận. Ranh giới ngày/công nợ và không nhân tiền do join được kiểm tra trong report integration, không suy ra chỉ từ invariant.

## Retest cuối và điều kiện bàn giao

Lượt đầu chạy 73 test có 1 failure tại DT04: assertion so toàn bộ PolicyVersions đã coi thay đổi hieuLucDen hợp lệ là lỗi. Bản a75fea9 sửa assertion: so tất cả trường nội dung giá/ID/tham chiếu, cước của đơn cũ và xác nhận hieuLucDen bằng boundary. Retest ngày 12/10/2026 lúc 16:08:21 (+07:00) đạt **73 tests, 0 failures/errors/skipped, BUILD SUCCESS**. Ghi `T19-BUG-03` là lỗi kỳ vọng test, Fixed/retest PASS; DT05/DT07 cũng đạt.

Các ca bổ sung cuối không đổi code nghiệp vụ, schema hoặc HTTP tools nên 348 HTTP checks cùng invariant trước/sau reset của f3b94f1 vẫn là bằng chứng cho phiên bản nghiệp vụ này. Cần PR CI và reviewer approve trước merge; không xem báo cáo local là chứng nhận T20 hoặc bằng chứng Sandbox thật.

## Chạy lại

Dùng chuỗi lệnh SQL Server test trong [README](../README.md#ci-và-môi-trường-kiểm-thử-t05) hoặc workflow `.github/workflows/ci.yml`. Bắt buộc DB `mini_ong_vang_test`, REQUIRE_TEST_DB=true; dừng backend trước Maven, reset/seed sau JUnit, rebuild WAR, chạy nhóm HTTP, invariant **trước reset**, reset/seed rồi progress và invariant lần nữa. Git Bash dùng export và MSYS_NO_PATHCONV=1 cho đường dẫn Linux container; script reset PowerShell gọi từ Bash bằng powershell.exe. Không commit credential hoặc dùng reset cho DB dev.
