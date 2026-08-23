-- Sua lo thang do "Diem hoc tap" trong bang cau hinh diem_cau_hinh_thanh_phan
-- (seed sai o migration 20260808000500_tao_bang_cau_hinh_cong_thuc_diem.sql).
--
-- Doi chieu file Excel that truong dang dung (THI_DUA_CS2_NH_26-27.xlsx, tuan 01
-- nam hoc 2026-2027, xem docs/03-he-thong-diem-ren-luyen.md muc 3 sua 23/08/2026):
-- cot "DIEM HOC TAP" luon duoc dien gia tri 100 khi chua co du lieu, khong phai 20
-- - nghia la truong coi Diem hoc tap la thang 0-100 ngang hang 4 thanh phan con lai
-- (diem_so_mon da luu san o thang 0-100), KHONG PHAI thang 0-10 nhu seed cu gia dinh.
--
-- 3 cot can sua:
--   thang_goc_max: 10 -> 100 (diem_so_mon la 0-100, khong phai 0-10)
--   he_so_chuan_hoa: 10 -> 1 (khong con can nhan 10 de quy ve thang 100 nua)
--   bat_buoc: false -> true (khi tuan chua co diem so nao, van tinh vao mau so 6
--     voi gia tri mac dinh = thang_goc_max = 100, thay vi bi loai khoi mau so
--     lam mau so "roi ve 4" nhu truoc - xem quyet dinh 23/08/2026 o docs/03 muc 4/7)

update public.diem_cau_hinh_thanh_phan
set thang_goc_max = 100,
    he_so_chuan_hoa = 1,
    bat_buoc = true
where ma_thanh_phan = 'HT';
