-- Spec 18 (docs/thuthapthongtincs2/18-bo-sung-auto-sinh-ma-hs.md), dieu
-- chinh theo kien truc thuc te da chot o C291: kiem tra trung ma_hs voi
-- CS2_HOC_SINH (bang rieng cua CS2), khong phai hoc_sinh (bang cua 11C5,
-- da khong con dung chung du lieu voi CS2 nua). Muc dich khong doi: "Them
-- nhanh HS moi" khong con nhap tay ma_hs, he thong tu sinh, dam bao khong
-- trung voi:
--   - ma_hs sinh tu sbd khi import JSON (spec 17) - luon dang "26..." (6-8
--     chu so).
--   - ma_hs da co san trong cs2_hoc_sinh (kha nang trung ngau nhien voi dai
--     so moi rat thap, nhung van kiem tra ton tai thuc te de chac chan).
--   - Dai so moi bat dau bang "9" (900001 - 999999), khac hoan toan ve hinh
--     thuc voi dai "26..." cua sbd import.

create sequence if not exists public.seq_ma_hs_tudong start with 900001 increment by 1;

create or replace function public.sinh_ma_hs_tudong()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma text;
begin
  loop
    v_ma := nextval('public.seq_ma_hs_tudong')::text;
    exit when not exists (select 1 from public.cs2_hoc_sinh where ma_hs = v_ma);
    -- vong lap phong ho truong hop trung ngau nhien (rat hiem) - khong lap
    -- vo han vi sequence luon tang, som muon cung ra gia tri chua ton tai.
  end loop;
  return v_ma;
end;
$$;

revoke all on function public.sinh_ma_hs_tudong() from public;

-- them_nhanh_hoc_sinh doi chu ky (bo p_ma_hs, tra ve text la ma vua cap thay
-- vi void nhu truoc) nen phai drop ham cu (CREATE OR REPLACE khong cho phep
-- doi danh sach tham so/kieu tra ve).
drop function if exists public.them_nhanh_hoc_sinh(text, text, text, text);

create or replace function public.them_nhanh_hoc_sinh(p_ten_hs text, p_lop text, p_co_so text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ten_hs text := btrim(coalesce(p_ten_hs, ''));
  v_lop text := btrim(coalesce(p_lop, ''));
  v_co_so text := btrim(coalesce(p_co_so, ''));
  v_ho text;
  v_ten text;
  v_cut integer;
  v_ma_hs text;
begin
  if v_ten_hs = '' then
    raise exception 'Chưa nhập tên học sinh.';
  end if;
  if v_ten_hs ~ '[0-9]' then
    raise exception 'Tên học sinh không được chứa số.';
  end if;
  if v_lop = '' or v_co_so = '' then
    raise exception 'Chưa chọn lớp/cơ sở.';
  end if;

  v_cut := length(v_ten_hs) - length(reverse(split_part(reverse(v_ten_hs), ' ', 1)));
  if v_cut > 0 then
    v_ho := btrim(substring(v_ten_hs from 1 for v_cut));
    v_ten := btrim(substring(v_ten_hs from v_cut + 1));
  else
    v_ho := '';
    v_ten := v_ten_hs;
  end if;

  v_ma_hs := public.sinh_ma_hs_tudong();

  insert into public.cs2_hoc_sinh (ma_hs, ho, ten, lop, co_so, ngay_nhap_hoc)
  values (v_ma_hs, v_ho, v_ten, v_lop, v_co_so, current_date);

  return v_ma_hs;
end;
$$;

revoke all on function public.them_nhanh_hoc_sinh(text, text, text) from public;
grant execute on function public.them_nhanh_hoc_sinh(text, text, text) to authenticated;
