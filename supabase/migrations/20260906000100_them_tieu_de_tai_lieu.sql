-- Them tieu de rieng cho tung tai lieu (vd danh muc "Ban tuong trinh" chung
-- chung, nhung tieu de cu the la "Tuong trinh ve viec su dung dien thoai
-- trong gio hoc") - tach biet voi ghi_chu (o mo ta them noi dung chi tiet).
alter table tai_lieu add column if not exists tieu_de text;
