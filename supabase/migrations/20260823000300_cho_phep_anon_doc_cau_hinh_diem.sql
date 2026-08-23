-- 4 bang cau hinh cong thuc diem (diem_cau_hinh_thanh_phan, diem_cau_hinh_he_so_dieu_kien,
-- diem_nguong_xep_loai, diem_cau_hinh_chung) hien chi co policy "authenticated can manage"
-- (migration 20260808000500) - vai tro anon (hoc sinh/phu huynh dang nhap qua RPC cong khai
-- lay_ho_so_cong_khai*, KHONG di qua Supabase Auth nen van la anon) khong doc duoc, buoc
-- StudentProfilePage.tsx phai luon dung fallback mac dinh trong scoring.ts thay vi cau hinh
-- that tren Supabase - nghia la sua cau hinh qua RuleManagerPage khong anh huong diem hien
-- thi that cho hoc sinh xem tren trang ca nhan.
--
-- Du lieu 4 bang nay CHI la tham so cong thuc (trong so, nguong xep loai, he so dieu kien...),
-- khong chua thong tin ca nhan/rieng tu nao - an toan de cho phep doc cong khai (chi SELECT,
-- khong duoc sua/xoa).

create policy "anon can read diem_cau_hinh_thanh_phan" on public.diem_cau_hinh_thanh_phan
  for select to anon using (true);
create policy "anon can read diem_cau_hinh_he_so_dieu_kien" on public.diem_cau_hinh_he_so_dieu_kien
  for select to anon using (true);
create policy "anon can read diem_nguong_xep_loai" on public.diem_nguong_xep_loai
  for select to anon using (true);
create policy "anon can read diem_cau_hinh_chung" on public.diem_cau_hinh_chung
  for select to anon using (true);
