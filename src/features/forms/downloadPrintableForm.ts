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
    h1 { margin: 0 0 4px; font-size: 20px; text-transform: uppercase; }
    p { margin: 4px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 12px; }
    th, td { border: 1px solid #64748b; height: 32px; padding: 4px; font-size: 11px; vertical-align: top; }
    th { background: #e2e8f0; text-align: center; }
    .meta { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0 12px; }
    .note { color: #334155; font-style: italic; }
    .guide { margin-top: 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; }
    .guide p { margin: 0; }
  </style>
</head>
<body>
  <h1>Phiếu ghi nhận học sinh - Lớp 11C5</h1>
  <p><strong>Năm học 2025-2026</strong></p>
  <div class="meta">
    <p><strong>Ngày ghi nhận:</strong> ____ / ____ / 2026</p>
    <p><strong>Người ghi nhận (chức vụ):</strong> ______________________</p>
  </div>
  <p class="note">Ghi tự do, không cần mã. AI sẽ suy luận mã và phạm vi khi giáo viên chuyển phiếu thành JSON.</p>

  <table>
    <thead>
      <tr>
        <th style="width:36px">STT</th>
        <th style="width:170px">Họ tên</th>
        <th style="width:52px">Tiết</th>
        <th style="width:100px">Môn</th>
        <th>Nội dung vi phạm</th>
        <th>Nội dung thành tích</th>
      </tr>
    </thead>
    <tbody>${blankRows(14, 6)}</tbody>
  </table>

  <div class="guide">
    <p>1. Chỉ ghi dòng có phát sinh.</p>
    <p>2. Nếu là cả lớp hoặc tổ trực, ghi rõ trong nội dung vi phạm và để trống Họ tên.</p>
    <p>3. Tiết/Môn chỉ điền khi có tiết học cụ thể.</p>
    <p>4. Cuối buổi nộp phiếu cho giáo viên chủ nhiệm hoặc lớp phó phụ trách.</p>
  </div>
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
