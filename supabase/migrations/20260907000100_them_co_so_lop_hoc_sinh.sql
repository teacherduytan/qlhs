-- Chuan bi cho tinh nang thu thap thong tin lien lac/CCCD hoc sinh CS2 (spec
-- 16/17, xem docs/thuthapthongtincs2/) - se dung CHUNG bang hoc_sinh cho ca
-- lop 11C5 (dang quan ly trong app nay) va ~2000 hoc sinh CS2 khac (nhieu
-- lop khac) sap duoc import.
--
-- QUAN TRONG: 11C5 CUNG thuoc co_so 'CS2' (Tan xac nhan) - diem phan biet
-- DUY NHAT giua "hoc sinh cua toi" va "hoc sinh CS2 khac" la cot `lop`, KHONG
-- phai `co_so`. Vi vay moi noi trong app 11C5 hien dang doc bang hoc_sinh ma
-- KHONG loc theo lop deu co nguy co lay nham hoc sinh cua lop khac ngay khi
-- co du lieu CS2 - da ra soat va vieted lai o migration nay + code TS di kem
-- (SupabaseDataSource.ts getStudents()/addStudent()).
alter table public.hoc_sinh
  add column if not exists lop text,
  add column if not exists co_so text;

-- Backfill toan bo 40 em hien co ve dung gia tri that (khong dung DEFAULT o
-- muc cot, vi DEFAULT se ap dung nham cho ca cac dot import CS2 sau nay neu
-- ho quen truyen gia tri).
update public.hoc_sinh set lop = '11C5', co_so = 'CS2' where lop is null;

-- lay_du_lieu_lop_truong (spec: 20260725000100_lop_truong_de_xuat_ghi_nhan.sql)
-- tra ve roster cho man "Nhap de xuat ghi nhan cho lop" (lop truong dung) -
-- truoc day lay TOAN BO hoc_sinh dang hoc (ngay_roi_lop is null) khong loc
-- lop, se lan hoc sinh CS2 khac vao danh sach chon cua 11C5 ngay khi co du
-- lieu CS2. Them dieu kien hs.lop = '11C5'.
create or replace function public.lay_du_lieu_lop_truong(p_token text, p_pin text)
returns table (
  students jsonb,
  catalog jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs_lt text;
begin
  v_ma_hs_lt := public._qlhs_lop_truong_ma_hs(p_token, p_pin);
  if v_ma_hs_lt is null then
    return;
  end if;

  return query
  select
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('ma_hs', hs.ma_hs, 'ho', hs.ho, 'ten', hs.ten, 'tt', hs.tt)
          order by hs.tt
        )
        from public.hoc_sinh hs
        where hs.ngay_roi_lop is null
          and hs.lop = '11C5'
      ),
      '[]'::jsonb
    ) as students,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ma_danh_muc', dm.ma_danh_muc,
            'nhom', dm.nhom,
            'ten_muc', dm.ten_muc,
            'diem', dm.diem,
            'pham_vi', dm.pham_vi
          )
          order by dm.nhom, dm.ma_danh_muc
        )
        from public.danh_muc_diem dm
        where dm.pham_vi = 'ca_nhan'
      ),
      '[]'::jsonb
    ) as catalog;
end;
$$;
