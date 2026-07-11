const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const students = JSON.parse(
  fs.readFileSync(path.join(root, 'du-lieu-mau/hocsinh_seed.json'), 'utf8')
);
const weeks = JSON.parse(
  fs.readFileSync(path.join(root, 'du-lieu-mau/cau_hinh_tuan_seed.json'), 'utf8')
);

const headers = [
  'ma_hs', 'tt', 'ho', 'ten', 'dien', 'nu', 'dan_toc', 'ngay_sinh',
  'sdt_1', 'sdt_2', 'ngay_nhap_hoc', 'ngay_roi_lop', 'token_ho_so',
  'la_co_do', 'anh_dai_dien', 'ghi_chu',
];

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  const s = String(v);
  return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvLines = [headers.join(',')].concat(
  students.map((s) => headers.map((h) => csvEscape(s[h])).join(','))
);
fs.writeFileSync(
  path.join(root, 'du-lieu-mau/hocsinh_seed.csv'),
  '\uFEFF' + csvLines.join('\n'),
  'utf8'
);

const gs = `/** Auto-generated from du-lieu-mau/*.json — commit C004 */

var CAU_HINH_TUAN_SEED = ${JSON.stringify(weeks, null, 2)};

var HOCSINH_SEED = ${JSON.stringify(students, null, 2)};

/**
 * Nạp học sinh + cấu hình tuần vào Sheet đã tạo (sau setupQLHSSheet).
 * @param {string} spreadsheetId ID từ URL Sheet (phần giữa /d/ và /edit)
 */
function seedInitialData(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  seedHocSinh_(ss.getSheetByName('HocSinh'));
  seedCauHinhTuan_(ss.getSheetByName('CauHinhTuan'));
  Logger.log('Đã nạp ' + HOCSINH_SEED.length + ' học sinh và ' + CAU_HINH_TUAN_SEED.length + ' tuần.');
}

function seedHocSinh_(sheet) {
  if (!sheet) throw new Error('Không tìm thấy tab HocSinh');
  var headers = TAB_SCHEMA.HocSinh;
  var rows = HOCSINH_SEED.map(function (item) {
    return headers.map(function (col) {
      return item[col] !== undefined && item[col] !== null ? item[col] : '';
    });
  });
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow(), headers.length).clearContent();
  }
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function seedCauHinhTuan_(sheet) {
  if (!sheet) throw new Error('Không tìm thấy tab CauHinhTuan');
  var headers = TAB_SCHEMA.CauHinhTuan;
  var rows = CAU_HINH_TUAN_SEED.map(function (item) {
    return headers.map(function (col) {
      return item[col] !== undefined ? item[col] : '';
    });
  });
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow(), headers.length).clearContent();
  }
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
`;

fs.writeFileSync(path.join(root, 'apps-script/SeedData.gs'), gs, 'utf8');
console.log('Generated:', students.length, 'students,', weeks.length, 'weeks');
