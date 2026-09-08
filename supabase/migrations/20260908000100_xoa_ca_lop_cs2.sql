-- Xoa toan bo hoc sinh cua 1 lop trong 1 lan (vd lop 10 co danh sach can
-- thay doi hoan toan - xoa het roi import lai file JSON moi cho dung lop
-- do). Tuong tu xoa_hoc_sinh_cs2 (xoa 1 hoc sinh) nhung xoa hang loat theo
-- lop, tra ve so dong da xoa de UI bao lai cho ro.
create or replace function public.xoa_ca_lop_cs2(p_lop text, p_co_so text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lop text := btrim(coalesce(p_lop, ''));
  v_co_so text := btrim(coalesce(p_co_so, ''));
  v_so_luong integer;
begin
  if v_lop = '' or v_co_so = '' then
    raise exception 'Chưa xác định lớp/cơ sở cần xoá.';
  end if;

  select count(*) into v_so_luong from public.cs2_hoc_sinh where lop = v_lop and co_so = v_co_so;
  if v_so_luong = 0 then
    raise exception 'Không tìm thấy học sinh nào thuộc lớp "%".', v_lop;
  end if;

  delete from public.cs2_hoc_sinh_lienlac_lichsu
  where ma_hs in (select ma_hs from public.cs2_hoc_sinh where lop = v_lop and co_so = v_co_so);

  delete from public.cs2_hoc_sinh where lop = v_lop and co_so = v_co_so;

  return v_so_luong;
end;
$$;

revoke all on function public.xoa_ca_lop_cs2(text, text) from public;
grant execute on function public.xoa_ca_lop_cs2(text, text) to authenticated;
