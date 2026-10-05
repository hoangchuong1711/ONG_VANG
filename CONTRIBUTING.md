# CONTRIBUTING

Tài liệu này quy định cách nhóm làm việc với Git, branch, commit, Pull Request và trạng thái task trên Plane.

## 1. Workflow chung

```text
Ready
  ↓
In Progress
  ↓
Tạo branch riêng cho task
  ↓
Code + Test + Docs
  ↓
Push + tạo Pull Request vào develop
  ↓
In Review
  ↓
CI + Code Review
  ↓
Merge vào develop
  ↓
Done
  ↓
Pull develop mới nhất
  ↓
Nhận task tiếp theo
```

Quy tắc chính:
- Không code trực tiếp trên `main` hoặc `develop`.
- Mỗi task trên Plane dùng một branch riêng.
- Mỗi task hoàn thành phải có một Pull Request vào `develop`.
- Task chỉ được `Done` khi PR đã được review, CI pass và merge vào `develop`.
- Task phụ thuộc chỉ bắt đầu khi phần cần dùng đã được merge vào `develop`.

---

## 2. Trạng thái task trên Plane

- `Backlog`: Task chưa đủ điều kiện làm.
- `Ready`: Task đã đủ điều kiện và các phụ thuộc đã `Done`/merge.
- `In Progress`: Đang thực hiện task.
- `In Review`: Đã tạo PR, đang chờ CI/review/merge.
- `Done`: PR đã merge vào `develop`.
- `Cancelled`: Task bị hủy.

---

## 3. Bắt đầu một task

Luôn cập nhật `develop` trước:

```bash
git checkout develop
git pull origin develop
```

Tạo branch riêng:

```bash
git checkout -b <type>/<task-id>-<short-description>
```

Ví dụ:

```bash
git checkout -b feat/t06-auth-api
git checkout -b feat/t10-create-order
git checkout -b fix/t13-cancel-order-time
git checkout -b docs/t04-api-contract
```

Các `type` dùng trong nhóm:
- `feat`: chức năng mới
- `fix`: sửa lỗi
- `refactor`: chỉnh cấu trúc code, không đổi chức năng
- `docs`: tài liệu
- `test`: test
- `chore`: cấu hình hoặc công việc hỗ trợ
- `build`: build, Maven, Docker
- `ci`: GitHub Actions, CI


## 5. Quy tắc commit

Dùng Conventional Commits:

```text
<type>(<scope>): <description>
```

Ví dụ:

```text
feat(auth): add login endpoint
feat(order): implement order creation
fix(payment): prevent duplicate payment
test(auth): add invalid login tests
docs(api): document authentication endpoints
ci(github): add pull request workflow
```

Quy tắc:
- Description ngắn gọn, viết thường, dùng tiếng Anh.
- Không dùng commit chung chung như `update`, `fix bug`, `done`, `code`.

---

## 6. Trong quá trình làm task

Mỗi task cần cập nhật đầy đủ phần liên quan nếu có:
- Code
- Test
- API/Postman
- Tài liệu
- Thiết kế/truy vết

Không để toàn bộ test và tài liệu đến cuối dự án mới làm.

Nếu cần lấy thay đổi mới từ `develop` trong lúc đang làm:

```bash
git checkout develop
git pull origin develop
git checkout <task-branch>
git merge develop
```

Nếu conflict, resolve rồi commit lại.

---


## 8. Code Review và CI

PR phải được ít nhất một thành viên khác review.

Reviewer kiểm tra:
- Code đúng phạm vi task.
- Đúng kiến trúc Controller → Service → Repository.
- Xử lý error/alternative flow cần thiết.
- Test phù hợp.
- Không commit secret/API key/password.
- API/DB/tài liệu đã cập nhật nếu có thay đổi.

GitHub Actions chạy build/test trên PR.

Nếu review hoặc CI fail:
- Sửa trên cùng branch.
- Commit và push tiếp.
- PR tự cập nhật.
- Task vẫn giữ `In Review`.

Chỉ merge khi:
- CI pass.
- Reviewer approve.
- Không còn comment cần xử lý.
- Không có conflict với `develop`.

---

## 9. Sau khi merge

Sau khi PR merge vào `develop`:
- Chuyển task trên Plane sang `Done`.
- Có thể xóa branch task.
- Trước khi nhận task mới, cập nhật lại `develop`:

```bash
git checkout develop
git pull origin develop
```

Sau đó mới tạo branch cho task tiếp theo.

Không tiếp tục task mới trên branch cũ.

---

## 10. Task phụ thuộc

Nếu task B phụ thuộc task A, task B chỉ bắt đầu khi task A đã:
- `Done` trên Plane.
- Merge vào `develop`.

Ưu tiên lấy code từ `develop`, không phụ thuộc trực tiếp vào branch chưa merge của thành viên khác.

Ví dụ:

```text
T06 ──PR──> develop
T09 ──PR──> develop
             ↓
            T10
```

---

## 11. Vai trò của main và develop

- `main`: bản ổn định, dùng cho demo/nộp/release.
- `develop`: branch tích hợp chính của nhóm.
- Các branch task merge vào `develop`.
- Khi đủ ổn định, `develop` mới merge lên `main`.

```text
feature / fix / docs / test
            ↓
          develop
            ↓
           main
```

---

## 12. Bug sau khi merge

Nếu phát hiện lỗi ở code đã merge:
- Tạo bug trên Plane.
- Không quay lại branch task cũ.
- Tạo branch mới từ `develop`.

```bash
git checkout develop
git pull origin develop
git checkout -b fix/<bug-id>-<description>
```

Ví dụ:

```bash
git checkout -b fix/bug-n4-003-duplicate-payment
```

Bug cũng đi theo quy trình PR → Review → CI → Merge → Done.

---

## 13. Không commit secret

Không commit:
- `.env`
- database password
- VNPay secret key
- API key
- token

Chỉ commit file mẫu như:

```text
.env.example
```

---

## 14. Checklist trước khi tạo PR

- [ ] Đúng task và đúng branch.
- [ ] Code đúng phạm vi task.
- [ ] Build thành công.
- [ ] Test liên quan đã chạy.
- [ ] Không commit secret.
- [ ] Tài liệu/API đã cập nhật nếu cần.
- [ ] Commit message đúng convention.
- [ ] Branch đã push lên GitHub.

## 15. Checklist trước khi merge

- [ ] CI pass.
- [ ] Có reviewer khác approve.
- [ ] Không còn review comment chưa xử lý.
- [ ] Không có conflict.
- [ ] Test cần thiết đã hoàn thành.
- [ ] PR target đúng `develop`.

Sau merge:
- [ ] Plane → `Done`.
- [ ] Xóa branch nếu không còn dùng.
- [ ] Pull `develop` mới nhất trước task tiếp theo.
