# Prompt mẫu — dùng khi nhờ AI chuyển ảnh phiếu giấy thành JSON

> **Cập nhật (13/07/2026)**: khi "Nội dung thành tích" có kèm điểm số, phải tách thành **2 dòng JSON riêng**: 1 dòng `khen_thuong` để ghi điểm khích lệ, và 1 dòng `hoc_tap` để ghi `diem_so_mon`. Không gộp điểm số vào dòng `khen_thuong`, vì Điểm học tập chỉ đọc dòng `loai=hoc_tap`.

## Cách dùng

1. Chụp ảnh rõ nét phiếu ghi nhận (mẫu mới — 1 bảng duy nhất: STT, Họ tên, Tiết, Môn, Nội dung vi phạm, Nội dung thành tích).
2. Mở Claude, đính kèm **3 thứ**: ảnh phiếu, file `bang-tra-cuu-ma-diem.md` để tra mã, và `hocsinh_seed.json` để khớp đúng họ tên học sinh.
3. Copy nguyên đoạn prompt bên dưới, dán vào khung chat, gửi đi.
4. AI trả về JSON → đọc kỹ các dòng có tiền tố `[CẦN XÁC NHẬN...]`, kiểm tra mã/điểm số, rồi dán vào màn hình Import (chọn loại "Ghi nhận").

---

## Đoạn prompt để copy (dán nguyên văn, không cần sửa)

```
Bạn hãy đọc ảnh phiếu ghi nhận học sinh tôi đính kèm (1 bảng duy nhất: STT, Họ tên, Tiết,
Môn, Nội dung vi phạm, Nội dung thành tích — ghi tự do, KHÔNG có mã sẵn trên phiếu), bảng
tra cứu mã (bang-tra-cuu-ma-diem.md), và danh sách lớp đầy đủ (hocsinh_seed.json), rồi:

1. Với mỗi dòng có "Nội dung vi phạm": đọc mô tả, tự suy luận mã phù hợp nhất trong 4 nhóm
   CC (Chuyên cần) / VS (Vệ sinh) / NN (Nề nếp) / KL (Trật tự kỷ luật) theo đúng bảng tra cứu.
   Nếu mô tả không khớp rõ mã nào (kể cả khi mô tả hợp lý nhưng quy chế trường không có mã
   tương ứng — VD "không mang dụng cụ học tập"), để ma_danh_muc = null và giữ nguyên mô tả
   trong noi_dung để giáo viên tự xử lý tay, KHÔNG được tự đặt mã mới hoặc gán bừa 1 mã gần đúng.

2. Với mỗi dòng có "Nội dung thành tích": tạo bản ghi `loai=khen_thuong`, tự suy luận mã phù hợp trong nhóm KT:
   KT01 phát biểu xây dựng bài, KT02 giúp đỡ bạn học tập, KT03 được tuyên dương, KT04 hoàn thành nhiệm vụ ban cán sự,
   KT05 hành động tích cực hỗ trợ tập thể lớp. Dòng `khen_thuong` luôn để `diem_so_mon = null`.

3. Nếu nội dung vi phạm hoặc thành tích có nhắc điểm số cụ thể (VD "được 9 điểm miệng Toán"):
   TẠO THÊM 1 DÒNG RIÊNG BIỆT với cùng học sinh/ngày/tiết/môn, `loai=hoc_tap`, `ma_danh_muc=null`,
   `noi_dung` giữ mô tả điểm số, `diem_so_mon` bằng điểm số đó. KHÔNG gộp `diem_so_mon` vào dòng
   `khen_thuong` hoặc dòng vi phạm, vì công thức Điểm học tập chỉ đọc dòng `loai=hoc_tap`.

4. Nếu 1 nội dung liệt kê NHIỀU tên học sinh cụ thể cùng lúc (VD: "7 hs: A, B, C..."):
   đây KHÔNG PHẢI phạm vi tập thể cả lớp và KHÔNG PHẢI 1 dòng duy nhất — TÁCH THÀNH NHIỀU DÒNG
   CÁ NHÂN RIÊNG BIỆT, mỗi dòng đúng 1 học sinh, giữ nguyên nội dung/ngày/tiết/môn giống nhau.

5. Tên trên phiếu đôi khi là viết tắt/biệt danh (VD "H.Phúc", "V.Anh", "P.Huy").
   Đối chiếu với hocsinh_seed.json để suy luận đúng họ tên đầy đủ. Nếu suy luận ra được nhưng
   không chắc chắn tuyệt đối, vẫn điền ho_ten là tên đầy đủ suy luận được, NHƯNG thêm tiền tố
   "[CẦN XÁC NHẬN — lý do]" vào đầu noi_dung để giáo viên rà lại. Nếu không suy luận được,
   để ho_ten giữ nguyên chữ trên phiếu, không bịa tên.

6. Tự xác định phạm vi từng dòng:
   - Mô tả nhắc "cả lớp" / không có tên cụ thể nào → phạm vi TẬP THỂ: ho_ten = null, to_lien_quan = null.
   - Mô tả nhắc "tổ" kèm số → phạm vi TỔ TRỰC: ho_ten = null, điền to_lien_quan đúng số tổ.
   - Có tên cụ thể (dù viết tắt) → phạm vi CÁ NHÂN: điền ho_ten theo bước 5.

7. Không tạo mã ngoài bảng tra cứu. Nếu không chắc mã nào phù hợp, để `ma_danh_muc = null` và giữ nguyên mô tả để giáo viên xử lý tay.

Trả về đúng cấu trúc JSON sau, không thêm chữ nào khác ngoài JSON:

{
  "loai_du_lieu": "ghi_nhan",
  "ban_ghi": [
    {
      "ma_hs": null,
      "ho_ten": "<họ tên đầy đủ suy luận được, hoặc null nếu tập thể>",
      "to_lien_quan": "<số tổ nếu tổ trực, còn lại null>",
      "ngay": "<yyyy-mm-dd, lấy từ ô Ngày ghi nhận đầu phiếu>",
      "tiet": "<theo phiếu, null nếu trống>",
      "mon_hoc": "<theo phiếu, null nếu trống>",
      "loai": "<chuyen_can | ve_sinh | ne_nep | trat_tu_ky_luat | hoc_tap | khen_thuong>",
      "ma_danh_muc": "<mã suy luận được — null nếu loai=hoc_tap hoặc không rõ mã>",
      "noi_dung": "<mô tả gốc, thêm tiền tố [CẦN XÁC NHẬN...] nếu tên là suy luận không chắc>",
      "so_lan": 1,
      "ly_do": null,
      "da_xu_ly": null,
      "hinh_thuc_xu_ly": null,
      "goi_phu_huynh": null,
      "ghi_so_dau_bai": null,
      "diem_so_mon": "<chỉ điền khi loai=hoc_tap, còn lại null>",
      "nguoi_ghi": "<tên/chức vụ ban cán sự ghi ở đầu phiếu>"
    }
  ]
}
```

## Sau khi có JSON

- Đọc kỹ mọi dòng có tiền tố `[CẦN XÁC NHẬN...]` trong `noi_dung` — đây là chỗ AI không chắc 100% tên, cần xác nhận thủ công trước khi import.
- Đọc lướt cột `ma_danh_muc` — dòng nào `null` mà không phải `loai=hoc_tap` nghĩa là AI không suy luận được mã, cần tự xử lý.
- Nếu có dòng "thành tích kèm điểm số" — xác nhận JSON trả về **2 dòng riêng**: 1 `khen_thuong` không có `diem_so_mon`, và 1 `hoc_tap` có `diem_so_mon`.
- Dán vào màn hình Import, chọn loại "Ghi nhận", xem trước, xác nhận.
