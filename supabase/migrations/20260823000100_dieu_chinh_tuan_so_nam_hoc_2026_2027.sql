-- Giao vien bao: tuan bat dau 17/08/2026 dang hien "Tuan 7" nhung day la
-- Tuan 1 that su cua nam hoc 2026-2027 - cac tuan truoc do (tuan_so nho hon,
-- tu_ngay < 17/08/2026) la "tuan he" (con lai tu cach danh so lien tuc
-- khong nghi ngoi qua he cua nam hoc truoc), can dieu chinh lai.
--
-- An toan du lieu: 4 bang tham chieu cau_hinh_tuan(tuan_so) - ghi_nhan,
-- diem_danh, he_thong_dong_hanh (migration 20260806000100), rank_lich_su_tuan
-- (migration 20260808000100) - deu dat "on delete no action" (mac dinh, khong
-- khai bao) va "on update cascade". Vi vay:
--   - Neu cac "tuan he" truoc 17/08/2026 con du lieu that (ghi_nhan/diem_danh/
--     ...) gan voi chung, cau lenh DELETE ben duoi se BI POSTGRES TU CHAN
--     bao loi ro rang (foreign key violation) thay vi xoa nham lich su -
--     migration se dung lai, khong sua gi ca; luc do can xem lai du lieu
--     truoc khi chay tiep.
--   - Buoc renumber (UPDATE ... SET tuan_so = tuan_so - shift) tu dong keo
--     theo moi ban ghi ghi_nhan/diem_danh/dong_hanh/rank_lich_su_tuan cua cac
--     tuan con lai nho "on update cascade" - khong can dong nao khac.

do $$
declare
  anchor_tuan_so integer;
  shift_amount integer;
begin
  select tuan_so into anchor_tuan_so
  from public.cau_hinh_tuan
  where tu_ngay = '2026-08-17';

  if anchor_tuan_so is null then
    raise exception 'Khong tim thay tuan co tu_ngay = 2026-08-17 trong cau_hinh_tuan - kiem tra lai du lieu (co the ngay khong dung, hoac tuan chua duoc tao) truoc khi chay migration nay.';
  end if;

  if anchor_tuan_so = 1 then
    raise notice 'Tuan bat dau 17/08/2026 da la Tuan 1 - khong can dieu chinh.';
    return;
  end if;

  -- Xoa cac "tuan he" truoc 17/08/2026 (se tu chan neu con du lieu that).
  delete from public.cau_hinh_tuan where tu_ngay < '2026-08-17';

  -- Danh lai so tuan tu 1, giu nguyen thu tu tuong doi cac tuan con lai
  -- (ke ca tuan sau 17/08/2026 neu da duoc he thong tu tao san truoc).
  shift_amount := anchor_tuan_so - 1;

  update public.cau_hinh_tuan
  set tuan_so = tuan_so - shift_amount
  where tu_ngay >= '2026-08-17';

  raise notice 'Da danh lai so tuan: tuan 17/08/2026 tu Tuan % thanh Tuan 1 (giam % don vi cho cac tuan con lai).', anchor_tuan_so, shift_amount;
end $$;
