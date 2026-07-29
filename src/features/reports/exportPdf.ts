import { jsPDF } from 'jspdf'
import { formatDate } from '../dashboard/DashboardPage'
import type { ReportData } from './reportData'
import { shareOrDownloadFile } from './shareFile'

const PDF_MIME_TYPE = 'application/pdf'

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

// jsPDF khong co san font Unicode co dau tieng Viet, va du an khong co san
// file font that (.ttf) de nhung qua addFileToVFS/addFont. Thay vi nhung mot
// font gia/khong hop le (se lam PDF loi hoac mat dau), dung doc.html() de
// jsPDF render DOM qua html2canvas (da co san la optional dependency cua
// jsPDF) - ket qua la anh raster cua dung noi dung tieng Viet trinh duyet da
// hien thi, dam bao khong mat dau, nhung doi lai chu trong PDF la anh, khong
// the bam chon/copy hay tim kiem duoc nhu PDF van ban that.
//
// html2canvas (dung trong doc.html()) khong doc duoc mau CSS kieu oklch() -
// neu dung the container an gan thang vao document.body cua app, html2canvas
// se doc phai style ke thua/tinh toan tu <body>/<html> (Tailwind CSS v4 xuat
// mau bang oklch()) va nem loi "unsupported color function oklch". Sua bang
// cach dung 1 <iframe> voi document rong rieng (khong nap Tailwind cua app),
// noi dung bao cao chi dung style inline hex nen hoan toan tach biet, tranh
// duoc loi tren.
export async function exportReportToPdf(data: ReportData, title: string, fileBaseName: string): Promise<void> {
  const { iframe, container } = createIsolatedContainer(data, title)

  try {
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const pdfDoc = await new Promise<jsPDF>((resolve, reject) => {
      doc
        .html(container, {
          x: 24,
          y: 24,
          width: 547, // A4 (595pt) - 2*24pt margin
          windowWidth: 794, // ~ A4 width tai 96dpi, giup html2canvas do layout dung ty le
          autoPaging: 'slice',
          html2canvas: { scale: 0.75 },
          callback: (finishedDoc) => resolve(finishedDoc),
        })
        .catch(reject)
    })

    const blob = pdfDoc.output('blob')
    await shareOrDownloadFile(blob, `${fileBaseName}.pdf`, PDF_MIME_TYPE, title)
  } finally {
    iframe.remove()
  }
}

function createIsolatedContainer(data: ReportData, title: string): { iframe: HTMLIFrameElement; container: HTMLElement } {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = '794px'
  iframe.style.height = '1px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const frameDoc = iframe.contentDocument
  if (!frameDoc) {
    iframe.remove()
    throw new Error('Không tạo được khung ẩn để xuất PDF.')
  }

  frameDoc.open()
  frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
  frameDoc.close()

  const container = frameDoc.body
  container.style.margin = '0'
  container.style.width = '794px'
  container.style.fontFamily = 'Arial, sans-serif'
  container.style.color = '#0f172a'
  container.style.fontSize = '12px'
  container.style.background = '#ffffff'

  container.innerHTML = `
    <h1 style="font-size:20px;margin:0 0 4px;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:#334155;">Từ ${formatDate(data.tuNgay)} đến ${formatDate(data.denNgay)}</p>
    ${renderAttendanceSection(data)}
    ${renderViolationSection(data)}
    ${renderPositiveSection(data)}
  `

  return { iframe, container }
}

function renderAttendanceSection(data: ReportData): string {
  const { attendance } = data
  const rowsHtml = attendance.rows
    .map(
      (row, index) => `
        <tr>
          <td style="${td}">${index + 1}</td>
          <td style="${td}">${escapeHtml(row.hoTen)}</td>
          <td style="${td}">${formatDate(row.ngay)}</td>
          <td style="${td}">${ATTENDANCE_STATUS_LABELS[row.trangThai] || row.trangThai}</td>
          <td style="${td}">${escapeHtml(row.chiTietBuoi || '—')}</td>
          <td style="${td}">${row.daLienLac ? 'Đã liên lạc' : 'Chưa liên lạc'}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 1 — Chuyên cần</h2>
    <p style="margin:4px 0 8px;">
      Học sinh nghỉ học: <strong>${attendance.soHocSinhNghi}</strong> ·
      Vắng có phép: <strong>${attendance.soLuotVangCoPhep}</strong> ·
      Vắng không phép: <strong>${attendance.soLuotVangKhongPhep}</strong> ·
      Đi trễ: <strong>${attendance.soLuotDiTre}</strong>
    </p>
    ${
      attendance.rows.length === 0
        ? '<p>Không có học sinh vắng/trễ trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr>
              <th style="${th}">STT</th><th style="${th}">Họ tên</th><th style="${th}">Ngày</th>
              <th style="${th}">Trạng thái</th><th style="${th}">Chi tiết buổi</th><th style="${th}">Đã liên lạc PH?</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

function renderViolationSection(data: ReportData): string {
  const { violation } = data
  const groupRowsHtml = violation.theoNhom
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${row.soHocSinh}</td>
        </tr>`,
    )
    .join('')

  const detailRowsHtml = violation.chiTiet
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td}">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.tenViPham)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 2 — Vi phạm nề nếp</h2>
    <p style="margin:4px 0 8px;">
      Học sinh vi phạm: <strong>${violation.soHocSinhViPham}</strong> ·
      Tổng lượt vi phạm: <strong>${violation.tongSoLuot}</strong> ·
      Vi phạm nghiêm trọng: <strong>${violation.soViPhamNghiemTrong}</strong>
    </p>
    <p style="margin:0 0 8px;">
      Sự kiện lớp/tổ trong kỳ: <strong>${violation.suKienTapThe.tongSo}</strong> sự kiện,
      đã xử lý <strong>${violation.suKienTapThe.daXuLy}</strong>.
    </p>
    ${
      violation.theoNhom.length === 0
        ? '<p>Không có vi phạm cá nhân nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th}">Nhóm</th><th style="${th}">Số lượt</th><th style="${th}">Số học sinh liên quan</th></tr></thead>
            <tbody>${groupRowsHtml}</tbody>
          </table>
          <table style="${table}">
            <thead><tr>
              <th style="${th}">Nhóm</th><th style="${th}">Mã</th><th style="${th}">Tên vi phạm</th>
              <th style="${th}">Số lượt</th><th style="${th}">Học sinh (số lần)</th>
            </tr></thead>
            <tbody>${detailRowsHtml}</tbody>
          </table>`
    }
  `
}

function renderPositiveSection(data: ReportData): string {
  const { positive } = data
  const rowsHtml = positive.rows
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.noiDung)}</td>
          <td style="${td}">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 3 — Ghi nhận tích cực</h2>
    <p style="margin:4px 0 8px;">
      Học sinh được ghi nhận: <strong>${positive.soHocSinh}</strong> ·
      Tổng lượt ghi nhận: <strong>${positive.tongSoLuot}</strong>
    </p>
    ${
      positive.rows.length === 0
        ? '<p>Không có ghi nhận tích cực nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th}">Mã</th><th style="${th}">Nội dung</th><th style="${th}">Số lượt</th><th style="${th}">Học sinh (số lần)</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

const h2 = 'font-size:15px;margin:16px 0 4px;color:#0f172a;'
const table = 'width:100%;border-collapse:collapse;margin-bottom:12px;'
const th = 'border:1px solid #64748b;background:#e2e8f0;padding:4px 6px;text-align:left;font-size:11px;'
const td = 'border:1px solid #94a3b8;padding:4px 6px;font-size:11px;vertical-align:top;'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
