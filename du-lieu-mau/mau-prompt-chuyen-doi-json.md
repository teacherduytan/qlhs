# Prompt mẫu — dùng khi nhờ AI chuyển ảnh phiếu giấy thành JSON

> **Cập nhật (13/07/2026)**: khi "Nội dung thành tích" có kèm điểm số, phải tách thành **2 dòng JSON riêng**: 1 dòng `khen_thuong` để ghi điểm khích lệ, và 1 dòng `hoc_tap` để ghi `diem_so_mon`. Không gộp điểm số vào dòng `khen_thuong`, vì Điểm học tập chỉ đọc dòng `loai=hoc_tap`.
>
> **Cập nhật (15/07/2026)**: hệ thống import hiện kiểm tra `ma_danh_muc` theo **DanhMucDiem hiện hành**. Mọi dòng vi phạm/tích cực phải có mã đã tồn tại trong DanhMucDiem; chỉ dòng `loai=hoc_tap` mới được để `ma_danh_muc = null`.

## Cách dùng

1. Chụp ảnh rõ nét phiếu ghi nhận (mẫu mới — 1 bảng duy nhất: STT, Họ tên, Tiết, Môn, Nội dung vi phạm, Nội dung thành tích).
2. Mở Claude, đính kèm **4 thứ**: ảnh phiếu, file `bang-tra-cuu-ma-diem.md` hoặc danh sách `DanhMucDiem` hiện hành để tra mã, file `danh_muc_diem_seed.json` nếu chưa có danh mục mới, và `hocsinh_seed.json` để khớp đúng họ tên học sinh.
3. Copy nguyên đoạn prompt bên dưới, dán vào khung chat, gửi đi.
4. AI trả về JSON → đọc kỹ các dòng có tiền tố `[CẦN XÁC NHẬN...]`, kiểm tra mã/điểm số, rồi dán vào màn hình Import (chọn loại "Ghi nhận").

---

## Đoạn prompt để copy (dán nguyên văn, không cần sửa)

```
Bạn hãy đọc ảnh phiếu ghi nhận học sinh tôi đính kèm (1 bảng duy nhất: STT, Họ tên, Tiết,
Môn, Nội dung vi phạm, Nội dung thành tích — ghi tự do, KHÔNG có mã sẵn trên phiếu), bảng
tra cứu mã (bang-tra-cuu-ma-diem.md hoặc DanhMucDiem hiện hành), danh mục điểm dạng JSON nếu có, và danh sách lớp đầy đủ (hocsinh_seed.json), rồi:

1. Với mỗi dòng có "Nội dung vi phạm": đọc mô tả, tự suy luận mã phù hợp nhất trong 4 nhóm
   CC (Chuyên cần) / VS (Vệ sinh) / NN (Nề nếp) / KL (Trật tự kỷ luật) theo đúng bảng tra cứu.
   Mọi dòng vi phạm phải có `ma_danh_muc` là mã ĐÃ TỒN TẠI trong DanhMucDiem. Nếu mô tả chưa có mã phù hợp
   trong DanhMucDiem, KHÔNG tự đặt mã mới; hãy chọn mã gần nhất thật sự hợp lý và thêm tiền tố
   "[CẦN XÁC NHẬN MÃ — lý do]" vào `noi_dung`. Nếu không có mã nào đủ hợp lý, vẫn trả dòng đó nhưng để
   `ma_danh_muc = null` và thêm tiền tố "[CẦN TẠO DANH MỤC — lý do]" để giáo viên tạo/sửa danh mục trước khi import.

2. Với mỗi dòng có "Nội dung thành tích": tạo bản ghi `loai=khen_thuong`, tự suy luận mã phù hợp trong nhóm KT hiện có:
   KT01 phát biểu xây dựng bài, KT02 giúp đỡ bạn học tập, KT03 được tuyên dương, KT04 hoàn thành nhiệm vụ ban cán sự,
   KT05 hành động tích cực hỗ trợ tập thể lớp. Dòng `khen_thuong` luôn phải có `ma_danh_muc` nhóm KT và luôn để
   `diem_so_mon = null`.

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

7. Không tạo mã ngoài DanhMucDiem/bảng tra cứu. Với vi phạm hoặc tích cực, cố gắng gán một mã đang tồn tại và đánh dấu
   `[CẦN XÁC NHẬN MÃ...]` nếu chưa chắc. Chỉ để `ma_danh_muc = null` khi `loai=hoc_tap` hoặc khi thật sự cần giáo viên
   tạo thêm danh mục trước khi import; các dòng null không phải `hoc_tap` sẽ bị màn hình Import chặn.

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
      "ma_danh_muc": "<mã đang tồn tại trong DanhMucDiem — chỉ null nếu loai=hoc_tap hoặc cần tạo danh mục trước khi import>",
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
- Đọc lướt cột `ma_danh_muc` — dòng nào `null` mà không phải `loai=hoc_tap` sẽ bị Import chặn; cần tạo/sửa danh mục hoặc chọn lại mã có sẵn trước khi import.
- Nếu có dòng "thành tích kèm điểm số" — xác nhận JSON trả về **2 dòng riêng**: 1 `khen_thuong` không có `diem_so_mon`, và 1 `hoc_tap` có `diem_so_mon`.
- Dán vào màn hình Import, chọn loại "Ghi nhận", xem trước, xác nhận.
