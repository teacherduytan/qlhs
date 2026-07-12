# Prompt mẫu — dùng khi nhờ AI chuyển ảnh phiếu giấy thành JSON

> **Cập nhật (12/07/2026)**: phiếu giấy giờ đã đơn giản hoá (không còn mã, ghi tự do — xem `docs/mau-phieu-ghi-nhan.md`). Prompt dưới đây đổi khác bản trước: **AI phải tự suy luận mã và phạm vi** từ mô tả tự do, không còn việc đọc mã có sẵn trên phiếu.

## Cách dùng

1. Chụp ảnh rõ nét phiếu ghi nhận (mẫu mới — 1 bảng duy nhất: STT, Họ tên, Tiết, Môn, Nội dung vi phạm, Nội dung thành tích).
2. Mở Claude, đính kèm **2 ảnh**: ảnh phiếu VÀ ảnh (hoặc file) `bang-tra-cuu-ma-diem.md` để AI tra đúng mã.
3. Copy nguyên đoạn prompt bên dưới, dán vào khung chat, gửi đi.
4. AI trả về JSON → đọc lướt qua kiểm tra mã có hợp lý không → dán vào màn hình Import (chọn loại "Ghi nhận").

---

## Đoạn prompt để copy (dán nguyên văn, không cần sửa)

```
Bạn hãy đọc ảnh phiếu ghi nhận học sinh tôi đính kèm (1 bảng duy nhất: STT, Họ tên, Tiết,
Môn, Nội dung vi phạm, Nội dung thành tích — ghi tự do, KHÔNG có mã sẵn trên phiếu) và
bảng tra cứu mã tôi đính kèm cùng (bang-tra-cuu-ma-diem.md), rồi:

1. Với mỗi dòng có "Nội dung vi phạm": đọc mô tả, tự suy luận mã phù hợp nhất trong 4 nhóm
   CC (Chuyên cần) / VS (Vệ sinh) / NN (Nề nếp) / KL (Trật tự kỷ luật) theo đúng bảng tra cứu.
   Nếu mô tả không khớp rõ mã nào, để ma_danh_muc là null và giữ nguyên mô tả trong noi_dung
   để tôi tự xử lý tay.

2. Với mỗi dòng có "Nội dung thành tích": tạo bản ghi `loai=khen_thuong`, tự suy luận mã phù hợp trong nhóm KT:
   KT01 phát biểu xây dựng bài, KT02 giúp đỡ bạn học tập, KT03 được tuyên dương, KT04 hoàn thành nhiệm vụ ban cán sự,
   KT05 hành động tích cực hỗ trợ tập thể lớp. Nếu nội dung có điểm số cụ thể (VD "được 9 điểm miệng Toán"),
   vẫn dùng `loai=khen_thuong` + mã KT phù hợp, đồng thời điền `diem_so_mon` bằng điểm số đó để app ghi nhận điểm học tập.

3. Tự xác định phạm vi từng dòng:
   - Mô tả nhắc "cả lớp" / không ghi tên ai cụ thể ở cột Họ tên → phạm vi TẬP THỂ:
     để ho_ten = null, to_lien_quan = null.
   - Mô tả nhắc "tổ" kèm số → phạm vi TỔ TRỰC: để ho_ten = null, điền to_lien_quan
     đúng số tổ.
   - Có tên cụ thể ở cột Họ tên → phạm vi CÁ NHÂN: điền ho_ten đúng tên trên phiếu,
     to_lien_quan = null.

4. Không tạo mã ngoài bảng tra cứu. Nếu không chắc mã nào phù hợp, để `ma_danh_muc = null` và giữ nguyên mô tả để giáo viên xử lý tay.

Trả về đúng cấu trúc JSON sau, không thêm chữ nào khác ngoài JSON:

{
  "loai_du_lieu": "ghi_nhan",
  "ban_ghi": [
    {
      "ma_hs": null,
      "ho_ten": "<tên trên phiếu, null nếu tập thể>",
      "to_lien_quan": "<số tổ nếu tổ trực, còn lại null>",
      "ngay": "<yyyy-mm-dd, lấy từ ô Ngày ghi nhận đầu phiếu>",
      "tiet": "<theo phiếu, null nếu trống>",
      "mon_hoc": "<theo phiếu, null nếu trống>",
      "loai": "<chuyen_can | ve_sinh | ne_nep | trat_tu_ky_luat | hoc_tap | khen_thuong>",
      "ma_danh_muc": "<mã suy luận được, null nếu không rõ>",
      "noi_dung": "<giữ nguyên mô tả gốc trên phiếu>",
      "so_lan": 1,
      "ly_do": null,
      "da_xu_ly": null,
      "hinh_thuc_xu_ly": null,
      "goi_phu_huynh": null,
      "ghi_so_dau_bai": null,
      "diem_so_mon": "<nếu có điểm số trong mô tả, còn lại null>",
      "nguoi_ghi": "<chức vụ ban cán sự ghi ở đầu phiếu>"
    }
  ]
}
```

## Sau khi có JSON

- Đọc lướt cột `ma_danh_muc` — dòng nào `null` nghĩa là AI không suy luận được, cần tự điền tay trước khi import (đối chiếu `bang-tra-cuu-ma-diem.md`).
- Đọc lướt tên học sinh có đúng chính tả như danh sách lớp không.
- Dán vào màn hình Import, chọn loại "Ghi nhận", xem trước, xác nhận.

## Nếu muốn AI khớp tên chính xác hơn

Đính kèm thêm `hocsinh_seed.json` vào cùng tin nhắn, nói thêm: *"Đối chiếu tên trên phiếu với danh sách này để viết đúng chính tả họ tên."*
