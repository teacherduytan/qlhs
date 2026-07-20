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

var API_VERSION = 'C116-2026-07-20';

var SHEET_TABS = {
  HocSinh: 'HocSinh',
  PhuHuynh: 'PhuHuynh',
  BanCanSu: 'BanCanSu',
  DanhMucDiem: 'DanhMucDiem',
  DanhMucXuLy: 'DanhMucXuLy',
  CauHinhTuan: 'CauHinhTuan',
  GhiNhan: 'GhiNhan',
  NhatKyImport: 'NhatKyImport',
};

var POINT_CATALOG_HEADERS = [
  'ma_danh_muc',
  'nhom',
  'ten_muc',
  'diem',
  'nghiem_trong',
  'pham_vi',
  'mo_ta',
  'de_xuat_xu_ly',
  'ma_xu_ly_de_xuat',
];

var HANDLING_CATALOG_HEADERS = [
  'ma_xu_ly',
  'ten_xu_ly',
  'noi_dung_xu_ly',
  'muc_do',
  'ghi_chu',
];

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

var TEACHER_SESSION_TTL_SECONDS = 8 * 60 * 60;

function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'students';
    var data;

    switch (action) {
      case 'api_health':
        data = {
          version: API_VERSION,
          supports: {
            add_records: true,
            delete_record: true,
            point_catalog_crud: true,
            point_catalog_guidance_fields: true,
            handling_catalog_crud: true,
            import_requires_catalog_match: true,
            attendance_report: true,
            teacher_login_get: true,
            teacher_session: true,
          },
        };
        break;
      case 'teacher_login':
        return handleTeacherLogin_(params);
      case 'verify_teacher_session':
        data = { valid: isValidTeacherSession_(params.teacher_session_token) };
        break;
      case 'students':
        data = getSheetObjects_(SHEET_TABS.HocSinh);
        break;
      case 'student_by_token':
        data = getSheetObjects_(SHEET_TABS.HocSinh).filter(function (row) {
          return row.token_ho_so === params.token;
        })[0] || null;
        if (data) data = sanitizePublicStudent_(data);
        break;
      case 'records':
        data = getSheetObjects_(SHEET_TABS.GhiNhan);
        if (params.ma_hs) {
          data = data.filter(function (row) { return row.ma_hs === params.ma_hs; });
        }
        break;
      case 'danh_muc_diem':
        ensurePointCatalogHeaders_();
        data = getSheetObjects_(SHEET_TABS.DanhMucDiem);
        break;
      case 'danh_muc_xu_ly':
        ensureHandlingCatalogHeaders_();
        data = getSheetObjects_(SHEET_TABS.DanhMucXuLy);
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
    var body = parsePostBody_(e);

    if (body.action === 'teacher_login') {
      return handleTeacherLogin_(body);
    }

    if (body.action === 'verify_teacher_session') {
      return jsonResponse_({
        ok: true,
        data: { valid: isValidTeacherSession_(body.teacher_session_token) },
      });
    }

    verifyTeacherSession_(body);

    if (body.action === 'add_student' && body.student) {
      var createdStudent = appendUniqueRow_(SHEET_TABS.HocSinh, body.student, 'ma_hs');
      return jsonResponse_({ ok: true, data: createdStudent });
    }

    if (body.action === 'update_student' && body.ma_hs && body.student) {
      var updatedStudent = updateRowByKey_(SHEET_TABS.HocSinh, 'ma_hs', body.ma_hs, body.student);
      return jsonResponse_({ ok: true, data: updatedStudent });
    }

    if (body.action === 'delete_student' && body.ma_hs) {
      deleteRowByKey_(SHEET_TABS.HocSinh, 'ma_hs', body.ma_hs);
      return jsonResponse_({ ok: true, data: null });
    }

    if (body.action === 'add_point_catalog_item' && body.item) {
      ensurePointCatalogHeaders_();
      var createdCatalogItem = appendUniqueRow_(
        SHEET_TABS.DanhMucDiem,
        normalizePointCatalogItem_(body.item),
        'ma_danh_muc'
      );
      return jsonResponse_({ ok: true, data: createdCatalogItem });
    }

    if (body.action === 'update_point_catalog_item' && body.ma_danh_muc && body.item) {
      ensurePointCatalogHeaders_();
      var updatedCatalogItem = updateRowByKey_(
        SHEET_TABS.DanhMucDiem,
        'ma_danh_muc',
        body.ma_danh_muc,
        normalizePointCatalogItem_(body.item, body.ma_danh_muc)
      );
      return jsonResponse_({ ok: true, data: updatedCatalogItem });
    }

    if (body.action === 'delete_point_catalog_item' && body.ma_danh_muc) {
      deletePointCatalogItem_(body.ma_danh_muc);
      return jsonResponse_({ ok: true, data: null });
    }

    if (body.action === 'add_handling_catalog_item' && body.item) {
      ensureHandlingCatalogHeaders_();
      var normalizedHandlingItem = normalizeHandlingCatalogItem_(body.item);
      assertUniqueHandlingContent_(normalizedHandlingItem);
      var createdHandlingItem = appendUniqueRow_(
        SHEET_TABS.DanhMucXuLy,
        normalizedHandlingItem,
        'ma_xu_ly'
      );
      return jsonResponse_({ ok: true, data: createdHandlingItem });
    }

    if (body.action === 'update_handling_catalog_item' && body.ma_xu_ly && body.item) {
      ensureHandlingCatalogHeaders_();
      var normalizedUpdatedHandlingItem = normalizeHandlingCatalogItem_(body.item, body.ma_xu_ly);
      assertUniqueHandlingContent_(normalizedUpdatedHandlingItem, body.ma_xu_ly);
      var updatedHandlingItem = updateRowByKey_(
        SHEET_TABS.DanhMucXuLy,
        'ma_xu_ly',
        body.ma_xu_ly,
        normalizedUpdatedHandlingItem
      );
      return jsonResponse_({ ok: true, data: updatedHandlingItem });
    }

    if (body.action === 'delete_handling_catalog_item' && body.ma_xu_ly) {
      deleteHandlingCatalogItem_(body.ma_xu_ly);
      return jsonResponse_({ ok: true, data: null });
    }

    if (body.action === 'add_records' && body.records) {
      var createdRecords = appendGhiNhanRecords_(body.records);
      return jsonResponse_({ ok: true, data: createdRecords });
    }

    if (body.action === 'delete_record') {
      if (!body.ma_ghi_nhan) {
        throw new Error('Missing ma_ghi_nhan for delete_record');
      }
      deleteRowByKey_(SHEET_TABS.GhiNhan, 'ma_ghi_nhan', body.ma_ghi_nhan);
      return jsonResponse_({ ok: true, data: null });
    }

    if (body.action === 'process_collective_event' && body.source_record_id && body.status) {
      var generated = processCollectiveEvent_(
        body.source_record_id,
        body.status,
        body.generated_records || []
      );
      return jsonResponse_({ ok: true, data: generated });
    }

    if (body.action === 'delete_import' && body.ma_log) {
      var deleteResult = deleteImport_(body.ma_log);
      return jsonResponse_({ ok: true, data: deleteResult });
    }

    if (body.action === 'calculate_attendance_report') {
      var attendanceReport = calculateAttendanceReport_(body);
      return jsonResponse_({ ok: true, data: attendanceReport });
    }

    if (body.action === 'build_attendance_form_url') {
      var formUrl = buildAttendanceFormUrl_(body.payload || {});
      return jsonResponse_({ ok: true, data: { url: formUrl } });
    }

    if (body.import && body.loai && body.rows) {
      var result = importBatch_(body.loai, body.rows, body.nguoi_thuc_hien || '');
      return jsonResponse_({ ok: true, data: result });
    }

    if (body.tab && body.row) {
      var written = appendRow_(body.tab, body.row);
      return jsonResponse_({ ok: true, data: written });
    }

    return jsonResponse_({
      ok: false,
      error: 'Unsupported POST action: ' + (body.action || '(missing action)'),
    }, 400);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 500);
  }
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing POST body contents');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('POST body is not valid JSON');
  }
}

// --- Báo cáo sĩ số (C116) ---

function calculateAttendanceReport_(body) {
  var targetDate = parseIsoDate_(body.ngay);
  var session = normalizeAttendanceSession_(body.buoi);
  var lateAsPresent = body.tre_tinh_co_mat !== false;
  var spreadsheet = getAttendanceSpreadsheet_();
  var weekNumber = findAttendanceWeekNumber_(spreadsheet, targetDate);
  var sheetName = 'Chính khóa - Tuần ' + weekNumber;
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Tuần ' + weekNumber + ' chưa được tạo trong hệ thống.');
  }

  var attendanceColumn = findAttendanceColumn_(sheet, targetDate, session);
  var values = sheet.getDataRange().getDisplayValues();
  var present = createAttendanceCount_();
  var total = createAttendanceCount_();
  var absent = [];
  var absentStatuses = { 'Vắng có phép': true, 'Vắng không phép': true };

  for (var rowIndex = 8; rowIndex < values.length; rowIndex++) {
    var row = values[rowIndex] || [];
    var studentName = String(row[1] || '').trim();
    if (!studentName) {
      continue;
    }

    var studentType = normalizeStudentType_(row[2]);
    if (!studentType) {
      continue;
    }

    var status = String(row[attendanceColumn] || '').trim();
    var isAbsent = absentStatuses[status] === true;
    var isLate = status === 'Trễ';
    var isPresent = status === '' || (isLate && lateAsPresent);

    total[studentType] += 1;
    if (isPresent) {
      present[studentType] += 1;
    }
    if (isAbsent || (isLate && !lateAsPresent)) {
      absent.push(studentName + ' (' + studentType + ')');
    }
  }

  return {
    ngay: targetDate.iso,
    buoi: session,
    tuan_so: weekNumber,
    sheet_name: sheetName,
    tre_tinh_co_mat: lateAsPresent,
    co_mat: present,
    tong: total,
    vang: absent,
    generated_at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
  };
}

function buildAttendanceFormUrl_(payload) {
  var config = getAttendanceFormConfig_();
  var questions = config.questions;
  var params = [];
  var date = parseIsoDate_(payload.ngay);
  var session = normalizeAttendanceSession_(payload.buoi);
  var present = payload.co_mat || {};
  var meals = payload.so_mon || {};
  var absentList = Array.isArray(payload.vang) ? payload.vang : [];
  var className = config.className || '11C5';

  addRequiredFormParam_(params, questions, ['Nhập Password', 'Password'], config.password);
  addRequiredFormParam_(params, questions, ['NGÀY', 'Ngay'], date.iso);
  addRequiredFormParam_(params, questions, ['LỚP', 'Lop'], className);
  addRequiredFormParam_(params, questions, ['BUỔI HỌC', 'Buoi hoc'], session === 'SANG' ? 'SÁNG' : 'CHIỀU');
  addRequiredFormParam_(params, questions, ['NỘI TRÚ (CÓ MẶT)', 'Noi tru co mat'], present.NT || 0);
  addRequiredFormParam_(params, questions, ['BÁN TRÚ (CÓ MẶT)', 'Ban tru co mat'], present.BT || 0);
  addRequiredFormParam_(params, questions, ['HAI BUỔI (CÓ MẶT)', 'Hai buoi co mat'], present['2B'] || 0);
  addRequiredFormParam_(
    params,
    questions,
    ['TÊN HỌC SINH VẮNG (DIỆN)', 'Ten hoc sinh vang dien'],
    absentList.join(', ')
  );

  addOptionalFormParam_(params, questions, ['SỐ MÓN CHÍNH 1', 'So mon chinh 1'], meals.mon_chinh_1 || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN CHÍNH 2', 'So mon chinh 2'], meals.mon_chinh_2 || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN PHỤ 1(Trứng)', 'SỐ MÓN PHỤ 1 (Trứng)', 'So mon phu 1 trung'], meals.mon_phu_1 || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN PHỤ 2 (Cá hộp)', 'So mon phu 2 ca hop'], meals.mon_phu_2 || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN CHÍNH 1 (NGÀY MAI)', 'So mon chinh 1 ngay mai'], meals.mon_chinh_1_ngay_mai || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN CHÍNH 2 (NGÀY MAI)', 'So mon chinh 2 ngay mai'], meals.mon_chinh_2_ngay_mai || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN PHỤ 1 (NGÀY MAI) Trứng', 'So mon phu 1 ngay mai trung'], meals.mon_phu_1_ngay_mai || '');
  addOptionalFormParam_(params, questions, ['SỐ MÓN PHỤ 2 (NGÀY MAI) Cá hộp', 'So mon phu 2 ngay mai ca hop'], meals.mon_phu_2_ngay_mai || '');

  return config.baseUrl + (config.baseUrl.indexOf('?') === -1 ? '?' : '&') + 'usp=pp_url&' + params.join('&');
}

function getAttendanceSpreadsheet_() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('ATTENDANCE_SPREADSHEET_ID');
  if (!sheetId) {
    throw new Error('Missing Apps Script property: ATTENDANCE_SPREADSHEET_ID');
  }
  return SpreadsheetApp.openById(sheetId);
}

function findAttendanceWeekNumber_(spreadsheet, targetDate) {
  var sheet = spreadsheet.getSheetByName('Cấu hình tuần');
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "Cấu hình tuần" trong file điểm danh.');
  }

  var values = sheet.getDataRange().getValues();
  for (var i = 5; i < values.length; i++) {
    var row = values[i] || [];
    var weekNumber = Number(row[0]);
    if (!weekNumber) continue;

    var start = parseSheetDate_(row[1]);
    var end = parseSheetDate_(row[2]);
    if (!start || !end) continue;

    if (start.key <= targetDate.key && targetDate.key <= end.key) {
      return weekNumber;
    }
  }

  throw new Error('Ngày này chưa có trong lịch điểm danh.');
}

function findAttendanceColumn_(sheet, targetDate, session) {
  var lastColumn = sheet.getLastColumn();
  var header = sheet.getRange(7, 1, 1, lastColumn).getDisplayValues()[0];
  var totalColumn = lastColumn;
  for (var index = 0; index < header.length; index++) {
    if (normalizeText_(header[index]).indexOf('tong ket') !== -1) {
      totalColumn = index;
      break;
    }
  }

  for (var col = 5; col < totalColumn; col += 2) {
    var dayMonth = parseAttendanceHeaderDayMonth_(header[col]);
    if (!dayMonth) continue;
    if (dayMonth.day === targetDate.day && dayMonth.month === targetDate.month) {
      var offset = session === 'SANG' ? 0 : 1;
      if (col + offset >= totalColumn) {
        break;
      }
      return col + offset;
    }
  }

  throw new Error('Không tìm thấy cột điểm danh cho ngày ' + targetDate.display + ' trong sheet "' + sheet.getName() + '".');
}

function parseAttendanceHeaderDayMonth_(value) {
  var lines = String(value || '').split(/\r?\n/).map(function (line) {
    return line.trim();
  }).filter(Boolean);
  var text = lines.length ? lines[lines.length - 1] : String(value || '').trim();
  var match = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]) };
}

function getAttendanceFormConfig_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('ATTENDANCE_FORM_ENTRIES_JSON');
  var parsed = raw ? JSON.parse(raw) : {};
  var baseUrl = String(parsed.form_base_url || props.getProperty('ATTENDANCE_FORM_BASE_URL') || '').trim();
  var password = String(parsed.form_password || props.getProperty('ATTENDANCE_FORM_PASSWORD') || '').trim();
  var className = String(parsed.class_name || props.getProperty('ATTENDANCE_CLASS_NAME') || '11C5').trim();
  var questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  if (!baseUrl) throw new Error('Missing Apps Script property: ATTENDANCE_FORM_BASE_URL or form_base_url');
  if (!password) throw new Error('Missing Apps Script property: ATTENDANCE_FORM_PASSWORD or form_password');
  if (!questions.length) throw new Error('Missing questions[] in ATTENDANCE_FORM_ENTRIES_JSON');

  var questionMap = {};
  questions.forEach(function (question) {
    var title = normalizeText_(question.title);
    var entry = String(question.entry || '').trim();
    if (title && entry) {
      questionMap[title] = entry;
    }
  });

  return {
    baseUrl: baseUrl,
    password: password,
    className: className,
    questions: questionMap,
  };
}

function addRequiredFormParam_(params, questions, titles, value) {
  var entry = findQuestionEntry_(questions, titles);
  if (!entry) {
    throw new Error('Thiếu entry Google Form cho câu hỏi: ' + titles[0]);
  }
  addFormParam_(params, entry, value);
}

function addOptionalFormParam_(params, questions, titles, value) {
  var entry = findQuestionEntry_(questions, titles);
  if (entry) {
    addFormParam_(params, entry, value);
  }
}

function findQuestionEntry_(questions, titles) {
  for (var i = 0; i < titles.length; i++) {
    var entry = questions[normalizeText_(titles[i])];
    if (entry) return entry;
  }
  return '';
}

function addFormParam_(params, entry, value) {
  params.push(encodeURIComponent(entry) + '=' + encodeURIComponent(String(value === null || value === undefined ? '' : value)));
}

function parseIsoDate_(value) {
  var match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Ngày không hợp lệ, cần định dạng YYYY-MM-DD.');
  }

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  return {
    iso: match[0],
    year: year,
    month: month,
    day: day,
    key: year * 10000 + month * 100 + day,
    display: String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year,
  };
}

function parseSheetDate_(value) {
  if (value instanceof Date) {
    var year = value.getFullYear();
    var month = value.getMonth() + 1;
    var day = value.getDate();
    return {
      year: year,
      month: month,
      day: day,
      key: year * 10000 + month * 100 + day,
    };
  }

  var text = String(value || '').trim();
  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
      key: Number(iso[1]) * 10000 + Number(iso[2]) * 100 + Number(iso[3]),
    };
  }

  var dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return {
      year: Number(dmy[3]),
      month: Number(dmy[2]),
      day: Number(dmy[1]),
      key: Number(dmy[3]) * 10000 + Number(dmy[2]) * 100 + Number(dmy[1]),
    };
  }

  return null;
}

function normalizeAttendanceSession_(value) {
  var text = normalizeText_(value);
  if (text === 'sang' || text === 's') return 'SANG';
  if (text === 'chieu' || text === 'c') return 'CHIEU';
  if (String(value || '').toUpperCase() === 'SANG') return 'SANG';
  if (String(value || '').toUpperCase() === 'CHIEU') return 'CHIEU';
  throw new Error('Buổi học không hợp lệ, chỉ nhận Sáng hoặc Chiều.');
}

function normalizeStudentType_(value) {
  var text = String(value || '').trim().toUpperCase();
  return text === '2B' || text === 'BT' || text === 'NT' ? text : '';
}

function createAttendanceCount_() {
  return { NT: 0, BT: 0, '2B': 0 };
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function sanitizePublicStudent_(student) {
  var safe = Object.assign({}, student);
  safe.sdt_1 = null;
  safe.sdt_2 = null;
  return safe;
}

function handleTeacherLogin_(body) {
  var expected = PropertiesService.getScriptProperties().getProperty('QLHS_TEACHER_PASSWORD');
  if (!expected) {
    throw new Error('Missing Apps Script property: QLHS_TEACHER_PASSWORD');
  }

  if (!body || String(body.password || '') !== expected) {
    throw new Error('Sai mật khẩu giáo viên');
  }

  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  CacheService.getScriptCache().put(
    getTeacherSessionCacheKey_(token),
    '1',
    TEACHER_SESSION_TTL_SECONDS
  );

  return jsonResponse_({
    ok: true,
    data: {
      token: token,
      expires_in_seconds: TEACHER_SESSION_TTL_SECONDS,
    },
  });
}

function verifyTeacherSession_(body) {
  if (!body || !isValidTeacherSession_(body.teacher_session_token)) {
    throw new Error('Phiên đăng nhập giáo viên đã hết hạn. Vui lòng đăng nhập lại.');
  }
}

function isValidTeacherSession_(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get(getTeacherSessionCacheKey_(token)) === '1';
}

function getTeacherSessionCacheKey_(token) {
  return 'teacher_session_' + token;
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

function appendUniqueRow_(tabName, row, keyField) {
  var existing = getSheetObjects_(tabName).some(function (item) {
    return String(item[keyField] || '') === String(row[keyField] || '');
  });
  if (existing) throw new Error('Duplicate ' + keyField + ': ' + row[keyField]);
  return appendRow_(tabName, row);
}

function updateRowByKey_(tabName, keyField, keyValue, patch) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('No rows in tab: ' + tabName);

  var headers = values[0];
  var keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error('Key field not found: ' + keyField);

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(keyValue)) {
      var current = {};
      headers.forEach(function (header, index) {
        if (header) current[header] = coerceCellValue_(values[i][index]);
      });

      var updated = Object.assign({}, current, patch);
      updated[keyField] = keyValue;

      var line = headers.map(function (header) {
        return updated[header] !== undefined && updated[header] !== null ? updated[header] : '';
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([line]);
      return updated;
    }
  }

  throw new Error('Row not found: ' + keyValue);
}

function deleteRowByKey_(tabName, keyField, keyValue) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('No rows in tab: ' + tabName);

  var headers = values[0];
  var keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error('Key field not found: ' + keyField);

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][keyIndex]) === String(keyValue)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }

  throw new Error('Row not found: ' + keyValue);
}

function normalizePointCatalogItem_(item, fixedCode) {
  var code = String(fixedCode || item.ma_danh_muc || '').trim().toUpperCase();
  if (!code) throw new Error('Thieu ma_danh_muc');
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new Error('ma_danh_muc chi nen gom chu in hoa, so, dau gach ngang hoac gach duoi: ' + code);
  }

  var group = String(item.nhom || '').trim().toUpperCase();
  if (['CC', 'VS', 'NN', 'KL', 'KT'].indexOf(group) === -1) {
    throw new Error('Nhom danh muc khong hop le: ' + group);
  }

  var name = String(item.ten_muc || '').trim();
  if (!name) throw new Error('Thieu ten_muc');

  var point = Number(item.diem);
  if (isNaN(point)) throw new Error('Diem danh muc khong hop le: ' + item.diem);

  var scope = String(item.pham_vi || 'ca_nhan').trim();
  if (['ca_nhan', 'tap_the', 'to_truc'].indexOf(scope) === -1) {
    throw new Error('Pham vi danh muc khong hop le: ' + scope);
  }

  return {
    ma_danh_muc: code,
    nhom: group,
    ten_muc: name,
    diem: point,
    nghiem_trong: toBoolean_(item.nghiem_trong),
    pham_vi: scope,
    mo_ta: String(item.mo_ta || '').trim(),
    de_xuat_xu_ly: String(item.de_xuat_xu_ly || '').trim(),
    ma_xu_ly_de_xuat: String(item.ma_xu_ly_de_xuat || '').trim().toUpperCase(),
  };
}

function normalizeHandlingCatalogItem_(item, fixedCode) {
  var code = String(fixedCode || item.ma_xu_ly || '').trim().toUpperCase();
  if (!code) throw new Error('Thieu ma_xu_ly');
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new Error('ma_xu_ly chi nen gom chu in hoa, so, dau gach ngang hoac gach duoi: ' + code);
  }

  var name = String(item.ten_xu_ly || '').trim();
  if (!name) throw new Error('Thieu ten_xu_ly');

  var content = String(item.noi_dung_xu_ly || '').trim();
  if (!content) throw new Error('Thieu noi_dung_xu_ly');

  var level = String(item.muc_do || 'vua').trim();
  if (['nhe', 'vua', 'nang', 'tich_cuc'].indexOf(level) === -1) {
    throw new Error('muc_do xu ly khong hop le: ' + level);
  }

  return {
    ma_xu_ly: code,
    ten_xu_ly: name,
    noi_dung_xu_ly: content,
    muc_do: level,
    ghi_chu: String(item.ghi_chu || '').trim(),
  };
}

function assertUniqueHandlingContent_(item, fixedCode) {
  var normalizedContent = normalizeHandlingContent_(item.noi_dung_xu_ly);
  if (!normalizedContent) return;

  var currentCode = String(fixedCode || item.ma_xu_ly || '').trim().toUpperCase();
  var duplicated = getSheetObjects_(SHEET_TABS.DanhMucXuLy).filter(function (row) {
    var rowCode = String(row.ma_xu_ly || '').trim().toUpperCase();
    return rowCode !== currentCode && normalizeHandlingContent_(row.noi_dung_xu_ly) === normalizedContent;
  })[0];

  if (duplicated) {
    throw new Error(
      'Noi dung xu ly/phat da co ma ' +
        duplicated.ma_xu_ly +
        '. Hay chon ma co san thay vi tao moi.'
    );
  }
}

function normalizeHandlingContent_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function ensurePointCatalogHeaders_() {
  ensureSheetHeaders_(SHEET_TABS.DanhMucDiem, POINT_CATALOG_HEADERS);
}

function ensureHandlingCatalogHeaders_() {
  ensureSheetHeaders_(SHEET_TABS.DanhMucXuLy, HANDLING_CATALOG_HEADERS);
}

function ensureSheetHeaders_(tabName, expectedHeaders) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(tabName);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(function (header) {
    return String(header || '').trim() !== '';
  });
  var changed = false;

  expectedHeaders.forEach(function (header) {
    if (currentHeaders.indexOf(header) === -1) {
      currentHeaders.push(header);
      changed = true;
    }
  });

  if (changed || currentHeaders.length > lastColumn) {
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }
}

function deletePointCatalogItem_(maDanhMuc) {
  var code = String(maDanhMuc || '').trim().toUpperCase();
  var references = getSheetObjects_(SHEET_TABS.GhiNhan).filter(function (record) {
    return String(record.ma_danh_muc || '').trim().toUpperCase() === code;
  });

  if (references.length > 0) {
    throw new Error(
      'Khong the xoa danh muc ' + code + ' vi da co ' + references.length + ' ghi nhan dang dung ma nay.'
    );
  }

  deleteRowByKey_(SHEET_TABS.DanhMucDiem, 'ma_danh_muc', code);
}

function deleteHandlingCatalogItem_(maXuLy) {
  var code = String(maXuLy || '').trim().toUpperCase();
  ensurePointCatalogHeaders_();
  var references = getSheetObjects_(SHEET_TABS.DanhMucDiem).filter(function (item) {
    return String(item.ma_xu_ly_de_xuat || '').trim().toUpperCase() === code;
  });

  if (references.length > 0) {
    throw new Error(
      'Khong the xoa ma xu ly ' + code + ' vi da co ' + references.length + ' danh muc diem dang dung ma nay.'
    );
  }

  deleteRowByKey_(SHEET_TABS.DanhMucXuLy, 'ma_xu_ly', code);
}

function toBoolean_(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined || value === '') return false;

  var text = String(value).trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes' || text === 'x';
}

function appendGhiNhanRecords_(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Khong co ghi nhan nao de luu.');
  }

  var sheet = getSpreadsheet_().getSheetByName(SHEET_TABS.GhiNhan);
  if (!sheet) throw new Error('Tab not found: ' + SHEET_TABS.GhiNhan);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var nextNumber = getNextIdNumber_('GN', SHEET_TABS.GhiNhan, 'ma_ghi_nhan');
  var created = records.map(function (record) {
    var enriched = prepareManualGhiNhanRow_(record, 'GN' + String(nextNumber).padStart(6, '0'));
    nextNumber++;
    return enriched;
  });

  var lines = created.map(function (record) {
    return headers.map(function (h) {
      return record[h] !== undefined && record[h] !== null ? record[h] : '';
    });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, lines.length, headers.length).setValues(lines);

  return created;
}

function prepareManualGhiNhanRow_(record, generatedId) {
  var enriched = stripPrivateKeys_(record || {});
  var catalogItem = enriched.ma_danh_muc ? findByKey_(SHEET_TABS.DanhMucDiem, 'ma_danh_muc', enriched.ma_danh_muc) : null;
  if (!catalogItem) throw new Error('Khong tim thay ma_danh_muc: ' + enriched.ma_danh_muc);
  if (catalogItem.pham_vi !== 'ca_nhan') {
    throw new Error('Trang ghi nhan hoc sinh chi gan danh muc ca_nhan. Ma ' + catalogItem.ma_danh_muc + ' co pham_vi=' + catalogItem.pham_vi + '.');
  }

  if (!enriched.ma_hs) throw new Error('Ghi nhan nhap tay can ma_hs.');
  var student = findByKey_(SHEET_TABS.HocSinh, 'ma_hs', enriched.ma_hs);
  if (!student) throw new Error('Khong tim thay ma_hs: ' + enriched.ma_hs);

  enriched.ma_ghi_nhan = enriched.ma_ghi_nhan || generatedId;
  enriched.to_lien_quan = isBlank_(enriched.to_lien_quan) ? student.to : enriched.to_lien_quan;
  enriched.noi_dung = enriched.noi_dung || catalogItem.ten_muc;
  enriched.loai = enriched.loai || getRecordTypeForCatalogGroup_(catalogItem.nhom);
  enriched.nguon = enriched.nguon || 'nhap_tay';

  if (!enriched.ngay) {
    enriched.ngay = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  var prepared = prepareGhiNhanImportRow_(enriched, '');
  prepared.ma_log_import = '';
  prepared.nguon = 'nhap_tay';
  prepared.to_lien_quan = isBlank_(prepared.to_lien_quan) ? student.to : prepared.to_lien_quan;
  prepared.trang_thai_xu_ly_tap_the = '';
  prepared.su_kien_goc = prepared.su_kien_goc || '';

  if (!prepared.ma_hs) {
    throw new Error('Ghi nhan nhap tay phai tao dong ca nhan cho hoc sinh.');
  }

  return prepared;
}

function getRecordTypeForCatalogGroup_(group) {
  var map = {
    CC: 'chuyen_can',
    VS: 've_sinh',
    NN: 'ne_nep',
    KL: 'trat_tu_ky_luat',
    KT: 'khen_thuong',
  };
  return map[group] || 'ne_nep';
}

function deleteRowsByField_(tabName, keyField, keyValue) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) throw new Error('Tab not found: ' + tabName);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  var headers = values[0];
  var keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error('Key field not found: ' + keyField);

  var deleted = 0;
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][keyIndex] || '') === String(keyValue || '')) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }

  return deleted;
}

function deleteImport_(maLog) {
  var importLog = findByKey_(SHEET_TABS.NhatKyImport, 'ma_log', maLog);
  if (!importLog) throw new Error('Import log not found: ' + maLog);

  if (importLog.loai_du_lieu !== 'ghi_nhan') {
    throw new Error('Chi ho tro xoa du lieu import GhiNhan: ' + maLog);
  }

  var deleted = deleteRowsByField_(SHEET_TABS.GhiNhan, 'ma_log_import', maLog);
  var note = 'Da xoa ' + deleted + ' dong GhiNhan lien quan.';
  updateRowByKey_(SHEET_TABS.NhatKyImport, 'ma_log', maLog, {
    trang_thai: 'da_xoa',
    ghi_chu: note,
  });

  return {
    ma_log: maLog,
    so_dong_da_xoa: deleted,
    trang_thai: 'da_xoa',
    ghi_chu: note,
  };
}

function processCollectiveEvent_(sourceRecordId, status, generatedRecords) {
  updateRowByKey_(SHEET_TABS.GhiNhan, 'ma_ghi_nhan', sourceRecordId, {
    trang_thai_xu_ly_tap_the: status,
  });

  return generatedRecords.map(function (record) {
    var enriched = Object.assign({}, record);
    if (!enriched.ma_ghi_nhan) {
      enriched.ma_ghi_nhan = generateId_('GN', SHEET_TABS.GhiNhan, 'ma_ghi_nhan');
    }
    enriched.trang_thai_xu_ly_tap_the = '';
    enriched.su_kien_goc = sourceRecordId;
    return appendRow_(SHEET_TABS.GhiNhan, enriched);
  });
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
  var warnings = [];

  rows.forEach(function (row, index) {
    try {
      var enriched = prepareImportRow_(loai, row, maLog);
      var rowWarnings = enriched._import_warnings || [];
      rowWarnings.forEach(function (warning) {
        warnings.push('Dòng ' + (index + 1) + ': ' + warning);
      });

      var line = headers.map(function (h) {
        return enriched[h] !== undefined && enriched[h] !== null ? enriched[h] : '';
      });
      sheet.appendRow(line);
      success++;
    } catch (rowErr) {
      errors.push('Dòng ' + (index + 1) + ': ' + rowErr);
    }
  });

  var notes = errors.concat(warnings);
  var trangThai = notes.length === 0 ? 'thanh_cong' : (success > 0 ? 'loi_mot_phan' : 'that_bai');
  var logRow = {
    ma_log: maLog,
    thoi_gian: new Date(),
    loai_du_lieu: loai,
    so_dong: success,
    nguoi_thuc_hien: nguoiThucHien,
    trang_thai: trangThai,
    duong_dan_file_goc: fileUrl,
    ghi_chu: notes.length ? notes.join('; ') : '',
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

function prepareImportRow_(loai, row, maLog) {
  var enriched = stripPrivateKeys_(row);

  if (loai === 'ghi_nhan') {
    enriched = prepareGhiNhanImportRow_(enriched, maLog);
  }

  return enriched;
}

function prepareGhiNhanImportRow_(row, maLog) {
  var enriched = Object.assign({}, row);
  var catalogCode = String(enriched.ma_danh_muc || '').trim().toUpperCase();
  var catalogItem = null;
  if (catalogCode) {
    enriched.ma_danh_muc = catalogCode;
    catalogItem = findCatalogItemByCode_(catalogCode);
    if (!catalogItem) {
      throw new Error('ma_danh_muc khong ton tai trong DanhMucDiem: ' + catalogCode);
    }
  }
  var student = null;

  if (!enriched.ma_hs && enriched.ho_ten) {
    student = findStudentByFullName_(enriched.ho_ten);
    enriched.ma_hs = student.ma_hs;
  } else if (enriched.ma_hs) {
    student = findByKey_(SHEET_TABS.HocSinh, 'ma_hs', enriched.ma_hs);
    if (!student) throw new Error('Không tìm thấy ma_hs: ' + enriched.ma_hs);
  }

  if (student && !enriched.dien_tai_thoi_diem) {
    enriched.dien_tai_thoi_diem = student.dien;
  }

  if (isBlank_(enriched.tuan_so) && enriched.ngay) {
    var weekResult = resolveWeekNumberByDate_(enriched.ngay);
    if (!isBlank_(weekResult.tuan_so)) {
      enriched.tuan_so = weekResult.tuan_so;
    } else {
      enriched.tuan_so = '';
      addImportWarning_(enriched, weekResult.warning);
    }
  }

  if (catalogItem) {
    enriched.loai = getRecordTypeForCatalogGroup_(catalogItem.nhom);
    enriched.noi_dung = enriched.noi_dung || catalogItem.ten_muc;
    enriched.diem_cong_tru = catalogItem.diem;
  }

  if (!catalogItem && enriched.loai !== 'hoc_tap') {
    throw new Error('GhiNhan import can ma_danh_muc hop le trong DanhMucDiem, tru dong loai=hoc_tap.');
  }

  if (enriched.loai !== 'hoc_tap' && !isBlank_(enriched.diem_so_mon)) {
    addImportWarning_(
      enriched,
      'diem_so_mon chỉ được tính trên dòng loai=hoc_tap; hãy tách điểm số thành dòng hoc_tap riêng. Dòng này đã bỏ qua diem_so_mon.'
    );
    enriched.diem_so_mon = '';
  }

  if (enriched.loai === 'hoc_tap' && !isBlank_(enriched.ma_danh_muc)) {
    addImportWarning_(enriched, 'Dòng loai=hoc_tap không dùng ma_danh_muc; đã bỏ qua ma_danh_muc.');
    enriched.ma_danh_muc = '';
    enriched.diem_cong_tru = '';
  }

  if (!enriched.so_lan) enriched.so_lan = 1;
  if (enriched.da_xu_ly === null || enriched.da_xu_ly === undefined) enriched.da_xu_ly = false;
  if (enriched.goi_phu_huynh === null || enriched.goi_phu_huynh === undefined) enriched.goi_phu_huynh = false;
  if (!enriched.nguon) enriched.nguon = 'phieu_giay';
  if (!enriched.ma_ghi_nhan) enriched.ma_ghi_nhan = generateId_('GN', SHEET_TABS.GhiNhan, 'ma_ghi_nhan');
  enriched.ma_log_import = maLog;

  if (catalogItem && catalogItem.pham_vi !== 'ca_nhan') {
    enriched.ma_hs = null;
    if (!enriched.trang_thai_xu_ly_tap_the) enriched.trang_thai_xu_ly_tap_the = 'chua_xu_ly';
  } else if (!enriched.trang_thai_xu_ly_tap_the) {
    enriched.trang_thai_xu_ly_tap_the = '';
  }

  return enriched;
}

function stripPrivateKeys_(row) {
  var clean = {};
  Object.keys(row || {}).forEach(function (key) {
    if (key.charAt(0) !== '_') clean[key] = row[key];
  });
  return clean;
}

function findStudentByFullName_(fullName) {
  var normalizedName = normalizeText_(fullName);
  var matches = getSheetObjects_(SHEET_TABS.HocSinh).filter(function (student) {
    return normalizeText_(student.ho + ' ' + student.ten) === normalizedName;
  });

  if (matches.length === 0) throw new Error('Không khớp học sinh: ' + fullName);
  if (matches.length > 1) throw new Error('Trùng tên học sinh: ' + fullName);
  return matches[0];
}

function vaLaiTuanSoChoGhiNhan() {
  var sheet = getSpreadsheet_().getSheetByName(SHEET_TABS.GhiNhan);
  if (!sheet) throw new Error('Tab not found: ' + SHEET_TABS.GhiNhan);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return { so_dong_quet: 0, so_dong_cap_nhat: 0, canh_bao: [] };
  }

  var headers = values[0];
  var ngayIndex = headers.indexOf('ngay');
  var tuanSoIndex = headers.indexOf('tuan_so');
  if (ngayIndex === -1) throw new Error('Key field not found: ngay');
  if (tuanSoIndex === -1) throw new Error('Key field not found: tuan_so');

  var updated = 0;
  var warnings = [];
  for (var i = 1; i < values.length; i++) {
    var currentWeek = values[i][tuanSoIndex];
    var dateValue = values[i][ngayIndex];
    if (!isBlank_(currentWeek) || isBlank_(dateValue)) {
      continue;
    }

    var weekResult = resolveWeekNumberByDate_(dateValue);
    if (!isBlank_(weekResult.tuan_so)) {
      sheet.getRange(i + 1, tuanSoIndex + 1).setValue(weekResult.tuan_so);
      updated++;
    } else {
      warnings.push('Dòng ' + (i + 1) + ': ' + weekResult.warning);
    }
  }

  var result = {
    so_dong_quet: values.length - 1,
    so_dong_cap_nhat: updated,
    canh_bao: warnings,
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function findWeekNumberByDate_(dateText) {
  return resolveWeekNumberByDate_(dateText).tuan_so;
}

function resolveWeekNumberByDate_(dateValue) {
  var target = parseDateValue_(dateValue);
  if (!target) {
    return {
      tuan_so: null,
      warning: 'Ngày không hợp lệ, chưa thể tự điền tuan_so: ' + dateValue,
    };
  }

  var weeks = getSheetObjects_(SHEET_TABS.CauHinhTuan);
  for (var i = 0; i < weeks.length; i++) {
    var start = parseDateValue_(weeks[i].tu_ngay);
    var end = parseDateValue_(weeks[i].den_ngay);
    if (start && end && target >= start && target <= end) {
      return { tuan_so: weeks[i].tuan_so, warning: '' };
    }
  }

  return {
    tuan_so: null,
    warning: 'Không tìm thấy tuần trong CauHinhTuan cho ngày: ' + formatDateForLog_(target),
  };
}

function parseDateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  var text = String(value || '').trim();
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  var parsed = new Date(text);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDateForLog_(dateValue) {
  return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function addImportWarning_(row, warning) {
  if (!warning) return;
  if (!row._import_warnings) row._import_warnings = [];
  row._import_warnings.push(warning);
}

function isBlank_(value) {
  return value === null || value === undefined || value === '';
}

function findByKey_(tabName, keyField, keyValue) {
  return getSheetObjects_(tabName).filter(function (row) {
    return String(row[keyField] || '') === String(keyValue || '');
  })[0] || null;
}

function findCatalogItemByCode_(maDanhMuc) {
  var code = String(maDanhMuc || '').trim().toUpperCase();
  if (!code) return null;

  return getSheetObjects_(SHEET_TABS.DanhMucDiem).filter(function (row) {
    return String(row.ma_danh_muc || '').trim().toUpperCase() === code;
  })[0] || null;
}

function normalizeText_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
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
  return prefix + String(getNextIdNumber_(prefix, tabName, keyField)).padStart(6, '0');
}

function getNextIdNumber_(prefix, tabName, keyField) {
  var rows = getSheetObjects_(tabName);
  var max = 0;
  rows.forEach(function (row) {
    var id = String(row[keyField] || '');
    var num = parseInt(id.replace(prefix, ''), 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return max + 1;
}

function jsonResponse_(payload, status) {
  var output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
