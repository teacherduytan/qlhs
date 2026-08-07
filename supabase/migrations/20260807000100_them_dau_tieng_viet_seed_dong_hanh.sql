-- Fix loi du lieu seed cua He thong Dong hanh (migration 20260806000100) bi go
-- thieu dau tieng Viet o cac cot hien thi ra UI (ten_hien_thi/mo_ta/ten_luat/
-- cau_hien_thi/ten_huy_hieu/cau) - trang giao vien (TeacherStudentDetailPage.tsx,
-- section "He thong Dong hanh") va trang cong khai deu hien nguyen van du lieu
-- nay nen bi mat dau. Dung UPDATE thay vi sua lai migration cu (da co the da
-- chay tren Supabase that).

update public.dong_hanh_chi_so set ten_hien_thi = 'Số buổi vắng không phép (tuần này)', mo_ta = 'Đếm từ diem_danh, ma_nhom CHINH_KHOA, trang_thai = vang_khong_phep.' where ma_chi_so = 'vang_khong_phep';
update public.dong_hanh_chi_so set ten_hien_thi = 'Số buổi vắng có phép (tuần này)', mo_ta = 'Đếm từ diem_danh, ma_nhom CHINH_KHOA, trang_thai = vang_co_phep.' where ma_chi_so = 'vang_co_phep';
update public.dong_hanh_chi_so set ten_hien_thi = 'Số buổi đi trễ (tuần này)', mo_ta = 'Đếm từ diem_danh, ma_nhom CHINH_KHOA, trang_thai = tre.' where ma_chi_so = 'di_tre';
update public.dong_hanh_chi_so set ten_hien_thi = 'Số lần vi phạm theo 1 mã danh mục cụ thể', mo_ta = 'Dùng chung với cột "Mã danh mục áp dụng" của luật, ví dụ chỉ áp dụng cho mã NN11.' where ma_chi_so = 'so_lan_theo_ma';
update public.dong_hanh_chi_so set ten_hien_thi = 'Có vi phạm nghiêm trọng trong tuần', mo_ta = 'True nếu có ít nhất 1 ghi_nhan thuộc danh mục nghiem_trong=true trong tuần.' where ma_chi_so = 'co_nghiem_trong';
update public.dong_hanh_chi_so set ten_hien_thi = 'Tổng số lỗi (ghi nhận trừ điểm) tuần này' where ma_chi_so = 'so_loi_tuan_nay';
update public.dong_hanh_chi_so set ten_hien_thi = 'Tổng số lỗi (ghi nhận trừ điểm) tuần trước' where ma_chi_so = 'so_loi_tuan_truoc';
update public.dong_hanh_chi_so set ten_hien_thi = 'Chênh lệch số lỗi tuần này - tuần trước', mo_ta = 'Dương = tăng lỗi, âm hoặc 0 = giảm/không đổi.' where ma_chi_so = 'xu_huong_loi';
update public.dong_hanh_chi_so set ten_hien_thi = 'Có ít nhất 1 ghi nhận tích cực trong tuần' where ma_chi_so = 'co_ghi_nhan_tich_cuc';
update public.dong_hanh_chi_so set ten_hien_thi = 'Có ít nhất 1 vi phạm nhóm Nề nếp (NN) trong tuần' where ma_chi_so = 'co_vi_pham_ne_nep';

update public.dong_hanh_luat set ten_luat = 'Vắng 1 buổi - nhắc sớm', cau_hien_thi = 'Tuần này em vắng không phép {n} buổi, em chú ý sắp xếp đi học đầy đủ hơn nhé.' where ma_luat = 'CB1';
update public.dong_hanh_luat set ten_luat = 'Vắng 2 buổi trở lên - cảnh báo', cau_hien_thi = 'Tuần này em vắng không phép {n} buổi, GVCN cần trao đổi trực tiếp với phụ huynh.' where ma_luat = 'CB2';
update public.dong_hanh_luat set ten_luat = 'Đi trễ 2 lần trở lên', cau_hien_thi = 'Tuần này em đi trễ {n} lần, em cố gắng sắp xếp đi học đúng giờ hơn nhé.' where ma_luat = 'CB3';
update public.dong_hanh_luat set ten_luat = 'Có vi phạm nghiêm trọng', cau_hien_thi = 'Tuần này em có vi phạm nghiêm trọng, GVCN cần trao đổi trực tiếp và liên hệ phụ huynh sớm.' where ma_luat = 'CB4';
update public.dong_hanh_luat set ten_luat = 'Xu hướng lỗi tăng mạnh so với tuần trước', cau_hien_thi = 'Số lỗi tuần này của em tăng {n} so với tuần trước, cần theo dõi sát hơn.' where ma_luat = 'CB5';

update public.dong_hanh_huy_hieu set ten_huy_hieu = 'Chuyên cần trọn tuần', mo_ta = 'Đi học đầy đủ, đúng giờ cả tuần, không vắng không trễ buổi nào.' where ma_huy_hieu = 'chuyen_can_tron_tuan';
update public.dong_hanh_huy_hieu set ten_huy_hieu = 'Nề nếp gương mẫu', mo_ta = 'Không có vi phạm nhóm Nề nếp nào trong tuần.' where ma_huy_hieu = 'ne_nep_guong_mau';
update public.dong_hanh_huy_hieu set ten_huy_hieu = 'Ngôi sao tích cực', mo_ta = 'Có ít nhất 1 ghi nhận tích cực trong tuần.' where ma_huy_hieu = 'ngoi_sao_tich_cuc';
update public.dong_hanh_huy_hieu set ten_huy_hieu = 'Tuần sạch lỗi', mo_ta = 'Không có lỗi (ghi nhận trừ điểm) nào trong tuần.' where ma_huy_hieu = 'tuan_sach_loi';
update public.dong_hanh_huy_hieu set ten_huy_hieu = 'Tiến bộ rõ rệt', mo_ta = 'Số lỗi tuần này giảm ít nhất 2 so với tuần trước.' where ma_huy_hieu = 'tien_bo_ro_ret';

update public.dong_hanh_cau_dinh_huong set cau = 'Em cố gắng sắp xếp thời gian để đi học đầy đủ hơn, nếu có việc bận nhớ báo trước với GVCN.' where ma_cau = 'CDH-VANG';
update public.dong_hanh_cau_dinh_huong set cau = 'Em chuẩn bị sớm hơn vào buổi sáng để không bị trễ giờ vào lớp.' where ma_cau = 'CDH-TRE';
update public.dong_hanh_cau_dinh_huong set cau = 'Em chú ý giữ trật tự và nghiêm túc thực hiện nội quy lớp học.' where ma_cau = 'CDH-NE-NEP';
update public.dong_hanh_cau_dinh_huong set cau = 'Em cần nghiêm túc rút kinh nghiệm và không để tái phạm trong thời gian tới.' where ma_cau = 'CDH-KY-LUAT';
update public.dong_hanh_cau_dinh_huong set cau = 'Em tiếp tục phát huy tinh thần học tập và rèn luyện tốt như hiện tại nhé!' where ma_cau = 'CDH-MAC-DINH-TOT';
