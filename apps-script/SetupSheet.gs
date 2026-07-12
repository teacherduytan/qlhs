/**
 * QLHS — Khởi tạo Google Sheet chuẩn hóa (commit C003)
 *
 * Cách dùng:
 * 1. Mở https://script.google.com → Dự án mới
 * 2. Dán toàn bộ nội dung file này vào editor
 * 3. Chọn hàm setupQLHSSheet → Run
 * 4. Cấp quyền khi được hỏi
 * 5. Mở link Sheet trong log hoặc Drive
 */

var SHEET_NAME = 'QLHS_11C5_2025-2026';

var TAB_SCHEMA = {
  HocSinh: [
    'ma_hs', 'tt', 'ho', 'ten', 'dien', 'nu', 'dan_toc', 'ngay_sinh',
    'sdt_1', 'sdt_2', 'ngay_nhap_hoc', 'ngay_roi_lop', 'to', 'token_ho_so',
    'la_co_do', 'anh_dai_dien', 'ghi_chu'
  ],
  PhuHuynh: ['ma_hs', 'ho_ten_ph', 'quan_he', 'sdt', 'uu_tien_lien_he'],
  BanCanSu: ['ma_hs', 'chuc_vu', 'to', 'ngay_bat_dau'],
  DanhMucDiem: ['ma_danh_muc', 'nhom', 'ten_muc', 'diem', 'nghiem_trong', 'pham_vi'],
  CauHinhTuan: ['tuan_so', 'tu_ngay', 'den_ngay', 'so_ngay', 'loai_tuan'],
  GhiNhan: [
    'ma_ghi_nhan', 'ma_hs', 'to_lien_quan', 'ngay', 'tuan_so', 'dien_tai_thoi_diem',
    'tiet', 'mon_hoc', 'loai', 'ma_danh_muc', 'noi_dung', 'so_lan', 'ly_do',
    'da_xu_ly', 'hinh_thuc_xu_ly', 'goi_phu_huynh', 'ghi_so_dau_bai', 'diem_so_mon',
    'diem_cong_tru', 'nguoi_ghi', 'nguon', 'ma_log_import',
    'trang_thai_xu_ly_tap_the', 'su_kien_goc'
  ],
  NhatKyImport: [
    'ma_log', 'thoi_gian', 'loai_du_lieu', 'so_dong', 'nguoi_thuc_hien',
    'trang_thai', 'duong_dan_file_goc', 'ghi_chu'
  ]
};

var DANH_MUC_DIEM_SEED = [
  { ma_danh_muc: 'CC01', nhom: 'CC', ten_muc: 'Đi học trễ / 1 trường hợp', diem: -2, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'CC02', nhom: 'CC', ten_muc: 'Nghỉ học có phép; không phép / 1 trường hợp', diem: -3, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'CC03', nhom: 'CC', ten_muc: 'Không tham gia chào cờ / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'CC04', nhom: 'CC', ten_muc: 'Cờ đỏ bỏ trực ban, vắng họp / 1 trường hợp', diem: -10, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'VS01', nhom: 'VS', ten_muc: 'Vệ sinh lớp không đúng giờ / buổi', diem: -10, nghiem_trong: false, pham_vi: 'to_truc' },
  { ma_danh_muc: 'VS02', nhom: 'VS', ten_muc: 'Bàn ghế không ngay ngắn, lớp bẩn, để lại tài liệu đồ dùng sau giờ học / lần', diem: -10, nghiem_trong: false, pham_vi: 'to_truc' },
  { ma_danh_muc: 'VS03', nhom: 'VS', ten_muc: 'Đem đồ ăn, nước uống vào trường, khu vực học, lớp học / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'VS04', nhom: 'VS', ten_muc: 'Hành lang lớp còn bẩn / 1 lần', diem: -10, nghiem_trong: false, pham_vi: 'to_truc' },
  { ma_danh_muc: 'VS05', nhom: 'VS', ten_muc: 'Xả rác bừa bãi không đúng nơi quy định / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'VS06', nhom: 'VS', ten_muc: 'Bán trú lớp ăn trưa không vệ sinh, xả rác, không xếp ghế ngay ngắn / 1 lần', diem: -10, nghiem_trong: false, pham_vi: 'tap_the' },
  { ma_danh_muc: 'NN01', nhom: 'NN', ten_muc: 'Sai đồng phục (quần, áo, giày dép), nữ sinh cắt ngắn quần quá ngắn, bó nhỏ ống quần / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN02', nhom: 'NN', ten_muc: 'Không bảng tên / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN03', nhom: 'NN', ten_muc: 'Không đúng quy định về giày, dép / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN04', nhom: 'NN', ten_muc: 'Không đúng quy định về tóc / 1 trường hợp', diem: -10, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN05', nhom: 'NN', ten_muc: 'Không khăn quàng (cấp II) / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN06', nhom: 'NN', ten_muc: 'Nữ son môi, sơn móng tay, móng chân, đeo khuyên mũi / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL01', nhom: 'KL', ten_muc: 'Tập trung giờ chào cờ: muộn, lộn xộn, không thẳng hàng / tập thể', diem: -10, nghiem_trong: false, pham_vi: 'tap_the' },
  { ma_danh_muc: 'KL02', nhom: 'KL', ten_muc: 'Lớp gây mất trật tự giờ chào cờ, đầu giờ nghe TVAV / 1 tập thể', diem: -10, nghiem_trong: false, pham_vi: 'tap_the' },
  { ma_danh_muc: 'KL03', nhom: 'KL', ten_muc: 'Giờ nghe TVAV: ngủ gục, đi lung tung, nói chuyện, làm việc riêng / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL04', nhom: 'KL', ten_muc: 'Đi vào lối đi cấm / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL05', nhom: 'KL', ten_muc: 'Đùa giỡn, la hét làm mất trật tự, nói tục, chửi thề / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL06', nhom: 'KL', ten_muc: 'Mang, hút thuốc lá - thuốc lá điện tử, các loại hung khí vào trường / 1 trường hợp', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL07', nhom: 'KL', ten_muc: 'Mang chất dễ gây cháy nổ, hộp quẹt, đồ trang điểm vào trường / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL08', nhom: 'KL', ten_muc: 'Đem điện thoại, máy nghe nhạc vào trường/lớp không sử dụng, hoặc sử dụng / 1 trường hợp', diem: -10, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL09', nhom: 'KL', ten_muc: 'Vô lễ với giáo viên, nhân viên / 1 trường hợp', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL10', nhom: 'KL', ten_muc: 'Đem ấn phẩm, sách báo, phim ảnh cấm / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL11', nhom: 'KL', ten_muc: 'Gây gổ, đánh nhau, làm mất trật tự lớp học, trường học / 1 trường hợp', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL12', nhom: 'KL', ten_muc: 'Uống rượu, bia, đánh bạc (bất kỳ hình thức nào) / 1 trường hợp', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL13', nhom: 'KL', ten_muc: 'Ăn cắp, phá hoại tài sản của người khác, của công / 1 trường hợp', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL14', nhom: 'KL', ten_muc: 'Vào lớp chậm trong giờ ra chơi / 1 trường hợp', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL15', nhom: 'KL', ten_muc: 'Nhận cơm không đúng giờ quy định / tập thể', diem: -10, nghiem_trong: false, pham_vi: 'tap_the' }
];

function setupQLHSSheet() {
  var ss = SpreadsheetApp.create(SHEET_NAME);
  var defaultSheet = ss.getSheets()[0];
  var tabOrder = ['HocSinh', 'PhuHuynh', 'BanCanSu', 'DanhMucDiem', 'CauHinhTuan', 'GhiNhan', 'NhatKyImport'];
  var sheets = {};

  tabOrder.forEach(function (tabName, index) {
    var sheet = index === 0 ? defaultSheet : ss.insertSheet(tabName);
    sheet.setName(tabName);
    var headers = TAB_SCHEMA[tabName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheets[tabName] = sheet;
  });

  seedDanhMucDiem_(sheets.DanhMucDiem);

  Logger.log('Đã tạo Sheet: ' + ss.getUrl());
  Logger.log('Số mục DanhMucDiem: ' + DANH_MUC_DIEM_SEED.length);
  return ss.getUrl();
}

function seedDanhMucDiem_(sheet) {
  var headers = TAB_SCHEMA.DanhMucDiem;
  var rows = DANH_MUC_DIEM_SEED.map(function (item) {
    return headers.map(function (col) { return item[col] !== undefined ? item[col] : ''; });
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function taoCauHinhTuanNamHoc() {
  return taoCauHinhTuan({
    ngay_bat_dau: '2025-08-18',
    tong_so_tuan: 37,
    khoang_nghi: [
      { tu_ngay: '2026-02-16', den_ngay: '2026-02-22', ten: 'Nghi Tet' }
    ],
    xoa_du_lieu_cu: true
  });
}

function taoCauHinhTuan(config) {
  config = config || {};
  var startDate = parseIsoDateForSetup_(config.ngay_bat_dau || '2025-08-18');
  var totalWeeks = Number(config.tong_so_tuan || 37);
  var holidayRanges = (config.khoang_nghi || []).map(function (range) {
    return {
      tu_ngay: parseIsoDateForSetup_(range.tu_ngay),
      den_ngay: parseIsoDateForSetup_(range.den_ngay),
      ten: range.ten || ''
    };
  });

  if (!startDate) {
    throw new Error('ngay_bat_dau phai co dinh dang YYYY-MM-DD');
  }
  if (!totalWeeks || totalWeeks < 1) {
    throw new Error('tong_so_tuan phai la so duong');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Hay mo script tu Google Sheet can cap nhat, hoac chay setupQLHSSheet() truoc.');
  }

  var sheet = ss.getSheetByName('CauHinhTuan');
  if (!sheet) {
    sheet = ss.insertSheet('CauHinhTuan');
  }

  ensureSheetHeaders_(sheet, TAB_SCHEMA.CauHinhTuan);

  var headers = getHeaderValues_(sheet);
  var rows = [];
  for (var index = 0; index < totalWeeks; index += 1) {
    var weekStart = addDaysForSetup_(startDate, index * 7);
    var weekEnd = addDaysForSetup_(weekStart, 4);
    var isHoliday = holidayRanges.some(function (range) {
      return rangesOverlapForSetup_(weekStart, weekEnd, range.tu_ngay, range.den_ngay);
    });
    var item = {
      tuan_so: index + 1,
      tu_ngay: formatIsoDateForSetup_(weekStart),
      den_ngay: formatIsoDateForSetup_(weekEnd),
      so_ngay: isHoliday ? 0 : 5,
      loai_tuan: isHoliday ? 'nghi_le' : 'hoc_binh_thuong'
    };
    rows.push(headers.map(function (col) { return item[col] !== undefined ? item[col] : ''; }));
  }

  if (config.xoa_du_lieu_cu !== false && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log('Da tao ' + rows.length + ' dong CauHinhTuan trong sheet: ' + ss.getName());
  return rows.length;
}

function ensureSheetHeaders_(sheet, expectedHeaders) {
  var currentHeaders = getHeaderValues_(sheet);
  if (currentHeaders.length === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    return;
  }

  expectedHeaders.forEach(function (header) {
    if (currentHeaders.indexOf(header) === -1) {
      sheet.getRange(1, currentHeaders.length + 1).setValue(header);
      currentHeaders.push(header);
    }
  });

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, currentHeaders.length).setFontWeight('bold');
}

function getHeaderValues_(sheet) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || '').trim();
  }).filter(function (value) { return value !== ''; });
}

function parseIsoDateForSetup_(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addDaysForSetup_(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function rangesOverlapForSetup_(leftStart, leftEnd, rightStart, rightEnd) {
  return Boolean(rightStart && rightEnd && leftStart <= rightEnd && rightStart <= leftEnd);
}

function formatIsoDateForSetup_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
