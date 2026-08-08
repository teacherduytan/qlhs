-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================
--
-- Fix loi "structure of query does not match function result type":
-- lay_ho_so_cong_khai_theo_sdt (C220, migration 20260807000200) khai bao
-- returns table voi 8 cot (dung tai thoi diem do), nhung than ham lam
-- "select * from public.lay_ho_so_cong_khai(...)" - ham lay_ho_so_cong_khai
-- sau do da duoc mo rong len 11 cot o migration rank tinh tu
-- (20260808000200), nen "select *" tra ve nhieu cot hon returns table khai
-- bao, gay loi ngay khi goi. Phai drop function truoc (Postgres khong cho
-- create or replace doi so cot tra ve, da gap loi nay o C212) roi tao lai
-- returns table dung 11 cot khop voi lay_ho_so_cong_khai hien tai.
drop function if exists public.lay_ho_so_cong_khai_theo_sdt(text, text);

create or replace function public.lay_ho_so_cong_khai_theo_sdt(
  p_sdt text,
  p_mat_khau text
)
returns table (
  student jsonb,
  records jsonb,
  catalog jsonb,
  week_config jsonb,
  ban_can_su jsonb,
  attendance jsonb,
  huy_hieu jsonb,
  duyet jsonb,
  rank_bac jsonb,
  rank_lich_su jsonb,
  dong_hanh_cau_hinh jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sdt_input text := regexp_replace(coalesce(p_sdt, ''), '\D', '', 'g');
  v_mat_khau_input text := regexp_replace(coalesce(p_mat_khau, ''), '\D', '', 'g');
  v_ma_hs text;
begin
  if v_sdt_input = '' or v_mat_khau_input = '' then
    return;
  end if;

  select hs.ma_hs
  into v_ma_hs
  from public.hoc_sinh hs
  where regexp_replace(coalesce(hs.sdt_1, ''), '\D', '', 'g') = v_sdt_input
    and v_mat_khau_input = right(regexp_replace(coalesce(hs.sdt_1, ''), '\D', '', 'g'), 3)
  limit 1;

  if v_ma_hs is null then
    return;
  end if;

  return query
  select *
  from public.lay_ho_so_cong_khai(
    (select token_ho_so from public.hoc_sinh where ma_hs = v_ma_hs),
    p_sdt,
    p_mat_khau
  );
end;
$$;

revoke all on function public.lay_ho_so_cong_khai_theo_sdt(text, text) from public;
grant execute on function public.lay_ho_so_cong_khai_theo_sdt(text, text) to anon;
grant execute on function public.lay_ho_so_cong_khai_theo_sdt(text, text) to authenticated;
