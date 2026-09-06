-- Mo rong cau hinh tuan tu Thu Hai-Thu Sau (5 ngay) thanh Thu Hai-Chu Nhat
-- (7 ngay) - truong co lich hoc/diem danh ca ngay Chu Nhat, nhung cau_hinh_tuan
-- truoc gio chi cau hinh den_ngay = tu_ngay + 4 (Thu Sau). Hau qua: moi ngay
-- Thu Bay/Chu Nhat khong khop dieu kien "tu_ngay <= ngay <= den_ngay" cua
-- BAT KY tuan nao, khien RPC tinh_bao_cao_si_so (dung dieu kien nay, KHONG
-- co fallback) bao loi "Ngay nay chua co trong lich diem danh." cho moi lan
-- xem bao cao si so vao 2 ngay do.
--
-- Chi NOI RONG den_ngay (khong doi tu_ngay) - khong xoa/doi du lieu
-- ghi_nhan/diem_danh da co (chi mo rong PHAM VI ngay ma 1 tuan_so bao phu,
-- khong doi tuan_so cua ban ghi nao). De AN TOAN tuyet doi voi du lieu that
-- (phong truong hop co tuan nao do khoang cach tu_ngay khac 7 ngay binh
-- thuong - vd tuan nghi le/tuan dac biet), CHOT den_ngay o gia tri nho hon
-- giua "tu_ngay + 6" va "tu_ngay cua tuan ke tiep - 1 ngay" (neu co tuan ke
-- tiep) - dam bao khong bao gio chong lan pham vi voi tuan sau, dung 1 lan
-- cho ca lich su lan tuan tuong lai da lo truoc.
with next_start as (
  select
    c.tuan_so,
    c.tu_ngay,
    (
      select min(n.tu_ngay)
      from public.cau_hinh_tuan n
      where n.tu_ngay > c.tu_ngay
    ) as tu_ngay_ke_tiep
  from public.cau_hinh_tuan c
),
target as (
  select
    tuan_so,
    least(
      tu_ngay + 6,
      coalesce(tu_ngay_ke_tiep - 1, tu_ngay + 6)
    ) as den_ngay_moi
  from next_start
)
update public.cau_hinh_tuan c
set den_ngay = t.den_ngay_moi,
    so_ngay = (t.den_ngay_moi - c.tu_ngay + 1)
from target t
where t.tuan_so = c.tuan_so
  and c.den_ngay < t.den_ngay_moi;
