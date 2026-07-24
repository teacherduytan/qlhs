# Spec: giao diện điểm danh Chính khóa cho giáo viên

> Xác nhận quan trọng: **hiện chưa có bất kỳ giao diện nào để giáo viên tự đánh dấu điểm danh** — dữ liệu 4 tuần vừa qua chỉ có từ import SQL lịch sử. Đây là tính năng mới, không phải mở rộng cái đã có. Không có UI này, giáo viên không có cách nào ghi điểm danh cho các ngày sắp tới.
>
> Phạm vi: chỉ nhóm `CHINH_KHOA`. Vị trí: 1 trang mới, đặt cạnh "Báo cáo sĩ số". Quyền xem/sửa: chỉ giáo viên đã đăng nhập (RLS `authenticated` đã có sẵn, không cần thêm).
>
> Đưa file này cho IDE AI.

## 1. Bố cục trang

1. Bộ chọn phạm vi thời gian: 3 tab **Ngày / Tuần / Tháng** — đổi tab thì đổi cách tính số liệu tổng quan (mục 2) và bộ lọc bên dưới (chọn ngày cụ thể, chọn tuần từ `cau_hinh_tuan`, hoặc chọn tháng).
2. 3 thẻ số liệu tổng quan (mục 2).
3. Lưới điểm danh theo tuần, chỉ hiện ô có ngoại lệ (mục 3) — luôn hiển thị theo tuần đang chọn (nếu tab đang là Ngày/Tháng, lưới hiển thị tuần chứa ngày/tháng đó).
4. Danh sách "Cần liên lạc phụ huynh" (mục 5) — **không phụ thuộc bộ lọc thời gian ở trên**, luôn hiện toàn bộ các lượt vắng chưa liên lạc từ trước tới nay, vì đây là việc cần xử lý bất kể đang xem ngày/tuần nào.

## 2. Số liệu tổng quan — theo ngày / tuần / tháng

```sql
-- Theo ngày (1 ngày cụ thể, gộp cả 2 buổi)
select trang_thai, count(*) from public.diem_danh
where ma_nhom = 'CHINH_KHOA' and ngay = :ngay
group by trang_thai;

-- Theo tuần
select trang_thai, count(*) from public.diem_danh
where ma_nhom = 'CHINH_KHOA' and tuan_so = :tuan_so
group by trang_thai;

-- Theo tháng
select trang_thai, count(*) from public.diem_danh
where ma_nhom = 'CHINH_KHOA' and date_trunc('month', ngay) = date_trunc('month', :ngay_bat_ky_trong_thang::date)
group by trang_thai;
```

**Tỷ lệ chuyên cần** = 1 − (số lượt vắng+trễ / tổng số lượt có thể có). Tổng số lượt có thể có = 36 học sinh × `cau_hinh_tuan.so_ngay` (của tuần/khoảng đang xét) × 2 buổi. Với "theo tháng", cộng dồn qua các tuần có `tu_ngay` rơi vào tháng đó — đây là cách tính gần đúng khi tuần giao giữa 2 tháng, không cần chính xác tuyệt đối, có thể điều chỉnh nếu thầy Tân thấy lệch.

## 3. Lưới điểm danh — chỉ ô ngoại lệ

```sql
select hs.ma_hs, hs.ho, hs.ten, dd.ngay, dd.buoi, dd.trang_thai
from public.thanh_vien_nhom_diem_danh tv
join public.hoc_sinh hs on hs.ma_hs = tv.ma_hs
left join public.diem_danh dd
  on dd.ma_hs = hs.ma_hs and dd.ma_nhom = 'CHINH_KHOA' and dd.tuan_so = :tuan_so
where tv.ma_nhom = 'CHINH_KHOA'
order by hs.tt;
```

Render: mỗi học sinh 1 dòng, mỗi ngày trong tuần 1 cột. Ô rỗng (không có dòng `diem_danh` khớp) = hiện icon "có mặt" nhạt màu. Ô có dữ liệu = hiện badge màu theo `trang_thai` (vắng có phép/vắng không phép/trễ dùng 3 màu khác nhau, nhất quán xuyên suốt trang).

## 4. Bấm vào ô để sửa — RPC upsert/xóa

Bấm 1 ô (học sinh + ngày) mở khung nhỏ: 2 dropdown (buổi sáng/chiều, mỗi buổi 1 trong 4 lựa chọn: Có mặt/Vắng có phép/Vắng không phép/Trễ), và phần liên lạc phụ huynh (dropdown hình thức + textarea nội dung) chỉ hiện khi buổi nào đó không phải "Có mặt".

```sql
create or replace function public.upsert_diem_danh(
  p_ma_hs text,
  p_ngay date,
  p_tuan_so integer,
  p_buoi text,
  p_trang_thai text  -- null hoặc 'co_mat' nghĩa là xóa, trả về trạng thái có mặt
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_trang_thai is null or p_trang_thai = 'co_mat' then
    delete from public.diem_danh
    where ma_nhom = 'CHINH_KHOA' and ma_hs = p_ma_hs and ngay = p_ngay and buoi = p_buoi;
    return null;
  end if;

  insert into public.diem_danh (ma_nhom, ma_hs, ngay, tuan_so, buoi, trang_thai, nguoi_ghi)
  values ('CHINH_KHOA', p_ma_hs, p_ngay, p_tuan_so, p_buoi, p_trang_thai, auth.jwt() ->> 'email')
  on conflict (ma_nhom, ma_hs, ngay, buoi) where ma_hs is not null
  do update set trang_thai = excluded.trang_thai, nguoi_ghi = excluded.nguoi_ghi
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_diem_danh(text, date, integer, text, text) to authenticated;
```

Ghi chú cho IDE AI: cột `nguoi_ghi` nên gán bằng email giáo viên đang đăng nhập — kiểm tra hàm nào khả dụng trong phiên bản Supabase đang dùng (`auth.jwt() ->> 'email'` là cách chắc chắn hoạt động; `auth.email()` có ở một số bản, cần tự xác nhận trước khi dùng).

Sau khi RPC trả về `v_id` (khác null), nếu giáo viên có điền hình thức + nội dung liên lạc, insert thêm 1 dòng vào `lien_lac_phu_huynh` với `diem_danh_id = v_id` (gọi trực tiếp qua `supabase.from('lien_lac_phu_huynh').insert(...)`, không cần gộp vào RPC).

Nút "Lưu" gọi RPC cho từng buổi có thay đổi (tối đa 2 lần gọi/lần lưu, 1 cho sáng 1 cho chiều nếu cả 2 đều đổi).

## 5. Danh sách "Cần liên lạc phụ huynh"

```sql
select dd.id, hs.ho, hs.ten, dd.ngay, dd.buoi, dd.trang_thai
from public.diem_danh dd
join public.hoc_sinh hs on hs.ma_hs = dd.ma_hs
left join public.lien_lac_phu_huynh ll on ll.diem_danh_id = dd.id
where dd.ma_nhom = 'CHINH_KHOA'
  and dd.trang_thai in ('vang_co_phep', 'vang_khong_phep')
  and ll.id is null
order by dd.ngay desc;
```

Mỗi dòng có nút "Ghi nhận" — bấm mở đúng khung liên lạc phụ huynh (giống mục 4, nhưng chỉ phần liên lạc, không cần đổi lại trạng thái điểm danh vì đã có sẵn).

## 6. Nguyên tắc giữ nguyên

- Không tự tạo `ghi_nhan` chuyên cần từ đây — việc đó vẫn đang chờ chốt rubric (đã ghi ở file thiết kế điểm danh trước), không liên quan tới UI này.
- Dữ liệu `diem_danh` không có cơ chế xóa tự động theo thời gian — giữ mãi mãi theo đúng vòng đời app, không cần thêm logic dọn dẹp.
- Sau khi code xong, **tự kiểm tra thật trong trình duyệt**: đánh dấu 1 học sinh vắng cho 1 ngày trong tương lai gần, xác nhận xuất hiện đúng trong lưới và trong danh sách "cần liên lạc". Bấm lại về "Có mặt", xác nhận dòng đó biến mất khỏi cả lưới và `diem_danh` (không phải chỉ ẩn trên UI).

## 7. Checklist trước khi báo hoàn thành

- [x] 3 tab Ngày/Tuần/Tháng đều có logic tính số liệu theo phạm vi tương ứng
- [x] Lưới chỉ hiện ô ngoại lệ, ô không có `diem_danh` hiển thị có mặt nhạt màu
- [x] RPC `upsert_diem_danh` đã kiểm transaction rollback: chọn trạng thái vắng tạo dòng; chọn lại `co_mat` xóa dòng khỏi `diem_danh`
- [x] Ghi liên lạc phụ huynh đã kiểm transaction rollback: insert đúng `diem_danh_id`
- [x] Danh sách "cần liên lạc" được tải lại sau khi ghi nhận trong UI code
- [x] Trang nằm trong layout giáo viên, chỉ truy cập sau khi đăng nhập Supabase Auth như các trang quản lý khác
- [ ] Chưa tự bấm UI thật bằng trình duyệt đăng nhập giáo viên vì `.env` không có tài khoản test/session Supabase Auth
