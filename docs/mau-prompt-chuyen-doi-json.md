# Prompt mẫu — dùng khi nhờ AI chuyển ảnh phiếu giấy thành JSON

> **Bản chuẩn dùng khi import**: dùng file này trong `du-lieu-mau/`. Nếu có bản sao cùng tên trong `docs/`, bản đó chỉ là bản tham chiếu và phải được đồng bộ y hệt file này.

> **Cập nhật (13/07/2026)**: khi "Nội dung thành tích" có kèm điểm số, phải tách thành **2 dòng JSON riêng**: 1 dòng `khen_thuong` để ghi điểm khích lệ, và 1 dòng `hoc_tap` để ghi `diem_so_mon`. Không gộp điểm số vào dòng `khen_thuong`, vì Điểm học tập chỉ đọc dòng `loai=hoc_tap`.
>
> **Cập nhật (15/07/2026)**: hệ thống import hiện kiểm tra `ma_danh_muc` theo **DanhMucDiem hiện hành**. Mọi dòng vi phạm/tích cực phải có mã đã tồn tại trong DanhMucDiem; chỉ dòng `loai=hoc_tap` mới được để `ma_danh_muc = null`.
>
> **Cập nhật danh mục Nề nếp (15/07/2026)**: nội dung "không mang dụng cụ học tập" / "quên máy tính" chỉ được gán vào **mã duy nhất còn tồn tại trong DanhMucDiem hiện hành**. Không dùng `NN08` hoặc `NN09` cho nội dung này; nếu 2 mã đó còn tồn tại trong DanhMucDiem mới thì chúng đang là danh mục khác, không phải lỗi quên dụng cụ.
>
> **Cập nhật chống bẩn nội dung (16/07/2026)**: các ghi chú kiểu `[CẦN ĐỐI CHIẾU DANHMUCDIEM...]`, `[DANHMUCDIEM...]`, `[dùng mã duy nhất còn tồn tại...]` chỉ là suy nghĩ nội bộ khi đối chiếu danh mục, **không được đưa vào `noi_dung`**. Nếu đã tìm thấy mã danh mục đúng thì `noi_dung` chỉ giữ mô tả gốc trên phiếu, ví dụ `"Không mang dụng cụ học tập (máy tính)"`.
>
> **Cập nhật ngữ cảnh danh mục hiện hành (16/07/2026)**: theo DanhMucDiem đang chạy trong app, các nội dung thường gặp đã có mã: `NN07` = "Không mang dụng cụ học tập", `NN08` = "Không bao bìa, dán nhãn sách vở", `NN09` = "Nói chuyện/phát biểu không đúng lúc trong giờ", `NN10` = "Tự ý đổi chỗ ngồi khi chưa được cho phép", `NN11` = "Không thuộc bài", `KT01` = "Giơ tay xây dựng bài". Khi giáo viên dán DanhMucDiem mới hơn thì ưu tiên dữ liệu mới đó, nhưng vẫn phải dùng đúng quan hệ mã - tên hiện có, không tự tạo mã trùng nghĩa.
>
> **Cập nhật mô tả/xử lý danh mục (15/07/2026)**: nếu phải đề xuất danh mục mới trong `de_xuat_danh_muc`, AI phải trả thêm `mo_ta` và `de_xuat_xu_ly` để app tạo danh mục đầy đủ theo C103. Với vi phạm, `de_xuat_xu_ly` nên ghi rõ mức xử lý theo số lần lặp lại.
>
> **Cập nhật mã xử lý/phạt (15/07/2026)**: nếu giáo viên cung cấp thêm `DanhMucXuLy` hiện hành, AI hãy đối chiếu gợi ý xử lý với mã xử lý/phạt đã có. Nếu khớp rõ thì điền `ma_xu_ly_goi_y`; nếu chưa có mã phù hợp thì để `ma_xu_ly_goi_y = null`, app Import sẽ cho giáo viên tạo mã xử lý mới từ `de_xuat_xu_ly`.
>
> **Lưu ý nghiệp vụ**: học sinh/ban cán sự ghi nhận bằng mô tả tự do, không chọn từ dropdown. Vì vậy khi dùng AI web phải đính kèm hoặc dán **DanhMucDiem hiện hành trong app** để AI đối chiếu. Nếu mô tả thô chưa có danh mục phù hợp, AI phải giữ nguyên mô tả thô và đề xuất tạo danh mục mới, không tự bịa mã.
>
> **Lưu ý khớp tên học sinh**: phiếu giấy có thể ghi tên thiếu dấu, viết tắt, chỉ ghi tên gọi hoặc chữ viết tay khó đọc. Khi dùng AI web phải đính kèm/copy **danh sách HocSinh hiện hành của lớp** gồm tối thiểu `ma_hs`, họ tên, STT, tổ, diện để AI đối chiếu và chuẩn hoá `ho_ten`. `ma_hs` là mã nội bộ do app quản lý; nếu không chắc tuyệt đối thì để `ma_hs = null`, màn Import sẽ gắn học sinh hoặc tạo học sinh mới với mã tự sinh không trùng.
>
> **Lưu ý đọc ngữ cảnh**: dù có form in sẵn, học sinh có thể ghi lệch cột, ghi dồn nhiều ý vào một ô hoặc viết thêm ngoài bảng. AI phải đọc theo ngữ cảnh toàn phiếu, không phụ thuộc máy móc vào vị trí cột; trường nào suy luận chưa chắc phải đánh dấu để giáo viên rà lại.
>
> **Lưu ý chống lỗi import**: trước khi trả JSON, AI phải tự kiểm tra lại. Mọi dòng vi phạm/tích cực không phải `hoc_tap` phải có `ma_danh_muc` đang tồn tại trong DanhMucDiem, hoặc phải có đề xuất tương ứng trong `de_xuat_danh_muc`. Mọi dòng cá nhân phải có `ho_ten` đủ rõ để app Import gắn học sinh; không tự bịa `ma_hs`.

## Cách dùng

1. Chụp ảnh rõ nét phiếu ghi nhận (mẫu mới — 1 bảng duy nhất: STT, Họ tên, Tiết, Môn, Nội dung vi phạm, Nội dung thành tích). Nếu học sinh ghi thêm ngoài bảng hoặc ghi lệch cột, chụp đủ toàn trang để AI đọc ngữ cảnh.
2. Mở Claude, đính kèm **ít nhất 3 thứ**: ảnh phiếu, **DanhMucDiem hiện hành trong app** (copy từ trang Danh mục hoặc xuất từ Sheet, nên có đủ `ma_danh_muc`, `nhom`, `ten_muc`, `diem`, `pham_vi`, `mo_ta`, `de_xuat_xu_ly`, `ma_xu_ly_de_xuat`), và **danh sách HocSinh hiện hành của lớp** (copy từ trang Học sinh/Sheet hoặc file `hocsinh_seed.json`) để chuẩn hoá họ tên, STT, tổ, diện. Có thể đính kèm thêm `bang-tra-cuu-ma-diem.md` để giải thích quy chế, nhưng mã danh mục cuối cùng phải theo DanhMucDiem hiện hành.
3. Copy nguyên đoạn prompt bên dưới, dán vào khung chat, gửi đi.
4. AI trả về JSON → đọc kỹ các dòng có tiền tố `[CẦN XÁC NHẬN...]`, kiểm tra mã/điểm số, rồi dán vào màn hình Import (chọn loại "Ghi nhận").

---

## Đoạn prompt để copy (dán nguyên văn, không cần sửa)

```
Bạn hãy đọc ảnh phiếu ghi nhận học sinh tôi đính kèm (1 bảng duy nhất: STT, Họ tên, Tiết,
Môn, Nội dung vi phạm, Nội dung thành tích — ghi tự do, KHÔNG có mã sẵn trên phiếu), bảng
DanhMucDiem hiện hành trong app, DanhMucXuLy hiện hành nếu có, bảng tra cứu mã nếu có, và danh sách HocSinh hiện hành đầy đủ của lớp
(có `ma_hs`, họ tên, STT, tổ, diện; ví dụ copy từ trang Học sinh/Sheet hoặc hocsinh_seed.json), rồi:

NGỮ CẢNH APP HIỆN TẠI CẦN NHỚ KHI ĐỐI CHIẾU:
- DanhMucDiem hiện hành là nguồn đúng cuối cùng. `bang-tra-cuu-ma-diem.md` chỉ giúp hiểu quy chế, không thay thế mã thật trong app.
- Với dữ liệu đang dùng ngày 16/07/2026: `NN07` là "Không mang dụng cụ học tập"; `NN08` là "Không bao bìa, dán nhãn sách vở"; `NN09` là "Nói chuyện/phát biểu không đúng lúc trong giờ"; `NN10` là "Tự ý đổi chỗ ngồi khi chưa được cho phép"; `NN11` là "Không thuộc bài"; `KT01` là "Giơ tay xây dựng bài". Nếu DanhMucDiem đính kèm khác danh sách này, dùng danh sách đính kèm mới nhất.
- App Import sẽ chặn mọi dòng vi phạm/tích cực có `ma_danh_muc = null`, trừ `loai=hoc_tap`, cho tới khi giáo viên chọn hoặc tạo danh mục. Vì vậy phải giảm tối đa dòng `null` bằng cách dùng mã hiện có khi đã khớp.
- App Import có thể hỗ trợ tự gợi ý/chọn/tạo danh mục còn thiếu, nhưng JSON tốt phải điền sẵn mã hiện hành cho nội dung đã có danh mục để giáo viên không phải xử lý tay lại.
- Nếu nhiều học sinh cùng một lỗi chưa có danh mục, chỉ tạo 1 mục trong `de_xuat_danh_muc` cho ý nghĩa đó, không tạo lặp theo từng học sinh.

0. Trước tiên, đọc toàn bộ phiếu theo NGỮ CẢNH, không phụ thuộc máy móc vào đúng cột in sẵn:
   - Học sinh/ban cán sự có thể ghi tên ở cột nội dung, ghi lỗi/thành tích lệch cột, ghi dồn nhiều ý vào một ô,
     dùng mũi tên/dấu gạch, ghi thêm ở lề hoặc dưới bảng.
   - Nếu vị trí cột và nội dung mâu thuẫn, ưu tiên ý nghĩa thật của chữ viết. Ví dụ nội dung "không mang máy tính"
     dù nằm nhầm cột thành tích vẫn là vi phạm; "phát biểu xây dựng bài" dù nằm lệch cột vẫn là tích cực.
   - Một ô/dòng có nhiều sự kiện thì tách thành nhiều bản ghi JSON riêng, mỗi bản ghi là 1 học sinh + 1 nội dung ghi nhận.
   - Không được đưa ghi chú đối chiếu danh mục vào `noi_dung`. Các cụm như "[CẦN ĐỐI CHIẾU DANHMUCDIEM...]", "[dùng mã duy nhất còn tồn tại...]" là ghi chú nội bộ, phải xoá khỏi JSON đầu ra.
   - Trường nào suy luận từ ngữ cảnh nhưng chưa chắc, giữ mô tả thô và thêm tiền tố
     "[CẦN XÁC NHẬN NGỮ CẢNH — lý do]" vào `noi_dung`.

1. Với mỗi dòng/cụm nội dung thể hiện vi phạm: đọc mô tả, tự suy luận mã phù hợp nhất trong 4 nhóm
   CC (Chuyên cần) / VS (Vệ sinh) / NN (Nề nếp) / KL (Trật tự kỷ luật) theo đúng DanhMucDiem hiện hành.
   Phải đối chiếu theo 3 lượt trước khi để `ma_danh_muc = null`:
   - Lượt 1: khớp tên/mô tả gần như trực tiếp sau khi chuẩn hoá dấu, khoảng trắng, viết tắt.
   - Lượt 2: khớp ý nghĩa rộng của danh mục. Ví dụ "không mang máy tính", "quên máy tính", "quên không mang vở",
     "không mang SGK" đều là biến thể của "Không mang dụng cụ học tập" nếu DanhMucDiem hiện hành có mục này.
   - Lượt 3: nếu chỉ có danh mục gần đúng nhưng chưa chắc, vẫn có thể điền mã gần nhất và thêm tiền tố
     "[CẦN XÁC NHẬN MÃ — lý do]" vào `noi_dung`.
   Chỉ khi cả 3 lượt đều không có danh mục phù hợp mới để `ma_danh_muc = null`, thêm tiền tố
   "[CẦN TẠO DANH MỤC — lý do]" vào `noi_dung`, đồng thời thêm đúng 1 mục tương ứng trong `de_xuat_danh_muc`.

2. Với mỗi dòng/cụm nội dung thể hiện thành tích/tích cực: tạo bản ghi `loai=khen_thuong`, tự suy luận mã phù hợp trong nhóm KT hiện có:
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

5. Tên trên phiếu đôi khi là viết tắt/biệt danh/thiếu dấu/chữ viết tay khó đọc (VD "H.Phúc", "V.Anh",
   "P.Huy", "phuc", "VA", chỉ ghi "Anh"). BẮT BUỘC đối chiếu với danh sách HocSinh hiện hành:
   - Chuẩn hoá tên bằng cách bỏ dấu, bỏ khoảng trắng thừa, không phân biệt hoa/thường.
   - So khớp họ tên đầy đủ, tên riêng, chữ cái đầu họ/tên đệm + tên, STT nếu phiếu có ghi, tổ nếu phiếu có gợi ý.
   - Nếu chỉ có 1 ứng viên hợp lý, điền `ho_ten` đúng theo danh sách HocSinh; `ma_hs` có thể để null để màn Import tự gắn mã.
   - Nếu có 2 ứng viên trở lên hoặc độ chắc chắn thấp, chọn ứng viên hợp lý nhất để điền `ho_ten`, để `ma_hs = null`,
     nhưng thêm tiền tố "[CẦN XÁC NHẬN TÊN — tên trên phiếu: ..., ứng viên: ...]" vào đầu `noi_dung`.
   - Nếu không suy luận được, để `ma_hs = null`, `ho_ten` giữ nguyên chữ trên phiếu, không bịa tên, và thêm tiền tố
     "[CẦN XÁC NHẬN TÊN — không tìm thấy trong danh sách HocSinh]" vào `noi_dung`.

6. Tự xác định phạm vi từng dòng:
   - Mô tả nhắc "cả lớp" / không có tên cụ thể nào → phạm vi TẬP THỂ: ho_ten = null, to_lien_quan = null.
   - Mô tả nhắc "tổ" kèm số → phạm vi TỔ TRỰC: ho_ten = null, điền to_lien_quan đúng số tổ.
   - Có tên cụ thể (dù viết tắt) → phạm vi CÁ NHÂN: điền `ho_ten` theo bước 5, `ma_hs` có thể để null để app Import gắn học sinh.

7. Không tạo mã ngoài DanhMucDiem hiện hành. Với vi phạm hoặc tích cực, cố gắng gán một mã đang tồn tại bằng cách đối chiếu
   theo tên, mô tả, nhóm, điểm, phạm vi và ý nghĩa nghiệp vụ; đánh dấu `[CẦN XÁC NHẬN MÃ...]` nếu chưa chắc. Chỉ để `ma_danh_muc = null` khi `loai=hoc_tap` hoặc khi thật sự cần giáo viên
   tạo thêm danh mục trước khi import; các dòng null không phải `hoc_tap` sẽ bị màn hình Import chặn.

8. Khi phải đề xuất danh mục mới, tạo thêm mảng `de_xuat_danh_muc` ở cuối JSON. Mỗi ý nghĩa chưa có danh mục chỉ xuất hiện
   1 lần trong `de_xuat_danh_muc`, dù có nhiều học sinh cùng vi phạm. Mỗi mục đề xuất phải dựa trên chính
   mô tả thô học sinh đã ghi, gồm: `nhom_goi_y`, `ten_muc_goi_y`, `diem_goi_y`, `pham_vi_goi_y`, `mo_ta_tho`,
   `mo_ta`, `de_xuat_xu_ly`, `ma_xu_ly_goi_y`, `ly_do_can_tao`, và `ma_goi_y` nếu có thể gợi ý mã chưa trùng. Không đưa mã gợi ý đó
   vào `ban_ghi` cho tới khi giáo viên đã tạo danh mục trong app.
   - `mo_ta`: viết thành mô tả chuẩn hoá/ví dụ áp dụng cho danh mục, không chỉ copy y nguyên chữ thô.
   - `de_xuat_xu_ly`: với vi phạm, gợi ý theo số lần lặp lại. Ví dụ "Không thuộc bài": lần 1 nhắc nhở và chép 20 lần/từ
     hoặc phần chưa thuộc; lần 2 chép 50 lần; lần 3 viết kiểm điểm/báo phụ huynh; tái phạm nhiều lần thì mời phụ huynh.
     Với tích cực, gợi ý ghi nhận/cộng điểm/tuyên dương nếu lặp lại nhiều lần.
   - `ma_xu_ly_goi_y`: nếu `de_xuat_xu_ly` khớp rõ một mã trong DanhMucXuLy hiện hành thì điền mã đó, ví dụ `XL01`;
     nếu chưa có mã phù hợp thì để null để app cho giáo viên tạo mã xử lý/phạt mới.

9. TRƯỚC KHI TRẢ JSON, tự kiểm tra và sửa các lỗi sau:
   - Không được để `ma_danh_muc = null` cho dòng `loai` là `chuyen_can`, `ve_sinh`, `ne_nep`, `trat_tu_ky_luat`
     hoặc `khen_thuong`, trừ khi cùng lúc đã thêm mục phù hợp trong `de_xuat_danh_muc` và `noi_dung` có tiền tố
     "[CẦN TẠO DANH MỤC — lý do]".
   - Nếu nội dung là "không mang dụng cụ học tập", "quên máy tính", "không mang máy tính", "quên không mang vở",
     "không mang SGK" hoặc nghĩa tương tự: trước hết tìm mã cho danh mục "Không mang dụng cụ học tập" trong DanhMucDiem
     hiện hành. Với dữ liệu hiện tại là `NN07`. Không dùng `NN08` hoặc `NN09` cho nội dung này vì hiện chúng là danh mục khác.
     Nếu đã có mã phù hợp thì bắt buộc điền mã đó vào `ma_danh_muc`; `noi_dung` chỉ là mô tả sạch, ví dụ
     "Không mang dụng cụ học tập (máy tính)" hoặc "Quên không mang vở". Tuyệt đối không xuất `noi_dung` dạng
     "[CẦN ĐỐI CHIẾU DANHMUCDIEM — ...] Không mang dụng cụ học tập (máy tính)".
     Nếu chưa có mã phù hợp trong DanhMucDiem đính kèm mới hơn, mới đề xuất tạo danh mục nhóm `NN`, điểm `-1`, phạm vi `ca_nhan`.
   - Nếu nội dung là "không bao bìa, dán nhãn sách vở" hoặc nghĩa tương tự, kiểm tra DanhMucDiem trước. Với dữ liệu hiện tại đã có `NN08`, vì vậy phải điền `ma_danh_muc = "NN08"` và không tạo đề xuất mới.
   - Nếu nội dung là "phát biểu linh tinh", "nói chuyện/phát biểu không đúng lúc" hoặc nghĩa tương tự, kiểm tra danh mục nói chuyện/mất trật tự. Với dữ liệu hiện tại đã có `NN09`, vì vậy điền `ma_danh_muc = "NN09"` nếu ngữ cảnh là phát biểu không đúng lúc trong giờ.
   - Nếu nội dung là "đổi chỗ ngồi", "tự ý đổi chỗ" hoặc nghĩa tương tự, với dữ liệu hiện tại đã có `NN10`, vì vậy điền `ma_danh_muc = "NN10"`.
   - Nếu nội dung là "không thuộc bài" hoặc nghĩa tương tự, với dữ liệu hiện tại đã có `NN11`, vì vậy điền `ma_danh_muc = "NN11"` và không tạo đề xuất mới.
   - Nếu một nội dung đã có mã theo các dòng trên, không được thêm tiền tố `[CẦN TẠO DANH MỤC...]` vào `noi_dung` và không được thêm mục trùng trong `de_xuat_danh_muc`.
   - Nếu là dòng cá nhân thì bắt buộc có `ho_ten` đủ rõ; `ma_hs` có thể null để app Import gắn/tạo học sinh bằng mã tự sinh.
   - Nếu một dòng cá nhân vẫn có `ma_hs = null` vì tên chưa chắc, `noi_dung` phải có tiền tố `[CẦN XÁC NHẬN TÊN...]`.
   - Nếu JSON còn dòng vi phạm/tích cực thiếu mã danh mục mà không có `de_xuat_danh_muc`, coi như JSON chưa đạt và phải sửa lại.

Trả về đúng cấu trúc JSON sau, không thêm chữ nào khác ngoài JSON:

{
  "loai_du_lieu": "ghi_nhan",
  "ban_ghi": [
    {
      "ma_hs": "<null nếu để app Import gắn/tạo mã học sinh, hoặc ma_hs đã có nếu copy chắc chắn từ danh sách HocSinh>",
      "ho_ten": "<họ tên đầy đủ đúng theo danh sách HocSinh, hoặc chữ trên phiếu nếu chưa chắc, hoặc null nếu tập thể>",
      "to_lien_quan": "<số tổ nếu tổ trực, còn lại null>",
      "ngay": "<yyyy-mm-dd, lấy từ ô Ngày ghi nhận đầu phiếu>",
      "tiet": "<theo phiếu, null nếu trống>",
      "mon_hoc": "<theo phiếu, null nếu trống>",
      "loai": "<chuyen_can | ve_sinh | ne_nep | trat_tu_ky_luat | hoc_tap | khen_thuong>",
      "ma_danh_muc": "<mã đang tồn tại trong DanhMucDiem — chỉ null nếu loai=hoc_tap hoặc cần tạo danh mục trước khi import>",
      "noi_dung": "<mô tả gốc, thêm tiền tố [CẦN XÁC NHẬN TÊN...] nếu tên là suy luận không chắc>",
      "so_lan": 1,
      "ly_do": null,
      "da_xu_ly": null,
      "hinh_thuc_xu_ly": null,
      "goi_phu_huynh": null,
      "ghi_so_dau_bai": null,
      "diem_so_mon": "<chỉ điền khi loai=hoc_tap, còn lại null>",
      "nguoi_ghi": "<tên/chức vụ ban cán sự ghi ở đầu phiếu>"
    }
  ],
  "de_xuat_danh_muc": [
    {
      "nhom_goi_y": "<CC | VS | NN | KL | KT>",
      "ten_muc_goi_y": "<nội dung danh mục nên tạo, ưu tiên giữ gần mô tả thô>",
      "diem_goi_y": "<số điểm gợi ý, ví dụ -1 hoặc +1>",
      "pham_vi_goi_y": "<ca_nhan | tap_the | to_truc>",
      "mo_ta_tho": "<mô tả học sinh/ban cán sự đã ghi trên phiếu>",
      "mo_ta": "<mô tả chuẩn hoá/ví dụ áp dụng cho danh mục nếu giáo viên tạo mới>",
      "de_xuat_xu_ly": "<gợi ý xử lý/phạt theo số lần lặp lại nếu là vi phạm; gợi ý ghi nhận/tuyên dương nếu là tích cực>",
      "ma_xu_ly_goi_y": "<mã xử lý/phạt đang tồn tại trong DanhMucXuLy nếu khớp rõ, hoặc null nếu cần tạo mới>",
      "ly_do_can_tao": "<vì sao DanhMucDiem hiện hành chưa có mục phù hợp>",
      "ma_goi_y": "<mã gợi ý chưa trùng, hoặc null nếu không chắc>"
    }
  ]
}
```

## Sau khi có JSON

- Đọc kỹ mọi dòng có tiền tố `[CẦN XÁC NHẬN TÊN...]`, `[CẦN XÁC NHẬN NGỮ CẢNH...]` hoặc `[CẦN XÁC NHẬN...]` trong `noi_dung` — đây là chỗ AI không chắc 100% học sinh/ngữ cảnh/danh mục, cần xác nhận thủ công trước khi import.
- Kiểm tra cột `ho_ten`: nếu AI báo nhiều ứng viên hoặc không tìm thấy trong danh sách HocSinh, dùng khối "Kiểm tra liên kết học sinh" trên màn Import để chọn học sinh hoặc tạo học sinh mới; app sẽ tự gắn `ma_hs`.
- Đọc lướt cột `ma_danh_muc` — dòng nào `null` mà không phải `loai=hoc_tap` sẽ bị Import chặn; xem `de_xuat_danh_muc`, tạo danh mục trong app hoặc chọn lại mã có sẵn trước khi import.
- Nếu JSON có `de_xuat_danh_muc`: tạo/sửa danh mục trong trang Danh mục trước, sau đó thay `ma_danh_muc=null` trong `ban_ghi` bằng mã đã tạo rồi mới import.
- Nếu có dòng "thành tích kèm điểm số" — xác nhận JSON trả về **2 dòng riêng**: 1 `khen_thuong` không có `diem_so_mon`, và 1 `hoc_tap` có `diem_so_mon`.
- Dán vào màn hình Import, chọn loại "Ghi nhận", xem trước, xác nhận.
