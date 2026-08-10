-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================
--
-- Fix loi khi xoa hoc sinh da co GhiNhan ca nhan: "new row for relation
-- ghi_nhan violates check constraint ghi_nhan_check". Nguyen nhan: FK
-- ghi_nhan.ma_hs -> hoc_sinh(ma_hs) dang dat "on delete set null" (migration
-- 20260722000100) - y dinh ban dau la khi xoa 1 hoc sinh, GIU LAI dong
-- ghi_nhan nhung go rieng lien ket ma_hs (coi nhu "khong ro em nao" thay vi
-- mat luon lich su). Nhung dieu nay chi hop le voi ghi_nhan dang gan voi 1
-- to (to_lien_quan) hoac dang cho xu ly tap the (trang_thai_xu_ly_tap_the
-- = 'chua_xu_ly') - dung theo dieu kien check da co san. Voi 1 dong GhiNhan
-- CA NHAN binh thuong (chi co ma_hs, khong co to_lien_quan, trang_thai mac
-- dinh la chuoi rong) thi set ma_hs = null se khong con thoa dieu kien check
-- nao ca, Postgres tu chan lai ngay khi cascade chay.
--
-- Theo dung nguyen tac da chot o docs/14-ra-soat-bien-dong-hoc-sinh.md muc 2
-- ("Khong bao gio xoa cung hoc sinh khi chuyen truong, chi cap nhat
-- ngay_roi_lop") va dung mau da dung cho danh_muc_diem (FK "on delete
-- restrict", chan xoa neu con GhiNhan tham chieu, giu nguyen ven du lieu
-- lich su thay vi lam gay/mo coi ban ghi) - doi FK ghi_nhan.ma_hs sang
-- "on delete restrict": neu hoc sinh da co it nhat 1 dong GhiNhan ca nhan,
-- Postgres se CHAN xoa hoc sinh do (loi ro rang, khong con cascade ngam gay
-- vo du lieu nua) - dung "Ngay roi lop" thay vi xoa that trong truong hop nay.
-- Khong co code nao trong app dang chu dong dua vao hanh vi SET NULL nay (da
-- grep xac nhan), nen doi an toan, khong anh huong luong nao khac.
alter table public.ghi_nhan drop constraint if exists ghi_nhan_ma_hs_fkey;

alter table public.ghi_nhan
  add constraint ghi_nhan_ma_hs_fkey
  foreign key (ma_hs) references public.hoc_sinh(ma_hs)
  on update cascade
  on delete restrict;
