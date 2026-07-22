# Hướng dẫn: chuyển đăng nhập từ Apps Script token sang Supabase Auth

> **Trạng thái: cả 3 điều kiện tiên quyết đã xong, có thể bắt đầu code ngay:**
> - Migration đã `db push` thành công lên project thật (8 bảng + RLS đã tồn tại)
> - Tài khoản giáo viên đã tạo trong Authentication → Users
> - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` đã điền sẵn ở mục 3 bên dưới
>
> Đưa file này cho IDE AI. Mục tiêu: bỏ luồng đăng nhập cũ (gọi Apps Script lấy session token, tự lưu vào sessionStorage), thay bằng Supabase Auth — để khớp với RLS policy `to authenticated` đã tạo ở migration `20260722000100_tao_bang_ban_dau_qlhs.sql`.

> Cập nhật 22/07/2026 (C119): frontend đã chuyển đăng nhập giáo viên sang Supabase Auth. Trong giai đoạn chuyển đổi, các nghiệp vụ ghi/import/báo cáo sĩ số vẫn đi qua Apps Script, nhưng frontend gửi `supabase_access_token` và Apps Script xác minh token qua Supabase Auth API trước khi cho ghi dữ liệu.

## 1. Tạo tài khoản giáo viên (làm tay trên Dashboard, không cần code)

Vào Supabase Dashboard → **Authentication → Users → Add user** → nhập email + mật khẩu cho từng giáo viên cần đăng nhập.

Lưu ý: Supabase Auth yêu cầu định dạng email hợp lệ để đăng nhập bằng mật khẩu, không bắt buộc phải là hộp thư thật đang dùng (ví dụ `tan@lachong.local` vẫn hợp lệ nếu không muốn dùng email cá nhân).

## 2. Cài thư viện client

```bash
npm install @supabase/supabase-js
```

## 3. Thêm biến môi trường

Tạo/thêm vào file `.env` (đã có trong `.gitignore`, không commit):

```
VITE_SUPABASE_URL=https://zupkcgfjkckrbemptaiv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1cGtjZ2Zqa2NrcmJlbXB0YWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA2NjcsImV4cCI6MjEwMDI4NjY2N30.qz4iOi1hj-PIpcC1anYPLYpiFkdt1crzc98BlwcmrmM
```

> Đã điền sẵn giá trị thật (project của thầy Tân). Đây là `anon` key — an toàn khi đưa vào frontend, không phải bí mật cần giấu.

`anon` key an toàn khi đưa vào frontend — quyền hạn thực tế do RLS policy kiểm soát, không phải do giấu key.

## 4. Tạo file client dùng chung

`src/lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## 5. Thay logic đăng nhập

Bỏ đoạn gọi Apps Script lấy token, thay bằng:

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

Nếu `error` khác null → hiện thông báo sai email/mật khẩu. Nếu thành công, `supabase-js` tự quản lý phiên đăng nhập — **không cần tự tay lưu token vào sessionStorage như trước**.

## 6. Thay cách kiểm tra "đã đăng nhập chưa"

Chỗ nào đang đọc token từ sessionStorage để kiểm tra trạng thái đăng nhập, thay bằng:

```ts
const { data: { session } } = await supabase.auth.getSession();
// session === null → chưa đăng nhập
```

Nếu cần tự động cập nhật giao diện khi đăng nhập/đăng xuất ở nơi khác (ví dụ mở nhiều tab), dùng thêm:

```ts
supabase.auth.onAuthStateChange((_event, session) => {
  // cập nhật state của app theo session mới
});
```

## 7. Thay đăng xuất

```ts
await supabase.auth.signOut();
```

## 8. Thay các lời gọi API cũ (fetch tới Apps Script)

Đích cuối cùng: mọi chỗ đang `fetch()` tới URL Apps Script để đọc/ghi dữ liệu sẽ thay bằng gọi trực tiếp qua `supabase` client, ví dụ:

```ts
const { data, error } = await supabase
  .from('ghi_nhan')
  .select('*')
  .eq('tuan_so', tuanHienTai);
```

Sau khi đăng nhập thành công, mọi request qua `supabase` client tự động đính kèm JWT của phiên đăng nhập — khớp với policy `to authenticated` đã tạo, không cần tự thêm header xác thực thủ công.

Trạng thái C119: chưa chuyển hết tầng dữ liệu sang Supabase vì Apps Script vẫn đang giữ các nghiệp vụ chưa thay thế như import, tạo mã ghi nhận, xoá theo lần import, xử lý sự kiện tập thể, báo cáo sĩ số và build Google Form prefill. Các request Apps Script hiện dùng `supabase_access_token` thay cho `teacher_session_token` cũ.

## 9. Không được xóa ngay Apps Script/Sheets

Giữ nguyên Apps Script + Sheets song song một thời gian làm bản đối chiếu, chỉ gỡ bỏ sau khi đã xác nhận toàn bộ chức năng chạy ổn qua Supabase.

## 10. Checklist kiểm tra thật trong trình duyệt (bắt buộc, không chỉ đọc code)

- [ ] Đăng nhập đúng email/mật khẩu → vào được app
- [ ] Đăng nhập sai mật khẩu → báo lỗi rõ ràng, không crash
- [ ] Sau khi đăng nhập, đọc được dữ liệu bảng `hoc_sinh`/`ghi_nhan` (không bị chặn bởi RLS)
- [ ] Khi CHƯA đăng nhập, thử gọi API trực tiếp (hoặc mở tab ẩn danh) → bị chặn, không đọc được dữ liệu
- [ ] Đăng xuất xong, quay lại app phải yêu cầu đăng nhập lại, không còn giữ dữ liệu cũ
- [ ] `service_role` key không xuất hiện ở bất kỳ đâu trong code frontend
