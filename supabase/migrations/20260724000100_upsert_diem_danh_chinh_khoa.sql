create or replace function public.upsert_diem_danh(
  p_ma_hs text,
  p_ngay date,
  p_tuan_so integer,
  p_buoi text,
  p_trang_thai text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_trang_thai is null or p_trang_thai = 'co_mat' then
    delete from public.diem_danh
    where ma_nhom = 'CHINH_KHOA' and ma_hs = p_ma_hs and ngay = p_ngay and buoi = p_buoi;
    return null;
  end if;

  insert into public.diem_danh (ma_nhom, ma_hs, ngay, tuan_so, buoi, trang_thai, nguoi_ghi)
  values ('CHINH_KHOA', p_ma_hs, p_ngay, p_tuan_so, p_buoi, p_trang_thai, auth.jwt() ->> 'email')
  on conflict (ma_nhom, ma_hs, ngay, buoi) where ma_hs is not null
  do update set trang_thai = excluded.trang_thai, nguoi_ghi = excluded.nguoi_ghi
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_diem_danh(text, date, integer, text, text) to authenticated;
