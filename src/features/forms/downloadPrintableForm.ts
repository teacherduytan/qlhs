export function downloadPrintableForm() {
  const html = buildPrintableFormHtml()
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mau-phieu-ghi-nhan-11C5.html'
  link.click()
  URL.revokeObjectURL(url)
}

function buildPrintableFormHtml(): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Mẫu phiếu ghi nhận 11C5</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    h2 { margin: 18px 0 8px; font-size: 15px; }
    p { margin: 4px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #64748b; height: 24px; padding: 3px; font-size: 10px; vertical-align: top; }
    th { background: #e2e8f0; }
    .meta { display: flex; justify-content: space-between; gap: 16px; margin: 8px 0 12px; }
    .note { color: #334155; font-style: italic; }
    .page-break { break-before: page; }
  </style>
</head>
<body>
  <h1>Mẫu phiếu ghi nhận giấy</h1>
  <p><strong>Lớp 11C5</strong> · Năm học 2025-2026</p>
  <p class="note">In kèm bảng tra cứu mã điểm. Mỗi ô khớp tab GhiNhan.</p>

  <h2>PHẦN 1 — Ghi nhận theo tiết / theo học sinh</h2>
  <div class="meta">
    <p><strong>Ngày:</strong> ____ / ____ / 2026</p>
    <p><strong>Người ghi (chức vụ):</strong> ______________________</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">STT</th><th>Họ tên HS</th><th style="width:42px">Tiết</th>
        <th>Môn</th><th style="width:52px">Mã*</th><th>Nội dung / Lý do</th>
        <th style="width:48px">Số lần</th><th style="width:64px">Xử lý? C/K</th>
        <th>Hình thức xử lý</th><th style="width:64px">Gọi PH? C/K</th>
        <th>Ghi sổ đầu bài</th><th style="width:76px">Điểm miệng/15p</th>
      </tr>
    </thead>
    <tbody>${blankRows(10, 12)}</tbody>
  </table>
  <p class="note">* Mã: ví dụ CC01, NN04, KL08. Học tập: ghi HT và điểm số ở cột cuối.</p>

  <h2>PHẦN 2 — Nề nếp đầu buổi (không theo tiết)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:28px">STT</th><th>Họ tên HS</th><th>Mã</th>
        <th>Đầu tóc C/K</th><th>Đồng phục C/K</th><th>Giày dép C/K</th>
        <th>Khăn quàng C/K</th><th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>${blankRows(5, 8)}</tbody>
  </table>
  <p class="note">Gợi ý mã: tóc NN04 · đồng phục NN01 · giày dép NN03 · khăn quàng NN05.</p>

  <h2>PHẦN 3 — Sự kiện tập thể / tổ trực (không ghi tên học sinh)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:28px">STT</th><th style="width:60px">Mã</th><th>Mô tả sự kiện</th>
        <th>Tổ trực (1/2/3) hoặc Cả lớp</th><th style="width:52px">Số lần</th><th>Người ghi</th>
      </tr>
    </thead>
    <tbody>${blankRows(3, 6)}</tbody>
  </table>
  <p class="note">Ví dụ: KL02 lớp ồn chào cờ · VS06 bán trú không vệ sinh · VS01 + Tổ 2 trực muộn.</p>

  <h2>Hướng dẫn nhanh</h2>
  <p>1. Chỉ ghi học sinh/sự kiện có phát sinh.</p>
  <p>2. Phần 1-2 có họ tên. Phần 3 không ghi tên học sinh.</p>
  <p>3. Ghi mã đúng bảng tra cứu. Cuối ngày nộp phiếu cho GVCN.</p>
</body>
</html>`
}

function blankRows(count: number, columns: number): string {
  return Array.from({ length: count }, (_, index) => {
    const cells = Array.from({ length: columns }, (_unused, cellIndex) =>
      cellIndex === 0 ? `<td>${index + 1}</td>` : '<td></td>',
    ).join('')
    return `<tr>${cells}</tr>`
  }).join('')
}
