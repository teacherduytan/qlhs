-- Sua so dien thoai bi mat so 0 dau (vd "966936362" phai la "0966936362").
-- Day la loi du lieu, khong phai loi hien thi: cot sdt_1/sdt_2/phu_huynh.sdt
-- deu la kieu text nen Postgres khong tu lam mat so 0, nhung du lieu nhap/
-- import truoc do (vi du tu Excel/Sheet coi o la so) da bi mat san so 0.
-- Vi sdt_1 cung dung lam "username" dang nhap trang cong khai ho so (C182),
-- sua o day se sua dong thoi ca hien thi lan dang nhap - RPC lay_ho_so_cong_khai
-- so 3 so cuoi (right(sdt_1, 3)) lam mat khau, khong doi vi them so 0 o dau
-- khong anh huong 3 ky tu cuoi.
--
-- Chi sua truong hop dung 9 chu so lien tuc, khong co dau cach/gach ngang,
-- va khong da bat dau bang so 0 (dieu kien '^[1-9][0-9]{8}$') de tranh dong
-- vao du lieu da dung dinh dang hoac so dien thoai ban dau khong phai VN.

update public.hoc_sinh
set sdt_1 = '0' || sdt_1
where sdt_1 ~ '^[1-9][0-9]{8}$';

update public.hoc_sinh
set sdt_2 = '0' || sdt_2
where sdt_2 ~ '^[1-9][0-9]{8}$';

update public.phu_huynh
set sdt = '0' || sdt
where sdt ~ '^[1-9][0-9]{8}$';
