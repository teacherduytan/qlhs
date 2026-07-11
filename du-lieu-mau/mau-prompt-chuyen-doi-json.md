# Prompt mẫu — dùng khi nhờ AI chuyển ảnh phiếu giấy thành JSON

## Cách dùng

1. Chụp ảnh rõ nét cả 3 phần của phiếu ghi nhận (Phần A/B/C).
2. Mở Claude (hoặc AI khác), đính kèm ảnh phiếu.
3. Copy nguyên đoạn prompt bên dưới, dán vào khung chat, gửi đi.
4. AI trả về JSON → copy toàn bộ → dán vào màn hình **Import** trên web app (chọn loại dữ liệu "Ghi nhận").

---

## Đoạn prompt để copy (dán nguyên văn, không cần sửa)

```
Bạn hãy đọc ảnh phiếu ghi nhận học sinh tôi đính kèm (có 3 phần: A - theo tiết học,
B - nề nếp đầu buổi, C - sự kiện tập thể/tổ trực) và chuyển thành JSON đúng theo cấu
trúc mẫu dưới đây. Đây là mẫu tham khảo, hãy tạo ra đúng số lượng bản ghi khớp với
những gì thực sự có trên phiếu (không bịa thêm, không bỏ sót):

{
  "loai_du_lieu": "ghi_nhan",
  "ban_ghi": [
    {
      "ma_hs": null,
      "ho_ten": "<tên đầy đủ học sinh trên phiếu, để null nếu là sự kiện tập thể>",
      "to_lien_quan": "<số tổ 1/2/3 nếu là sự kiện tổ trực, còn lại để null>",
      "ngay": "<yyyy-mm-dd>",
      "tiet": "<số tiết, để null nếu không áp dụng>",
      "mon_hoc": "<tên môn học, để null nếu không áp dụng>",
      "loai": "<1 trong: chuyen_can | ve_sinh | ne_nep | trat_tu_ky_luat | hoc_tap>",
      "ma_danh_muc": "<mã đúng theo bảng tra cứu, ví dụ KL09 - để null nếu loai=hoc_tap>",
      "noi_dung": "<mô tả thêm nếu có trên phiếu>",
      "so_lan": "<số lần, để null nếu không áp dụng>",
      "ly_do": null,
      "da_xu_ly": "<true/false theo cột Đã xử lý trên phiếu, để null nếu không có>",
      "hinh_thuc_xu_ly": "<theo phiếu, để null nếu trống>",
      "goi_phu_huynh": "<true/false theo phiếu, để null nếu không có>",
      "ghi_so_dau_bai": "<theo phiếu, để null nếu trống>",
      "diem_so_mon": "<số điểm nếu loai=hoc_tap, còn lại để null>",
      "nguoi_ghi": "<chức vụ ban cán sự ghi phiếu, ghi ở đầu phiếu>"
    }
  ]
}

Quy tắc bắt buộc:
- Mã tiêu chí (ma_danh_muc) CHỈ được lấy từ danh sách sau, không tự đặt mã mới:
  CC01-CC04, VS01-VS06, NN01-NN06, KL01-KL15 (tôi sẽ đính kèm ảnh bảng tra cứu nếu cần).
- Việc ở Phần A/B của phiếu → có ho_ten, to_lien_quan để null.
- Việc ở Phần C của phiếu → ho_ten để null; nếu có ghi rõ tên học sinh cụ thể trong
  cột "Ghi chú" của Phần C thì lấy tên đó điền vào ho_ten (nghĩa là quy về cá nhân).
- loai=hoc_tap thì không có ma_danh_muc, chỉ có diem_so_mon.
- Chỉ trả về JSON, không giải thích thêm, không thêm chữ nào ngoài JSON.
```

## Sau khi có JSON

- Đọc lướt qua nhanh xem tên học sinh có đúng chính tả như trong danh sách lớp không (hệ thống sẽ báo lỗi nếu không khớp được tên, nhưng đọc trước cho chắc).
- Dán vào màn hình Import trên web app, chọn loại "Ghi nhận", xem trước, xác nhận.

## Nếu muốn AI biết luôn danh sách lớp để khớp tên chính xác hơn

Đính kèm thêm file `hocsinh_seed.json` (trong thư mục này) vào cùng tin nhắn, nói thêm: *"Đây là danh sách học sinh chuẩn, hãy đối chiếu tên trên phiếu với danh sách này để viết đúng chính tả họ tên."*
