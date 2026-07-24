-- Chuyen tinh nang "tao link Google Form dien san" tu Apps Script sang Supabase,
-- de app khong con phu thuoc Apps Script cho bat ky thao tac nao nua.
-- Bang nay chi luu duoc doc boi function security definer ben duoi, khong
-- grant SELECT truc tiep cho anon/authenticated nen entry id + mat khau Form
-- khong bao gio lo ra frontend.

create table if not exists public.cau_hinh_form_diem_danh (
  id smallint primary key default 1,
  form_base_url text not null,
  form_password text not null,
  class_name text not null default '11C5',
  entries jsonb not null default '{}'::jsonb,
  constraint cau_hinh_form_diem_danh_singleton check (id = 1)
);

alter table public.cau_hinh_form_diem_danh enable row level security;
revoke all on public.cau_hinh_form_diem_danh from anon, authenticated;

comment on table public.cau_hinh_form_diem_danh is
  'Cau hinh 1 dong duy nhat cho Google Form diem danh si so. entries la jsonb '
  'anh xa cac khoa co dinh (password, ngay, lop, buoi, noi_tru_co_mat, '
  'ban_tru_co_mat, hai_buoi_co_mat, ten_hoc_sinh_vang, mon_chinh_1, mon_chinh_2, '
  'mon_phu_1, mon_phu_2, mon_chinh_1_ngay_mai, mon_chinh_2_ngay_mai, '
  'mon_phu_1_ngay_mai, mon_phu_2_ngay_mai) sang entry.XXXXXX cua Google Form.';

create or replace function public._qlhs_url_encode(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_bytes bytea := convert_to(coalesce(p_value, ''), 'UTF8');
  v_result text := '';
  v_byte int;
begin
  for i in 0 .. length(v_bytes) - 1 loop
    v_byte := get_byte(v_bytes, i);
    if (v_byte between 48 and 57)
      or (v_byte between 65 and 90)
      or (v_byte between 97 and 122)
      or v_byte in (45, 46, 95, 126)
    then
      v_result := v_result || chr(v_byte);
    else
      v_result := v_result || '%' || upper(to_hex(v_byte));
    end if;
  end loop;
  return v_result;
end;
$$;

create or replace function public._qlhs_required_form_param(p_entries jsonb, p_key text, p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_entry text := p_entries ->> p_key;
begin
  if v_entry is null or btrim(v_entry) = '' then
    raise exception 'Thieu entry Google Form cho truong: %', p_key;
  end if;
  return public._qlhs_url_encode(v_entry) || '=' || public._qlhs_url_encode(coalesce(p_value, ''));
end;
$$;

create or replace function public.tao_link_form_diem_danh(p_payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config record;
  v_ngay text := p_payload ->> 'ngay';
  v_buoi text := upper(coalesce(p_payload ->> 'buoi', ''));
  v_present jsonb := coalesce(p_payload -> 'co_mat', '{}'::jsonb);
  v_meals jsonb := coalesce(p_payload -> 'so_mon', '{}'::jsonb);
  v_vang_list text;
  v_params text[] := '{}';
  v_entry text;
  v_key text;
  v_meal_keys text[] := array[
    'mon_chinh_1', 'mon_chinh_2', 'mon_phu_1', 'mon_phu_2',
    'mon_chinh_1_ngay_mai', 'mon_chinh_2_ngay_mai', 'mon_phu_1_ngay_mai', 'mon_phu_2_ngay_mai'
  ];
begin
  select * into v_config from public.cau_hinh_form_diem_danh where id = 1;
  if not found then
    raise exception 'Chua cau hinh Google Form diem danh (bang cau_hinh_form_diem_danh).';
  end if;

  if v_ngay is null or v_ngay !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Ngay khong hop le, can dinh dang YYYY-MM-DD.';
  end if;

  select string_agg(value, ', ') into v_vang_list
  from jsonb_array_elements_text(coalesce(p_payload -> 'vang', '[]'::jsonb)) as value;

  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'password', v_config.form_password));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'ngay', v_ngay));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'lop', coalesce(v_config.class_name, '11C5')));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'buoi', case when v_buoi = 'SANG' then 'SÁNG' else 'CHIỀU' end));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'noi_tru_co_mat', coalesce(v_present ->> 'NT', '0')));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'ban_tru_co_mat', coalesce(v_present ->> 'BT', '0')));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'hai_buoi_co_mat', coalesce(v_present ->> '2B', '0')));
  v_params := array_append(v_params, public._qlhs_required_form_param(v_config.entries, 'ten_hoc_sinh_vang', coalesce(v_vang_list, '')));

  foreach v_key in array v_meal_keys loop
    v_entry := v_config.entries ->> v_key;
    if v_entry is not null and btrim(v_entry) <> '' then
      v_params := array_append(
        v_params,
        public._qlhs_url_encode(v_entry) || '=' || public._qlhs_url_encode(coalesce(v_meals ->> v_key, ''))
      );
    end if;
  end loop;

  return v_config.form_base_url
    || (case when position('?' in v_config.form_base_url) = 0 then '?' else '&' end)
    || 'usp=pp_url&'
    || array_to_string(v_params, '&');
end;
$$;

revoke all on function public._qlhs_url_encode(text) from public;
revoke all on function public._qlhs_required_form_param(jsonb, text, text) from public;
revoke all on function public.tao_link_form_diem_danh(jsonb) from public;
grant execute on function public.tao_link_form_diem_danh(jsonb) to authenticated;
