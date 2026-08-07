-- ============================================================================
-- QLHS 11C5 - He thong quan ly hoc sinh
-- (c) Nguyen Duy Tan - Giao vien Tin hoc, GVCN 11C5
-- ============================================================================

-- Cho phep hoc sinh dang nhap bang SDT+mat khau ma KHONG can biet truoc token
-- rieng cua minh trong URL. Ly do: khi hoc sinh "Them vao man hinh chinh" tren
-- dien thoai, PWA luon mo dung start_url khai bao trong manifest (vite.config.ts:
-- '/qlhs/'), khong the mo dung /hs/:token du hoc sinh dang o trang do luc bam
-- them - man hinh goc truoc day chi la form dang nhap giao vien nen hoc sinh
-- bam icon vao la bi ket, khong dang nhap duoc. Them RPC nay de trang dang nhap
-- goc (Layout.tsx) co the tra thang ve dung ma_hs+token chi tu SDT+mat khau, roi
-- dieu huong sang /hs/:token bang client-side routing (khong doi lai schema
-- cua lay_ho_so_cong_khai(token,...) hien co, chi them 1 duong dang nhap khac).
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
  duyet jsonb
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
