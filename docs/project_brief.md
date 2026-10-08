Kế hoạch triển khai dự án báo cáo môn Công nghệ Phần mềm SOEN330679 • Nhóm 6 thành viên • Dự kiến 10–12 tuần • Cập nhật ngày 04/10/2026.

Mục tiêu: hoàn thành 12 Use Case theo đề Hệ thống đặt xe / giao hàng Mini Ong Vàng, bảo đảm kiến trúc 3 tầng và truy vết từ yêu cầu đến thiết kế, code và test. Triển khai backend trước; chỉ bắt đầu thiết kế và lập trình frontend nghiệp vụ sau khi backend đạt mốc nghiệm thu. Khởi tạo khung cả hai ngay từ đầu.

## 1. Phạm vi và cơ sở lập kế hoạch

* Nguồn yêu cầu: Yeu_cau_Cuoi_ky_He_thong_Giao_hang_Mini_Ong_Vang.docx do giảng viên cung cấp. Giữ nguyên 12 UC, các actor, màn hình và quy tắc nghiệp vụ liên quan.

* Quyết định của nhóm: Next.js + Java Servlet + Hibernate + PostgreSQL; VNPay Sandbox; bản đồ giả lập là phương án cơ sở; làm BE trước FE; thành viên tự nhận task theo phụ thuộc.

* Hiện chưa có Class Diagram chính thức. Tên class, method, bảng và endpoint trong kế hoạch chỉ là định hướng; lập thiết kế nền trước phần nghiệp vụ tương ứng rồi cập nhật có kiểm soát. Không coi sơ đồ minh họa là thiết kế đã duyệt.

* Kế hoạch gồm 32 task lớn ở mức chức năng. Mã T01–T32 là mã nội bộ của bản kế hoạch mới, thay thế cách đánh số 25 task cũ; không phải mã work item OV-… trên Plane. Có thể tách subtasks sau khi thống nhất thiết kế.

* Các mục áp dụng bài giảng là lựa chọn của nhóm để nâng chất lượng, không tự gán thành yêu cầu bắt buộc của giảng viên. Bổ sung phạm vi ngày 08/10/2026: khách hàng tự đăng ký tài khoản trong UC-01/T06; không cho tự đăng ký vai trò tài xế, tổng đài hoặc chủ đội xe. Đây là mở rộng của nhóm, không thay đổi số lượng 12 UC. Không mở rộng GPS trực tiếp, nhiều cổng thanh toán hay tối ưu đội xe.

## 2. Yêu cầu và 12 Use Case

Bắt buộc theo đề: 3 tầng UI/Presentation → Controller/Service (Business) → DAO/Database; GitHub cho mọi thành viên quyền push và có develop; tối thiểu /src, /docs, /tests; schema bám ERD và có seed; code bám Class/Sequence/Interface Design/UC Spec; mỗi UC có Alternative Flow được xử lý; demo Main Flow bằng dữ liệu chạy qua hệ thống và ít nhất một nhánh thay thế.

| UC    | Phạm vi triển khai                                                                                       | Nhánh thay thế và lỗi cần xử lý                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| UC-01 | Đăng nhập, đăng xuất và phân quyền khách, tổng đài/điều phối, tài xế, quản trị; bổ sung khách hàng tự đăng ký tài khoản. | Sai thông tin đăng nhập; tài khoản bị khóa; thiếu/sai dữ liệu; SĐT đăng ký trùng sau chuẩn hóa; gửi role trái phép; CSRF thiếu/sai. |
| UC-02 | Khách hoặc tổng đài tạo đơn; thông tin kiện hàng, cước snapshot và nhật ký; trạng thái CHO_GAN.          | Thiếu điểm giao/SĐT; SĐT sai; ngoài vùng phục vụ; lỗi mạng/server.                                         |
| UC-03 | Tính cước gốc + phụ thu − giảm giá; trả chi tiết và lưu snapshot khi chốt đơn.                           | Thiếu biểu phí; khoảng cách không hợp lệ; chặn/giới hạn tổng âm.                                           |
| UC-04 | Chuẩn hóa điểm lấy/giao; lấy km, thời gian ước tính; kiểm tra phạm vi; gọi dịch vụ giả lập qua adapter.  | Timeout/lỗi dịch vụ; không tìm thấy địa chỉ; vượt giới hạn.                                                |
| UC-05 | Kiểm tra hạng thành viên và tính giảm VIP từ dữ liệu khách hàng.                                         | Khách thường giảm 0; hạng hết hạn/không hợp lệ; giảm vượt cước.                                            |
| UC-08 | Thanh toán tiền mặt hoặc online cho đơn hoàn tất; lưu các lần thử và trạng thái thu cước.                | Đã trả tiền; sai số tiền; giao dịch thất bại.                                                              |
| UC-10 | Thanh toán điện tử qua VNPay Sandbox; redirect/QR do cổng cung cấp, IPN, return và đối soát.             | Khách hủy; callback/chữ ký không hợp lệ; timeout và kiểm tra lại.                                          |
| UC-12 | Gợi ý tài xế rảnh theo quy tắc đơn giản; điều phối gán; tài xế xem đơn và có thể từ chối trước lấy hàng. | Không có tài xế; tài xế vừa bận; từ chối có lý do và đưa đơn về chờ gán lại.                               |
| UC-13 | Tài xế cập nhật tiến trình, xác nhận hoàn tất; giải phóng tài xế; cập nhật cơ sở báo cáo.                | Người nhận không nghe máy/từ chối nhận: ghi sự cố, chưa hoàn tất; sai trạng thái; tài xế không sở hữu đơn. |
| UC-14 | Khách hoặc tổng đài hủy trước 5 phút, đúng trạng thái; ghi lý do và giải phóng tài xế nếu đã gán.        | Quá hạn; đang giao/hoàn tất hoặc trạng thái không cho hủy; không tìm thấy đơn.                             |
| UC-15 | Quản trị xem ngày/tuần/tháng, doanh thu và số đơn; kế hoạch chọn có xuất Excel.                          | Khoảng thời gian sai; không có dữ liệu trả 0; lỗi xuất vẫn giữ báo cáo.                                    |
| UC-19 | Khách lọc và xem lịch sử/chi tiết của mình, tổng số đơn và tổng cước trong kỳ.                           | Danh sách rỗng; khoảng ngày sai; truy cập đơn người khác.                                                  |

Đề nêu tối thiểu một Alternative Flow/UC, nhưng phần đặc tả liệt kê nhiều nhánh “cần cài đặt”. Kế hoạch chọn bao phủ toàn bộ các nhánh liệt kê trên. UC có thể dùng chung Service/API/màn hình; không ép 12 UC thành 12 endpoint riêng.

## 3. Công nghệ và tích hợp

| Thành phần            | Lựa chọn                                              | Cách dùng và giới hạn                                                                                                                                                          |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend              | Next.js, React, TypeScript                            | Khởi tạo trước; phát triển UI nghiệp vụ sau mốc BE. Không đặt nghiệp vụ chính trong Next.js.                                                                                   |
| Backend               | Java Servlet trên Tomcat, Maven                       | Controller tiếp nhận HTTP; Service xử lý nghiệp vụ; chốt bộ phiên bản Java/Tomcat/Hibernate tương thích tại T02.                                                               |
| CSDL và ORM           | PostgreSQL + Hibernate/JPA                            | DAO dùng Hibernate; migration SQL có phiên bản; không trộn JDBC thủ công cho CRUD mặc định. Không tự cập nhật schema ngoài kiểm soát.                                   |
| API và xác thực       | REST JSON + session phía server                       | Cookie HttpOnly, Secure trên HTTPS; kiểm tra role và quyền sở hữu tại BE; mật khẩu băm bằng thư viện phù hợp. Chốt CSRF và CORS khi setup. Ưu tiên cùng origin qua proxy /api. |
| Thanh toán            | VNPay Sandbox + ghi nhận tiền mặt                     | Tích hợp sandbox thật; không dùng tiền thật. Khóa sandbox để ở biến môi trường. Return phục vụ hiển thị; IPN/đối soát server đã xác minh quyết định kết quả.                   |
| Lộ trình              | RouteProvider + dịch vụ giả lập                       | Bộ địa chỉ và tuyến mẫu cố định, có km/thời gian và tình huống lỗi. Không sinh khoảng cách ngẫu nhiên, không tự đổi sang dữ liệu giả khi API thật lỗi.                         |
| Bản đồ thật tùy chọn  | Goong Geocoding/Directions                            | Phù hợp để thử tra địa chỉ/lộ trình tại Việt Nam. Chỉ thêm sau phần cơ sở nếu có API key và hạn mức phù hợp; chưa cam kết miễn phí.                                            |
| Điều phối và tracking | Danh sách tài xế và cập nhật trạng thái               | Gợi ý tài xế theo thời điểm rảnh lâu nhất rồi mã tài xế; điều phối chọn. Gửi đơn qua danh sách trên tài khoản tài xế, làm mới định kỳ; không cần SMS/push/GPS.                 |
| Báo cáo               | Truy vấn tổng hợp PostgreSQL + Apache POI             | Dùng cùng bộ lọc và quyền truy cập cho màn hình và Excel; không cần hệ thống BI.                                                                                               |
| UI và thiết kế        | Figma + UI Kit nhỏ theo Material Design               | Button, Input, Select, Dialog, Table, Status Badge; cùng màu/chữ/khoảng cách. Có thể dùng MUI để giảm công viết component.                                                     |
| Kiểm thử              | JUnit, Postman; Jest/React Testing Library khi làm FE | Unit nghiệp vụ; integration Hibernate/PostgreSQL và API; test UI/hệ thống theo UC. JaCoCo xem nhánh quan trọng.                                                                |
| Môi trường và CI      | Docker Compose + GitHub Actions                       | PostgreSQL và BE chạy lặp lại được; bổ sung FE sau. CI build/test mỗi PR; deploy tự động là tùy chọn.                                                                          |

Đề cho phép service bản đồ giả lập; dữ liệu đơn, thay đổi trạng thái và giao dịch phải thực sự được xử lý/lưu vào hệ thống. Trên UI và khi bảo vệ, ghi rõ bản đồ đang giả lập và thanh toán đang ở sandbox. OSRM là phương án tìm hiểu khác nếu dùng tọa độ có sẵn; không chọn làm phụ thuộc cơ sở và không xem máy chủ demo công cộng là dịch vụ có bảo đảm.

## 4. Kiến trúc và cấu trúc mã nguồn

Theo cách gọi trong đề: tầng 1 Presentation = Next.js; tầng 2 Business = Servlet Controller + Service; tầng 3 Data = DAO/Hibernate + PostgreSQL. Controller chỉ điều phối HTTP/DTO, không chứa quy tắc tính cước và không gọi DAO bỏ qua Service. Service gọi DAO hoặc adapter tích hợp. Package entity chứa các Entity và mô hình dữ liệu được đối chiếu với Class Diagram.

```
/src/frontend/                  Next.js, components, API client
/src/backend/                   Maven project
  src/main/java/.../controller/ Servlet, DTO, kiểm tra đầu vào
  src/main/java/.../service/    Nghiệp vụ, transaction
  src/main/java/.../entity/     Mô hình/Entity theo thiết kế
  src/main/java/.../DAO/        Hibernate/JPA
  src/main/java/.../integration/ RouteProvider, VNPay adapter
  src/main/java/.../config/     DB, auth, môi trường
  src/main/resources/          Migration và cấu hình mẫu
  src/test/java/               Test Java theo quy ước Maven
/docs/                        SRS, UC, UML, ERD, Figma, API, traceability
/tests/                       Test case, Postman, báo cáo, bug, hướng dẫn chạy
```

Test tự động có thể nằm đúng nơi công cụ build yêu cầu; /tests tập hợp kịch bản, kết quả và đường dẫn đến test nguồn. Session/EntityManager không dùng chung giữa các request. Các thao tác đổi đơn, tài xế, nhật ký và ghi nhận thanh toán phải có transaction phù hợp.

## 5. Quy tắc nghiệp vụ được chọn

* Tạo đơn: nhập → chuẩn hóa địa chỉ/lộ trình → tính cước và VIP → xác nhận → lưu đơn CHO_GAN, chi tiết kiện hàng, snapshot và nhật ký trong transaction. BE tự kiểm tra lại báo giá; không tin tổng tiền từ FE.

* Biểu phí, bán kính/khoảng cách tối đa, tỷ lệ/hạn VIP, giới hạn chuỗi và định dạng SĐT là cấu hình demo cần ghi ở T01 trước khi viết test biên. Tiền dùng BigDecimal/NUMERIC, VND; quy tắc làm tròn thống nhất; tổng = max(0, cước gốc + phụ thu − giảm). Nếu cước bằng 0, ghi nhận miễn cước, không gọi cổng thanh toán.

* Trạng thái đơn: CHO_GAN → DA_GAN → DA_LAY_HANG → DANG_GIAO → HOAN_TAT. Chỉ tài xế được gán mới cập nhật tiến trình. HOAN_TAT và DA_HUY là trạng thái kết thúc.

* Hủy: khách sở hữu đơn hoặc tổng đài có quyền; tuổi đơn tính bằng giờ server từ created_at, phải nhỏ hơn 300 giây và trạng thái CHO_GAN hoặc DA_GAN. Đúng 300 giây không được hủy. Phải có lý do; nếu đã gán thì giải phóng tài xế và ghi nhật ký trong cùng transaction.

* Gán: một đơn tối đa một tài xế đang phụ trách; một tài xế tối đa một đơn đang hoạt động. Kiểm tra tài khoản/tình trạng làm việc; khóa hoặc cập nhật có điều kiện trong transaction để chống tranh chấp. Kiểm thử cả gán–gán và gán–hủy đồng thời.

* Từ chối: tài xế hiện được gán chỉ từ chối ở DA_GAN, bắt buộc lý do; xóa gán hiện tại, giải phóng tài xế, đơn về CHO_GAN để điều phối chọn lại; lưu lịch sử và không tự chọn lại tài xế vừa từ chối.

* Sự cố giao hàng: không nghe máy hoặc người nhận từ chối thì ghi lý do/timestamp, giữ DANG_GIAO và tài xế bận để xử lý lại. Không tự hoàn tất hoặc thêm luồng hoàn hàng ngoài phạm vi.

* Hoàn tất: chỉ từ DANG_GIAO; ghi completed_at, giải phóng tài xế và nhật ký nhất quán. Báo cáo giá trị chuyến hoàn tất được cập nhật từ đơn này; chưa tự coi là đã thu tiền.

* Thu cước sau hoàn tất: khách chọn tiền mặt hoặc VNPay Sandbox. Tiền mặt chỉ được xác nhận đã thu bởi tài xế đã thực hiện đơn hoặc nhân viên được phân quyền, có người xác nhận và thời điểm. Khách không tự đánh dấu đã thu.

* Tách trạng thái giao hàng và thanh toán. Một đơn có nhiều lần thử, mỗi lần thử chỉ thuộc một đơn, có mã tham chiếu duy nhất. Đơn chỉ được ghi nhận tất toán một lần; tại một thời điểm chỉ một yêu cầu online còn hiệu lực.

* Timeout là chưa xác định kết quả, không tự xem là thất bại cuối cùng hay thành công. Kiểm tra lại trước khi tạo lần trả tiền mới/chuyển tiền mặt; callback lặp hoặc đến muộn không làm ghi nhận hai lần và không hạ trạng thái thành công.

* Lịch sử thuộc đúng khách hàng; tổng đài tạo đơn thay khách phải lưu khách được chọn và người tạo. Khách chỉ xem/hủy/thanh toán đơn của mình; tài xế chỉ thao tác đơn được phép; báo cáo dành cho quản trị.

Báo cáo tách rõ: (1) giá trị đơn hoàn tất trong kỳ theo completed_at; (2) tiền thực thu trong kỳ theo paid_at; (3) cước còn phải thu của các đơn đã hoàn tất tính đến cuối kỳ; (4) số đơn hoàn tất và số đơn hủy theo thời điểm tương ứng. Không cộng giá trị hoàn tất và tiền thực thu thành một tổng. Tuần tính từ thứ Hai; ngày/tháng theo Asia/Ho_Chi_Minh, truy vấn theo khoảng đầu bao gồm – cuối không bao gồm. Lịch sử khách hiển thị số đơn/tổng cước theo created_at và bộ lọc trạng thái, không gọi đó là doanh thu.

## 6. Danh sách task và thứ tự thực hiện

Nhóm tự nhận task đủ điều kiện, không chia sáu luồng cố định. Độ khó: Dễ = phạm vi hẹp, ít phụ thuộc; Trung bình = nhiều bước/kiểm tra hoặc phối hợp; Khó = đồng thời, tích hợp ngoài hoặc nhiều quy tắc. Độ khó không phải số ngày hay mức ưu tiên. Cao = chặn chức năng/mốc chính; Vừa = cần cho nghiệm thu nhưng có thể sắp sau trong cùng giai đoạn.

Mọi task phát triển phải kèm test phù hợp, cập nhật API/thiết kế/truy vết và được một thành viên khác review. Phụ thuộc là điều kiện hoàn tất chính; có thể chuẩn bị dữ liệu/đặc tả trước. Không khởi công các task FE T21–T28 trước khi T20 đạt. T02 chỉ khởi tạo khung FE.

### A. Nền tảng và thiết kế nền

| Mã  | Task                               | Độ khó / ưu tiên | Phụ thuộc | Hướng dẫn và kết quả cần có                                                                                                                                                                                              |
| --- | ---------------------------------- | ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T01 | Thống nhất yêu cầu và thiết kế nền | Trung bình / Cao | —         | Đọc 12 UC; lập SRS ngắn, ma trận quyền, trạng thái, cấu hình biểu phí/VIP/phạm vi. Phác ERD/Class và Sequence cho phần sắp làm; lập bảng traceability và test case từ đầu. Tên class/field chi tiết cập nhật sau review. |
| T02 | Khởi tạo repository và cả BE/FE    | Trung bình / Cao | —         | Tạo GitHub, develop, /src /docs /tests; Servlet/Maven và Next.js skeleton; chốt phiên bản tương thích, format, biến môi trường mẫu. Chạy build cả hai, BE health check; chưa làm màn hình nghiệp vụ.                     |
| T03 | Thiết lập CSDL, Hibernate và seed  | Trung bình / Cao | T01, T02  | Tạo migration theo ERD nền, Entity/DAO Hibernate và transaction; seed đủ vai trò, khách thường/VIP/hết hạn, tài xế rảnh/bận/khóa, đơn mẫu. Kiểm tra quan hệ và reset dữ liệu test.                                |
| T04 | Thống nhất hợp đồng API và lỗi     | Trung bình / Cao | T01, T02  | Lập endpoint/DTO/mã lỗi, phân trang và định dạng tiền/thời gian; OpenAPI hoặc bảng API có ví dụ. Thống nhất session/cookie, CSRF, CORS hoặc proxy. Tạo Postman collection để BE kiểm thử độc lập FE.                     |
| T05 | CI và môi trường chạy chung        | Trung bình / Cao | T02       | Thiết lập GitHub Actions build/test trên PR, PostgreSQL test tách biệt, Docker Compose và README. Ban đầu kiểm tra skeleton, bổ sung test theo task; không gọi VNPay thật trong mỗi unit test.                           |

### B. Backend chức năng và tích hợp

| Mã  | Task                                   | Độ khó / ưu tiên | Phụ thuộc          | Hướng dẫn và kết quả cần có                                                                                                                                                                                                              |
| --- | -------------------------------------- | ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T06 | BE đăng ký, đăng nhập và quyền truy cập — UC-01 | Khó / Cao | T03, T04 | Register khách hàng: chuẩn hóa SĐT làm username, hash mật khẩu, tạo tài khoản KHACH_HANG/HOAT_DONG và hồ sơ khách thường cùng transaction; không tự đăng nhập. Làm session, đăng xuất, kiểm tra role/trạng thái tài khoản và CSRF. Test thiếu/sai dữ liệu, trùng SĐT kể cả đồng thời, rollback, tự cấp quyền trái phép, sai mật khẩu, bị khóa, truy cập không có quyền; API hoạt động qua Swagger/Postman. |
| T07 | BE lộ trình giả lập — UC-04            | Trung bình / Cao | T03, T04           | Tạo RouteProvider và bộ địa chỉ/tuyến cố định có km/thời gian. Chuẩn hóa đầu vào, lỗi địa chỉ/timeout/vượt phạm vi; hỗ trợ điều khiển lỗi trong test. Chuẩn bị adapter thay thế nếu tích hợp Goong sau.                                  |
| T08 | BE chính sách thành viên — UC-05       | Trung bình / Cao | T03, T04           | Đọc hạng/hạn thành viên và tỷ lệ từ seed/cấu hình; khách thường giảm 0, không áp hạng hết hạn. Viết test tỷ lệ/ngưỡng, giới hạn giảm; chưa tự nâng hạng bằng hệ thống tích điểm.                                                         |
| T09 | BE tính cước và báo giá — UC-03        | Trung bình / Cao | T07, T08           | Tổng hợp khoảng cách, biểu phí, phụ thu và giảm; trả breakdown thống nhất. Test thiếu biểu phí, km sai, làm tròn và tổng không âm. Chuẩn bị dữ liệu snapshot cho tạo đơn.                                                                |
| T10 | BE tạo đơn — UC-02                     | Khó / Cao        | T06, T09           | Khách/tổng đài nhập đơn, chọn đúng khách hưởng VIP; BE kiểm tra lại báo giá rồi lưu đơn/kiện hàng/snapshot/nhật ký. Mã unique và xử lý gửi lặp; test rollback, thiếu dữ liệu, SĐT sai và ngoài phạm vi.                                  |
| T11 | BE điều phối và gửi đơn — UC-12        | Khó / Cao        | T10                | Danh sách đơn/tài xế rảnh, gợi ý theo quy tắc, gán có transaction. Tài xế đọc được thông tin đơn; xử lý không có tài xế, tranh chấp gán và từ chối có lý do. Có test nhiều request đồng thời.                                            |
| T12 | BE tiến trình và hoàn tất — UC-13      | Khó / Cao        | T11                | Kiểm soát từng chuyển trạng thái, đúng tài xế; ghi sự cố khi không giao được. Hoàn tất ghi timestamp/nhật ký và giải phóng tài xế đồng thời; test sai trạng thái, sai người và lặp yêu cầu.                                              |
| T13 | BE hủy đơn — UC-14                     | Khó / Cao        | T11                | Kiểm tra quyền, tuổi đơn <300 giây và trạng thái cho phép; lưu lý do, giải phóng tài xế. Test 299/300/301 giây, đơn không có và tranh chấp với gán/cập nhật tiến trình.                                                                  |
| T14 | BE nghiệp vụ thanh toán — UC-08        | Khó / Cao        | T12                | Tách trạng thái đơn/lần thử thanh toán; hỗ trợ tiền mặt có người xác nhận và online qua adapter; chặn sai tiền/trả trùng, xử lý miễn cước. Test quyền xác nhận và giao dịch thất bại.                                                    |
| T15 | BE tích hợp VNPay Sandbox — UC-10      | Khó / Cao        | T14                | Lấy cấu hình sandbox; tạo URL redirect và reference; nhận IPN/return, kiểm tra chữ ký/số tiền/mã đơn/trạng thái. Test hủy, callback sai/lặp, timeout và đối soát. Chạy sandbox từ API/trình duyệt cổng thanh toán, chưa cần FE ứng dụng. |
| T16 | BE lịch sử và chi tiết — UC-19         | Trung bình / Vừa | T10, T12, T13, T14 | Lọc theo thời gian/trạng thái, phân trang, tổng số đơn/cước và chi tiết đơn của khách. Test rỗng, ngày sai, giới hạn phân trang và truy cập đơn người khác.                                                                              |
| T17 | BE báo cáo và xuất Excel — UC-15       | Trung bình / Vừa | T12, T13, T14      | Truy vấn chỉ tiêu theo quy tắc báo cáo; ngày/tuần/tháng và Excel dùng cùng bộ lọc. Phân quyền quản trị; test ngày sai, dữ liệu 0, join thanh toán không nhân đôi số tiền và lỗi xuất.                                                    |
| T18 | Hoàn thiện môi trường sandbox và API   | Trung bình / Cao | T05, T15           | Kiểm tra URL HTTPS nhận IPN có thể truy cập từ cổng, cấu hình từng môi trường, README và Postman. Chuẩn bị dữ liệu demo và cách chạy lại; thử timeout/lỗi mạng. Goong là mở rộng tùy chọn, không chặn mốc BE.                            |
| T19 | Kiểm thử tích hợp BE và sửa lỗi        | Khó / Cao        | T06–T18            | Chạy chuỗi 12 UC trên PostgreSQL; kiểm tra transaction, quyền, đồng thời và sandbox; ghi Expected/Actual/PASS-FAIL. Mọi FAIL có bug và retest. Test đã được viết theo từng task, không bắt đầu từ số 0 ở đây.                            |
| T20 | Mốc nghiệm thu backend                 | Trung bình / Cao | T19                | Đối chiếu tiêu chí mục 7; API đủ cho tất cả màn hình, Postman chạy xuyên suốt, sandbox có bằng chứng, build/test đạt; không còn lỗi chặn FE. Nhóm review và ghi kết luận trước khi mở giai đoạn C.                                       |

### C. Frontend sau khi backend đạt T20

| Mã  | Task                                 | Độ khó / ưu tiên | Phụ thuộc | Hướng dẫn và kết quả cần có                                                                                                                                                                       |
| --- | ------------------------------------ | ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T21 | Figma, UI Kit và prototype           | Trung bình / Cao | T20       | Thiết kế 12 màn hình theo mã của đề; luồng khách, tổng đài, điều phối, tài xế, quản trị. Review trước code; thống nhất component/màu/chữ/spacing, mobile và desktop, lỗi/rỗng/loading.            |
| T22 | FE nền tảng, đăng nhập và điều hướng | Trung bình / Cao | T21       | Dùng skeleton T02 làm layout, API client, session, điều hướng theo vai trò và MH-01. Hoàn thiện dashboard KH-01/QT-01; trạng thái tải/lỗi và focus bàn phím. BE vẫn là nơi kiểm tra quyền.        |
| T23 | FE tạo đơn và báo giá                | Trung bình / Cao | T22       | KH-02 cho khách/tổng đài: điểm lấy/giao, SĐT, kiện hàng, khách được chọn, cước và VIP. Đổi địa chỉ thì hết hiệu lực báo giá cũ; ngăn phản hồi cũ ghi đè, gửi lặp; hiển thị chế độ bản đồ giả lập. |
| T24 | FE điều phối                         | Trung bình / Vừa | T22       | DP-01/DP-02: đơn chờ, tài xế, chi tiết, gán và hủy theo quyền; xử lý tài xế vừa bận/không có tài xế; hỗ trợ tổng đài mở form tạo đơn T23.                                                         |
| T25 | FE tài xế                            | Trung bình / Vừa | T22       | TX-01/TX-02: đơn được gán, từ chối có lý do, lấy hàng/đang giao/hoàn tất và ghi sự cố. Hiển thị xác nhận thu tiền mặt theo quyền; tối ưu điện thoại, không cho bấm trạng thái không hợp lệ.       |
| T26 | FE thanh toán và kết quả             | Khó / Cao        | T22       | KH-03: cước snapshot, tiền mặt hoặc VNPay; redirect và quay về, chờ xác nhận/kiểm tra lại. Trạng thái lấy từ BE; không báo đã trả chỉ vì URL return báo thành công. Ghi rõ sandbox.               |
| T27 | FE theo dõi và lịch sử               | Trung bình / Vừa | T22       | KH-04/KH-05: trạng thái và nhật ký, hủy có lý do, lịch sử/lọc/tổng cước/chi tiết. Làm mới định kỳ có giới hạn, dừng khi rời màn hình; lỗi/rỗng rõ ràng; nối sang T26 khi đơn hoàn tất.            |
| T28 | FE báo cáo quản trị                  | Trung bình / Vừa | T22       | QT-02 nối từ QT-01: bộ lọc ngày/tuần/tháng, chỉ tiêu được đặt tên rõ, tải Excel đúng bộ lọc. Trạng thái không có dữ liệu và lỗi xuất; bảng dùng được trên màn hình hẹp.                           |

### D. Hoàn thiện sản phẩm và bảo vệ

| Mã  | Task                                   | Độ khó / ưu tiên | Phụ thuộc | Hướng dẫn và kết quả cần có                                                                                                                                                                                                                       |
| --- | -------------------------------------- | ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T29 | Usability, responsive và accessibility | Trung bình / Vừa | T23–T28   | Mời 3–5 người thử tạo đơn, điều phối, kiểm tra thanh toán; ghi mức hoàn thành, thời gian, lỗi và nhận xét. Kiểm tra điện thoại/bàn phím/label/tương phản; sửa vấn đề chính và thử lại. Đây là vòng đánh giá nhỏ.                                  |
| T30 | Test hệ thống và regression            | Khó / Cao        | T29       | Chạy đầy đủ 12 UC với FE/BE/DB và VNPay Sandbox; bổ sung test UI vào bảng có sẵn. Tổng hợp PASS/FAIL, bug, retest, Branch Coverage và các giới hạn còn lại; không bỏ nhánh lỗi chỉ để đạt số lượng.                                               |
| T31 | Hoàn thiện hồ sơ và truy vết           | Trung bình / Cao | T30       | Rà soát SRS/UC, ERD/Class/Sequence, Figma, API và code; sửa sai lệch, gắn test và bằng chứng. Tài liệu cập nhật từ T01 qua từng task; tại đây chốt phiên bản nộp, README và kết quả test.                                                         |
| T32 | Diễn tập demo và đóng gói bàn giao     | Trung bình / Cao | T31       | Seed/reset, hướng dẫn chạy, kiểm tra tài khoản/mạng/sandbox; diễn tập Main Flow và nhánh lỗi, trình bày ≥4 điểm truy vết. Chuẩn bị bằng chứng sandbox đã chạy nếu dịch vụ gián đoạn; không gọi minh họa offline là thanh toán sandbox thành công. |

Task thử nghiệm Goong có thể được tách riêng sau khi BE cơ sở ổn định; không tính là điều kiện bắt buộc của 32 task trên. Không đổi ý nghĩa mã T khi đã dùng để truy vết; nếu tách nhỏ thì dùng hậu tố hoặc liên kết subtasks.

## 7. Mốc nghiệm thu backend trước frontend

* T06–T18 hoàn tất; toàn bộ nghiệp vụ 12 UC và các nhánh đã chọn có thể kiểm thử không phụ thuộc FE ứng dụng.

* Schema/seed/migration khởi tạo lại được; Hibernate mapping khớp ERD nền, Class và Sequence đã được cập nhật theo code BE.

* API contract và Postman đủ cho đăng nhập, quyền, tạo đơn, điều phối, tiến trình, hủy, trả tiền, lịch sử, báo cáo và xuất file.

* Main Flow chạy qua API/DB thật của dự án; VNPay Sandbox đã thử thành công, hủy/thất bại và xác minh callback. Trang thanh toán của VNPay và phản hồi BE tối giản phục vụ tích hợp không tính là triển khai FE nghiệp vụ.

* Test unit/integration cho các nhánh BE đạt; test quyền, gán đồng thời, transaction rollback và thanh toán lặp có bằng chứng. Không còn bug Critical/High chặn nghiệp vụ hoặc tích hợp FE.

* CI build/test đạt. Các test dành cho UI được ghi chưa chạy/chờ FE; không báo toàn bộ test hệ thống đã PASS ở giai đoạn BE.

## 8. Cách nhận task và tiến độ dự kiến

* Không phân công sáu luồng hoặc vai trò cố định theo người. Cả 6 thành viên tự nhận task phù hợp sau khi kiểm tra phụ thuộc; người đang rảnh hỗ trợ test, tài liệu hoặc review trong giai đoạn hiện tại.

* Mỗi task có một người chịu trách nhiệm chính, có thể phối hợp nhiều người; ghi assignee trước khi làm để tránh trùng. Chọn một người khác review, ưu tiên phối hợp với task Khó.

* Trạng thái gợi ý: Backlog → Ready → In Progress → Review → Done; Blocked ghi nguyên nhân và task phụ thuộc. Không tính code xong là Done nếu thiếu test/tài liệu cần thiết.

* Chia nhánh feature/Txx hoặc feature/UC-xx; mọi thành viên có quyền push nhánh, merge qua Pull Request vào develop sau review/CI; main dành cho bản ổn định.

* Mọi thay đổi thiết kế/API ảnh hưởng task khác phải ghi lại và báo cho người liên quan. Không để một người cuối kỳ tự viết lại toàn bộ sơ đồ hoặc test của nhóm.

| Giai đoạn  | Khung 12 tuần tham khảo | Kết quả                                                                                |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------- |
| Nền tảng   | Tuần 1–2                | T01–T05, yêu cầu/thiết kế nền, môi trường và CI.                                       |
| Backend    | Tuần 3–6                | T06–T20; chia các task độc lập cho nhiều người; test/tài liệu làm theo từng chức năng. |
| Frontend   | Tuần 7–9, chỉ sau T20   | T21–T28; thiết kế và code bám API đã đạt mốc.                                          |
| Hoàn thiện | Tuần 10–12              | T29–T32; usability, regression, hồ sơ và dự phòng demo.                                |

Nếu học kỳ chỉ còn 10 tuần, giảm công mở rộng Goong và trang trí UI, gộp thời gian rà soát; không bỏ 12 UC, test bắt buộc hoặc mốc BE. Đây là khung ước lượng; cập nhật sau khi nhóm nhận task và chốt thiết kế.

## 9. Áp dụng bài giảng ở mức phù hợp

| Bài học                     | Cách áp dụng                                                                                                                                                                               | Bằng chứng / task                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| NoSQL                       | Không thêm NoSQL. Giải thích vì sao dữ liệu đơn–khách–tài xế–thanh toán hợp mô hình quan hệ; không coi JSON của REST là NoSQL.                                                             | Lý do lựa chọn CSDL trong T01.                                   |
| ORM                         | Hibernate/JPA mapping Entity, quan hệ, transaction và DAO.                                                                                                                          | T03 và test lưu/đọc/rollback.                                    |
| Design System và UI Kit     | Một bộ component và token nhỏ theo Material Design; có thể dùng MUI, không tự xây thư viện lớn.                                                                                            | Figma/T21 và component dùng lại T22–T28.                         |
| Figma và cộng tác           | Prototype 12 màn hình theo mã đề; review và ghi quyết định trước code FE.                                                                                                                  | T21 và liên kết Interface Design.                                |
| Responsive và Accessibility | Mobile cho khách/tài xế; desktop cho điều phối/quản trị; label, keyboard/focus, lỗi bằng chữ; tương phản chữ thường 4.5:1, chữ lớn 3:1. Không tuyên bố đạt toàn bộ WCAG chỉ từ tương phản. | T21–T29, checklist và lỗi đã sửa.                                |
| Usability Testing           | Một vòng 3–5 người ngoài nhóm, có kịch bản/quan sát/sửa/thử lại.                                                                                                                           | T29, không thay thế test chức năng.                              |
| Patterns và SOLID           | SRP Controller–Service–DAO; DIP/Adapter cho RouteProvider và thanh toán. Strategy chỉ khi chính sách đủ đa dạng.                                                                    | Sơ đồ và ví dụ code thực sự dùng; không thêm pattern hình thức.  |
| Class Diagram đến Code      | Thiết kế nền trước từng phần, code theo trách nhiệm đã thống nhất; đối chiếu ngược ở mốc BE và trước nộp. Sinh khung code là tùy chọn.                                                     | T01, T20, T31; tên class/method khớp thiết kế cuối.              |
| MVC/MVVM/Layered            | Layered 3 tầng là kiến trúc chính theo đề. Giải thích trách nhiệm; không ép áp dụng thêm MVC/MVVM.                                                                                         | T02, sơ đồ kiến trúc và luồng một UC.                            |
| State và bất đồng bộ        | State form cục bộ, dữ liệu dùng chung chỉ khi cần; chặn phản hồi báo giá cũ, loading/error/empty, thử lại có kiểm soát. Không mặc định Redux/WebSocket.                                    | T23, T26, T27 và test tương ứng.                                 |
| DevOps và CI/CD             | Build/test trên PR, Docker Compose, môi trường tái tạo được; CD tùy điều kiện.                                                                                                             | T05/T18, kết quả pipeline và README.                             |
| AI hỗ trợ lập trình         | Gợi ý test, giải thích lỗi, review; người làm kiểm tra theo UC và chạy test. Không gửi secret; ghi vài ví dụ đề xuất được chấp nhận/sửa/bác bỏ.                                            | PR và ghi chú chất lượng; không lấy AI thay bằng chứng kiểm thử. |

## 10. Kiểm thử, truy vết và quy ước chung

Mỗi UC: 1 Happy Path + 2 Negative/Invalid + 2 Boundary Value + ít nhất 1 test cho từng Alternative Flow. 72 là mức khởi điểm khi mỗi UC chỉ có một nhánh thay thế. Với 37 nhánh được liệt kê trong đặc tả, dự trù khoảng 97 case nếu tách riêng các nhóm; số cuối theo ma trận bao phủ, không nhân bản test chỉ để đủ số. Test biên phải dựa trên quy tắc có thật và được chốt ở T01.

* Viết case cùng task; unit test cho cước/VIP/thời gian; integration cho Hibernate/PostgreSQL, transaction, quyền và API; hệ thống cho UI + BE; usability là hoạt động riêng.

* Test tự động không gọi dịch vụ ngoài cho mọi lần chạy CI: dùng bản mô phỏng kiểm soát được và bộ integration sandbox chạy riêng. Kết quả sandbox thật phải có bằng chứng riêng.

* Ưu tiên test gán cùng tài xế/đơn đồng thời, hủy tranh chấp, chuyển trạng thái lặp, truy cập đơn người khác, callback lặp/sai/đến muộn, báo cáo không nhân bản tổng qua nhiều lần thử thanh toán.

* TC ID: TC-<số UC>-<số thứ tự>, ví dụ TC-14-01. Cột: UC, tiền điều kiện, dữ liệu, bước chạy, Expected, Actual, PASS/FAIL/Not Run, bằng chứng và bản build.

* Bug ID: BUG-N4-xxx theo đề. Mọi FAIL có Related TC, mô tả, bước tái hiện, Actual/Expected, Severity và kết quả retest; ghi nguyên nhân/file liên quan khi đã xác định.

* Báo cáo cuối: tổng case, đã chạy/chưa chạy, PASS/FAIL, Pass Rate với mẫu số rõ, lỗi nghiêm trọng, hướng xử lý và độ bao phủ. Dùng JaCoCo xem nhánh True/False quan trọng; không lấy số case thay Branch Coverage.

* Truy vết: REQ → UC/flow → task → Class/method → Sequence → Entity/bảng → màn hình/API → TC → bug/bằng chứng. Cho phép N/A có lý do nếu UC không có màn hình hoặc bảng riêng.

* Dùng tên class/method đúng với thiết kế đã duyệt; nếu Service tính cước thì sơ đồ phải thể hiện Service, không gán trách nhiệm cho DonHang chỉ để giống ví dụ đề.

* Quy ước DB snake_case, class PascalCase, biến/method camelCase; chọn nhất quán ngôn ngữ tên sau T01. Log đủ để tra lỗi, không log mật khẩu/secret. Lỗi nghiệp vụ trả 4xx có thông báo; lỗi hệ thống trả thông báo chung và mã để tra cứu.

## 11. Tiêu chí nghiệm thu và kịch bản demo

* Đủ 12 UC, actor và 12 màn hình theo đề; tổng đài dùng được form tạo đơn và chức năng hủy được phân quyền.

* 3 tầng rõ; GitHub/develop và quyền push đủ; /src /docs /tests có nội dung và hướng dẫn chạy.

* ERD/Class/Sequence/Interface Design/UC Spec được chốt ở phiên bản nộp và đối chiếu được với code; có seed và migration.

* Mọi Alternative Flow trong phạm vi mục 2 có xử lý; đủ test theo từng UC/flow, báo cáo Expected/Actual/PASS-FAIL và bug/retest.

* VNPay Sandbox được xác minh qua BE; trạng thái giao hàng/thanh toán tách biệt; chống gán trùng và ghi nhận thu tiền trùng.

* UI bám Figma, đáp ứng màn hình chính, hiển thị loading/error/empty; có bằng chứng usability và sửa lỗi chính.

* Demo Main Flow + ít nhất một Alternative Flow bằng hệ thống đang chạy; chỉ ra ít nhất 4 điểm truy vết theo đề. Không trình bày trạng thái dự kiến là kết quả đã kiểm chứng.

Main Flow: khách VIP đăng nhập → nhập đơn giao hoa từ các địa chỉ demo → xem khoảng cách/cước/giảm VIP → xác nhận tạo đơn → điều phối gán tài xế → tài xế xem đơn, lấy hàng, đang giao và hoàn tất → khách thanh toán qua VNPay Sandbox → BE nhận/xác minh kết quả → khách xem lịch sử → quản trị xem giá trị hoàn tất/tiền thực thu và xuất Excel.

Nhánh demo: hủy một đơn khác đã quá 5 phút hoặc tài xế vừa bận; có thể thêm callback lặp để chứng minh không thu/ghi nhận hai lần. Chuẩn bị dữ liệu quá hạn sẵn, không phải đợi 5 phút khi trình bày. Có tài khoản từng vai trò, seed reset, Postman, bảng test và đường dẫn code/thiết kế.

## 12. Rủi ro và cách xử lý

| Rủi ro                                     | Cách xử lý                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Chưa có Class/ERD chính thức               | Task T01 tạo thiết kế nền; review phần liên quan trước code; cập nhật sơ đồ khi trách nhiệm thay đổi.                                    |
| BE trước FE làm phát hiện thiếu API muộn   | T04 rà API theo toàn bộ danh sách màn hình/UC; T20 kiểm tra đủ dữ liệu trước chuyển giai đoạn; dành thời gian sửa tích hợp.              |
| Sandbox thiếu cấu hình hoặc không nhận IPN | Xác minh tài khoản/cấu hình ở giai đoạn nền, tích hợp T15 và hoàn thiện T18; cần endpoint HTTPS truy cập được. Không đợi làm FE mới thử. |
| Mạng/cổng thanh toán lỗi lúc demo          | Kiểm tra trước buổi demo; có log/bằng chứng lần chạy sandbox và cách trình bày giới hạn; không tự đánh dấu thanh toán thành công.        |
| Chưa chọn API bản đồ/giới hạn phí          | Dùng service giả lập cố định theo đề; Goong chỉ mở rộng sau khi xác minh key, điều kiện và hạn mức.                                      |
| Gán hoặc thanh toán đồng thời              | Transaction, ràng buộc dữ liệu và cập nhật có điều kiện; kiểm thử request đồng thời, lặp và sai thứ tự.                                  |
| Task tự pick gây lệch tải/chồng chéo       | Ghi người phụ trách, kiểm tra phụ thuộc, giới hạn việc đang làm; phối hợp/review task Khó; đánh giá tiến độ theo đầu ra.                 |
| Để test/tài liệu đến cuối                  | Bắt đầu tại T01, hoàn thiện theo từng task; T19/T30/T31 là tích hợp và rà soát, không phải lúc mới bắt đầu viết.                         |

## 13. Tài liệu và tham khảo triển khai

Tài liệu gốc: Yeu_cau_Cuoi_ky_He_thong_Giao_hang_Mini_Ong_Vang.docx. Đường dẫn GitHub, Figma, API và pipeline sẽ được nhóm bổ sung khi tạo. Trang này là kế hoạch; bảng work item và assignee trên Plane được cập nhật riêng khi nhóm phân rã/nhận việc.

* [VNPay — hướng dẫn tích hợp Sandbox](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)

* [VNPay — phân biệt Return và IPN](https://sandbox.vnpayment.vn/apis/docs/faqs/)

* [Goong — tài liệu API và hướng dẫn](https://help.goong.io/)

* [OSRM — tài liệu dịch vụ lộ trình](https://project-osrm.org/docs/v26.4.0/http)

* [Hibernate — ánh xạ đối tượng và dữ liệu](https://hibernate.org/orm/quickly/)

* [Material UI — thư viện component React](https://mui.com/material-ui/getting-started/)

* [Apache POI — xuất Excel bằng Java](https://poi.apache.org/components/spreadsheet/)

* [GitHub Actions — build và test tự động](https://docs.github.com/en/actions/get-started/understand-github-actions)

* [React — tổ chức state](https://react.dev/learn/choosing-the-state-structure)

* [W3C — độ tương phản chữ](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
