-- Cho phep GVCN/admin xoa han 1 hoc sinh CS2 khoi danh sach (vd nhap nham,
-- trung, hoc sinh chuyen truong that su khong con thuoc CS2 nua). Dung 1 RPC
-- rieng thay vi DELETE truc tiep tu client vi cs2_hoc_sinh_lienlac_lichsu.ma_hs
-- tham chieu ve cs2_hoc_sinh(ma_hs) KHONG co "on delete cascade" - xoa thang
-- hoc_sinh se bao loi vi pham khoa ngoai neu hoc sinh do da co lich su sua.
create or replace function public.xoa_hoc_sinh_cs2(p_ma_hs text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ma_hs text := btrim(coalesce(p_ma_hs, ''));
begin
  if not exists (select 1 from public.cs2_hoc_sinh where ma_hs = v_ma_hs) then
    raise exception 'Không tìm thấy học sinh mã "%".', v_ma_hs;
  end if;

  delete from public.cs2_hoc_sinh_lienlac_lichsu where ma_hs = v_ma_hs;
  delete from public.cs2_hoc_sinh where ma_hs = v_ma_hs;
end;
$$;

revoke all on function public.xoa_hoc_sinh_cs2(text) from public;
grant execute on function public.xoa_hoc_sinh_cs2(text) to authenticated;
