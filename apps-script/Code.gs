/**
 * QLHS — Web App API (doGet / doPost)
 * Deploy: Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone
 *
 * Cấu hình SPREADSHEET_ID trùng Sheet đã setup + seed.
 */

var API_CONFIG = {
  SPREADSHEET_ID: '1-QrQtX59NdPMjmjsPUqxTJpL4M9tYt3AuA_S8Vv6woE',
  DRIVE_ROOT: 'QLHS_11C5_2025-2026',
  IMPORT_SUBDIR: 'nhat-ky-nhap-lieu',
};

var SHEET_TABS = {
  HocSinh: 'HocSinh',
  PhuHuynh: 'PhuHuynh',
  BanCanSu: 'BanCanSu',
  DanhMucDiem: 'DanhMucDiem',
  CauHinhTuan: 'CauHinhTuan',
  GhiNhan: 'GhiNhan',
  NhatKyImport: 'NhatKyImport',
};

var IMPORT_TAB_MAP = {
  hoc_sinh: 'HocSinh',
  ghi_nhan: 'GhiNhan',
  phu_huynh: 'PhuHuynh',
  ban_can_su: 'BanCanSu',
};

var IMPORT_FOLDER_NAMES = {
  hoc_sinh: 'hoc-sinh',
  ghi_nhan: 'ghi-nhan',
  phu_huynh: 'phu-huynh',
  ban_can_su: 'ban-can-su',
};

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'students';
    var data;

    switch (action) {
      case 'students':
        data = getSheetObjects_(SHEET_TABS.HocSinh);
        break;
      case 'student_by_token':
        data = getSheetObjects_(SHEET_TABS.HocSinh).filter(function (row) {
          return row.token_ho_so === params.token;
        })[0] || null;
        break;
      case 'records':
        data = getSheetObjects_(SHEET_TABS.GhiNhan);
        if (params.ma_hs) {
          data = data.filter(function (row) { return row.ma_hs === params.ma_hs; });
        }
        break;
      case 'danh_muc_diem':
        data = getSheetObjects_(SHEET_TABS.DanhMucDiem);
        break;
      case 'cau_hinh_tuan':
        data = getSheetObjects_(SHEET_TABS.CauHinhTuan);
        break;
      case 'ban_can_su':
        data = getSheetObjects_(SHEET_TABS.BanCanSu);
        break;
      case 'phu_huynh':
        data = getSheetObjects_(SHEET_TABS.PhuHuynh);
        if (params.ma_hs) {
          data = data.filter(function (row) { return row.ma_hs === params.ma_hs; });
        }
        break;
      case 'nhat_ky_import':
        data = getSheetObjects_(SHEET_TABS.NhatKyImport);
        break;
      default:
        return jsonResponse_({ ok: false, error: 'Unknown action: ' + action }, 400);
    }

    return jsonResponse_({ ok: true, data: data });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 500);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.import && body.loai && body.rows) {
      var result = importBatch_(body.loai, body.rows, body.nguoi_thuc_hien || '');
      return jsonResponse_({ ok: true, data: result });
    }

    if (body.tab && body.row) {
      var written = appendRow_(body.tab, body.row);
      return jsonResponse_({ ok: true, data: written });
    }

    return jsonResponse_({ ok: false, error: 'Invalid POST body' }, 400);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 500);
  }
}

// --- Đọc Sheet ---

function getSpreadsheet_() {
  return SpreadsheetApp.openById(API_CONFIG.SPREADSHEET_ID);
}

function getSheetObjects_(tabName) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0];
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var obj = {};
    var empty = true;
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      if (!key) continue;
      var val = values[i][j];
      obj[key] = coerceCellValue_(val);
      if (val !== '' && val !== null) empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function coerceCellValue_(val) {
  if (val === '') return null;
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}

// --- Ghi 1 dòng (C012) ---

function appendRow_(tabName, row) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var line = headers.map(function (h) {
    return row[h] !== undefined && row[h] !== null ? row[h] : '';
  });
  sheet.appendRow(line);
  return row;
}

// --- Import hàng loạt (C013) ---

function importBatch_(loai, rows, nguoiThucHien) {
  var tabName = IMPORT_TAB_MAP[loai];
  if (!tabName) throw new Error('Unknown loai: ' + loai);

  var maLog = generateId_('LOG', SHEET_TABS.NhatKyImport, 'ma_log');
  var fileUrl = saveImportJsonToDrive_(loai, rows, maLog);
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var success = 0;
  var errors = [];

  rows.forEach(function (row, index) {
    try {
      var enriched = Object.assign({}, row);
      if (loai === 'ghi_nhan' && !enriched.ma_ghi_nhan) {
        enriched.ma_ghi_nhan = generateId_('GN', SHEET_TABS.GhiNhan, 'ma_ghi_nhan');
      }
      if (loai === 'ghi_nhan') {
        enriched.ma_log_import = maLog;
      }
      var line = headers.map(function (h) {
        return enriched[h] !== undefined && enriched[h] !== null ? enriched[h] : '';
      });
      sheet.appendRow(line);
      success++;
    } catch (rowErr) {
      errors.push('Dòng ' + (index + 1) + ': ' + rowErr);
    }
  });

  var trangThai = errors.length === 0 ? 'thanh_cong' : (success > 0 ? 'loi_mot_phan' : 'that_bai');
  var logRow = {
    ma_log: maLog,
    thoi_gian: new Date(),
    loai_du_lieu: loai,
    so_dong: success,
    nguoi_thuc_hien: nguoiThucHien,
    trang_thai: trangThai,
    duong_dan_file_goc: fileUrl,
    ghi_chu: errors.length ? errors.join('; ') : '',
  };
  appendRow_(SHEET_TABS.NhatKyImport, logRow);

  return {
    ma_log: maLog,
    trang_thai: trangThai,
    so_dong_thanh_cong: success,
    so_dong_loi: errors.length,
    ghi_chu: logRow.ghi_chu || null,
    duong_dan_file_goc: fileUrl,
  };
}

function saveImportJsonToDrive_(loai, rows, maLog) {
  var rootName = API_CONFIG.DRIVE_ROOT;
  var folderKey = IMPORT_FOLDER_NAMES[loai] || loai;
  var folders = getOrCreateFolderPath_([rootName, API_CONFIG.IMPORT_SUBDIR, folderKey]);

  var now = new Date();
  var stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
  var fileName = stamp + '_' + loai.toUpperCase() + '_import.json';
  var file = folders.createFile(fileName, JSON.stringify(rows, null, 2), MimeType.PLAIN_TEXT);
  file.setDescription('QLHS import log ' + maLog);
  return file.getUrl();
}

function getOrCreateFolderPath_(parts) {
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i];
    var it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  }
  return folder;
}

function generateId_(prefix, tabName, keyField) {
  var rows = getSheetObjects_(tabName);
  var max = 0;
  rows.forEach(function (row) {
    var id = String(row[keyField] || '');
    var num = parseInt(id.replace(prefix, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  var next = max + 1;
  return prefix + String(next).padStart(6, '0');
}

function jsonResponse_(payload, status) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
