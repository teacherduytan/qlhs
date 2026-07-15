import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  DanhMucDiem,
  DienHocSinh,
  HocSinh,
  ImportResult,
  LoaiDuLieuImport,
  NhatKyImport,
  NhomDiem,
  PhamViDanhMuc,
  TrangThaiImport,
} from '../../data/types'

type ParseState =
  | { status: 'empty' }
  | { status: 'valid'; rows: Record<string, unknown>[]; catalogSuggestions: CatalogSuggestion[] }
  | { status: 'invalid'; message: string }

type CatalogSuggestion = {
  nhom_goi_y: string
  ten_muc_goi_y: string
  diem_goi_y: string | number | null
  pham_vi_goi_y: string
  mo_ta_tho: string
  ly_do_can_tao: string
  ma_goi_y: string | null
}

type CatalogSuggestionForm = {
  sourceIndex: number
  ma_danh_muc: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  mo_ta_tho: string
  ly_do_can_tao: string
}

type SimilarCatalogMatch = {
  item: DanhMucDiem
  score: number
}

type MissingCatalogItem = {
  code: string
  rowIndexes: number[]
  sampleContent: string
  loai: string
}

type MissingCatalogForm = {
  code: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  rowIndexes: number[]
  sampleContent: string
}

type StudentCreateForm = {
  sourceRowIndex: number
  ma_hs: string
  ho: string
  ten: string
  dien: DienHocSinh
  nu: boolean
  dan_toc: string
  to: string
}

type StudentResolutionItem = {
  rowIndex: number
  hoTen: string
  noiDung: string
  exactMatch: HocSinh | null
  candidates: HocSinh[]
}

type StudentCheck = {
  errors: string[]
  blockingRowIndexes: number[]
  linkedCount: number
  allowedBlankCount: number
  autoMatchItems: StudentResolutionItem[]
  unresolvedItems: StudentResolutionItem[]
}

const IMPORT_OPTIONS: Array<{ value: LoaiDuLieuImport; label: string }> = [
  { value: 'ghi_nhan', label: 'Ghi nhận' },
  { value: 'hoc_sinh', label: 'Học sinh' },
  { value: 'phu_huynh', label: 'Phụ huynh' },
  { value: 'ban_can_su', label: 'Ban cán sự' },
]

const PREVIEW_LIMIT = 8
const ISSUE_PREVIEW_LIMIT = 10
const GROUP_OPTIONS: Array<{ value: NhomDiem; label: string }> = [
  { value: 'CC', label: 'Chuyên cần' },
  { value: 'VS', label: 'Vệ sinh' },
  { value: 'NN', label: 'Nề nếp' },
  { value: 'KL', label: 'Trật tự kỷ luật' },
  { value: 'KT', label: 'Tích cực' },
]
const SCOPE_OPTIONS: Array<{ value: PhamViDanhMuc; label: string }> = [
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'tap_the', label: 'Tập thể' },
  { value: 'to_truc', label: 'Tổ trực' },
]

const STUDENT_TYPE_OPTIONS: Array<{ value: DienHocSinh; label: string }> = [
  { value: '2B', label: '2B' },
  { value: 'BT', label: 'Ban tru' },
  { value: 'NT', label: 'Noi tru' },
]

const STATUS_LABELS: Record<TrangThaiImport, string> = {
  thanh_cong: 'Thành công',
  loi_mot_phan: 'Lỗi một phần',
  that_bai: 'Thất bại',
  da_xoa: 'Đã xoá',
}

export function ImportPage() {
  const [loai, setLoai] = useState<LoaiDuLieuImport>('ghi_nhan')
  const [nguoiThucHien, setNguoiThucHien] = useState('GVCN')
  const [jsonText, setJsonText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importLogs, setImportLogs] = useState<NhatKyImport[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [deletingLog, setDeletingLog] = useState<string | null>(null)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [pointCatalog, setPointCatalog] = useState<DanhMucDiem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [students, setStudents] = useState<HocSinh[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentsError, setStudentsError] = useState<string | null>(null)
  const [suggestionForms, setSuggestionForms] = useState<CatalogSuggestionForm[]>([])
  const [creatingSuggestionIndex, setCreatingSuggestionIndex] = useState<number | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null)
  const [suggestionStep, setSuggestionStep] = useState<1 | 2>(1)
  const [missingCatalogForms, setMissingCatalogForms] = useState<MissingCatalogForm[]>([])
  const [activeMissingCatalogCode, setActiveMissingCatalogCode] = useState<string | null>(null)
  const [creatingMissingCatalogCode, setCreatingMissingCatalogCode] = useState<string | null>(null)
  const [catalogFixMessage, setCatalogFixMessage] = useState<string | null>(null)
  const [studentMessage, setStudentMessage] = useState<string | null>(null)
  const [creatingStudent, setCreatingStudent] = useState(false)
  const [studentCreateForm, setStudentCreateForm] = useState<StudentCreateForm | null>(null)

  const parseState = useMemo(() => parseJsonRows(jsonText), [jsonText])
  const previewColumns = useMemo(() => {
    if (parseState.status !== 'valid') {
      return []
    }

    return collectPreviewColumns(parseState.rows)
  }, [parseState])
  const sortedImportLogs = useMemo(
    () => [...importLogs].sort((a, b) => sortDateDesc(a.thoi_gian, b.thoi_gian)),
    [importLogs],
  )
  const catalogCheck = useMemo(() => {
    if (loai !== 'ghi_nhan' || parseState.status !== 'valid') {
      return EMPTY_CATALOG_CHECK
    }

    return checkRecordCatalogLinks(parseState.rows, pointCatalog)
  }, [loai, parseState, pointCatalog])
  const studentCheck = useMemo(() => {
    if (loai !== 'ghi_nhan' || parseState.status !== 'valid') {
      return EMPTY_STUDENT_CHECK
    }

    return checkRecordStudentLinks(parseState.rows, pointCatalog, students)
  }, [loai, parseState, pointCatalog, students])
  const hasCatalogBlockingError =
    loai === 'ghi_nhan' && (catalogLoading || Boolean(catalogError) || catalogCheck.errors.length > 0)
  const hasStudentBlockingError =
    loai === 'ghi_nhan' &&
    (studentsLoading ||
      Boolean(studentsError) ||
      studentCheck.errors.length > 0 ||
      studentCheck.autoMatchItems.length > 0 ||
      studentCheck.unresolvedItems.length > 0)
  const activeSuggestionForm = useMemo(
    () => suggestionForms.find((form) => form.sourceIndex === activeSuggestionIndex) || null,
    [activeSuggestionIndex, suggestionForms],
  )
  const activeSuggestionSimilarMatches = useMemo(
    () => (activeSuggestionForm ? getSimilarCatalogMatches(activeSuggestionForm, pointCatalog) : []),
    [activeSuggestionForm, pointCatalog],
  )
  const activeMissingCatalogForm = useMemo(
    () => missingCatalogForms.find((form) => form.code === activeMissingCatalogCode) || null,
    [activeMissingCatalogCode, missingCatalogForms],
  )
  const activeSuggestionMatchCount = useMemo(
    () => (activeSuggestionForm ? countSuggestionMatchedRows(jsonText, activeSuggestionForm) : 0),
    [activeSuggestionForm, jsonText],
  )
  const importReadiness = useMemo(() => {
    if (parseState.status !== 'valid') {
      return { blockedCount: 0, blockedRowIndexes: [], validCount: 0, validRows: [] as Record<string, unknown>[] }
    }

    const blockedRowIndexes = Array.from(
      new Set([...catalogCheck.blockingRowIndexes, ...studentCheck.blockingRowIndexes]),
    ).sort((left, right) => left - right)
    const blockedSet = new Set(blockedRowIndexes)
    const validRows = parseState.rows.filter((_row, index) => !blockedSet.has(index))

    return {
      blockedCount: blockedRowIndexes.length,
      blockedRowIndexes,
      validCount: validRows.length,
      validRows,
    }
  }, [parseState, catalogCheck.blockingRowIndexes, studentCheck.blockingRowIndexes])

  useEffect(() => {
    void loadImportLogs()
    void loadPointCatalog()
    void loadStudents()
  }, [])

  useEffect(() => {
    if (parseState.status !== 'valid') {
      setSuggestionForms([])
      setSuggestionError(null)
      setSuggestionMessage(null)
      setActiveSuggestionIndex(null)
      return
    }

    setSuggestionForms(
      parseState.catalogSuggestions.map((suggestion, index) =>
        suggestionToForm(suggestion, index, pointCatalog),
      ),
    )
    setSuggestionError(null)
  }, [jsonText, parseState.status])

  useEffect(() => {
    if (!activeSuggestionForm && !activeMissingCatalogForm && !studentCreateForm) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeSuggestionModal()
        closeMissingCatalogModal()
        closeStudentCreateModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeSuggestionForm, activeMissingCatalogForm, studentCreateForm])

  useEffect(() => {
    setMissingCatalogForms((current) =>
      catalogCheck.missingCatalogItems.map((item) => {
        const existing = current.find((form) => form.code === item.code)
        return existing
          ? { ...existing, rowIndexes: item.rowIndexes, sampleContent: item.sampleContent }
          : missingCatalogToForm(item)
      }),
    )
    if (
      activeMissingCatalogCode &&
      !catalogCheck.missingCatalogItems.some((item) => item.code === activeMissingCatalogCode)
    ) {
      setActiveMissingCatalogCode(null)
    }
  }, [activeMissingCatalogCode, catalogCheck.missingCatalogItems])

  async function loadPointCatalog() {
    setCatalogLoading(true)
    setCatalogError(null)

    try {
      setPointCatalog(await dataSource.getPointCatalog())
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Không tải được DanhMucDiem để kiểm tra mã import.')
    } finally {
      setCatalogLoading(false)
    }
  }

  async function loadStudents() {
    setStudentsLoading(true)
    setStudentsError(null)

    try {
      setStudents(await dataSource.getStudents())
    } catch (error) {
      setStudentsError(error instanceof Error ? error.message : 'Khong tai duoc danh sach hoc sinh de gan ma_hs.')
    } finally {
      setStudentsLoading(false)
    }
  }

  async function loadImportLogs() {
    setLogsLoading(true)
    setLogsError(null)

    try {
      setImportLogs(await dataSource.getImportLogs())
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Không tải được lịch sử import.')
    } finally {
      setLogsLoading(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setFileName(file.name)
    setJsonText(await file.text())
    setResult(null)
    setSubmitError(null)
    setSuggestionError(null)
    setSuggestionMessage(null)
    setCatalogFixMessage(null)
    setStudentMessage(null)
    event.target.value = ''
  }

  async function submitImport() {
    if (parseState.status !== 'valid' || parseState.rows.length === 0) {
      setSubmitError('JSON cần là một array có ít nhất 1 dòng object.')
      return
    }

    if (hasCatalogBlockingError) {
      setSubmitError('Cần sửa các lỗi liên kết DanhMucDiem trước khi import GhiNhan.')
      return
    }

    if (hasStudentBlockingError) {
      setSubmitError('Can gan hoc sinh cho cac dong ca nhan dang co ma_hs null truoc khi import GhiNhan.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const importResult = await dataSource.importJson(loai, parseState.rows, nguoiThucHien.trim())
      setResult(importResult)
      setDeleteMessage(null)
      await loadImportLogs()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Import không thành công.')
    } finally {
      setSubmitting(false)
    }
  }

  async function importValidRowsOnly() {
    if (parseState.status !== 'valid' || importReadiness.validRows.length === 0) {
      return
    }

    if (catalogLoading || studentsLoading || catalogError || studentsError) {
      setSubmitError('Can tai xong danh muc va hoc sinh truoc khi import tung phan.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const importResult = await dataSource.importJson(loai, importReadiness.validRows, nguoiThucHien.trim())
      setResult(importResult)
      setDeleteMessage(null)
      setJsonText(keepOnlyRowsInJsonText(jsonText, importReadiness.blockedRowIndexes))
      setCatalogFixMessage(
        `Da import ${importReadiness.validRows.length} dong du dieu kien. O JSON chi con ${importReadiness.blockedCount} dong can xu ly.`,
      )
      await loadImportLogs()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Import cac dong du dieu kien khong thanh cong.')
    } finally {
      setSubmitting(false)
    }
  }

  function openMissingCatalogModal(code: string) {
    setActiveMissingCatalogCode(code)
    setCatalogError(null)
  }

  function closeMissingCatalogModal() {
    setActiveMissingCatalogCode(null)
    setCreatingMissingCatalogCode(null)
  }

  function updateMissingCatalogForm(code: string, patch: Partial<MissingCatalogForm>) {
    setMissingCatalogForms((current) => current.map((form) => (form.code === code ? { ...form, ...patch } : form)))
  }

  async function createMissingCatalogFromJson(form: MissingCatalogForm) {
    const code = form.code.trim().toUpperCase()
    const point = Number(form.diem)

    if (!code || !form.ten_muc.trim()) {
      setCatalogError('Can co ma danh muc va ten muc truoc khi tao.')
      return
    }

    if (!Number.isFinite(point)) {
      setCatalogError('Diem danh muc phai la so hop le.')
      return
    }

    if (pointCatalog.some((item) => item.ma_danh_muc.trim().toUpperCase() === code)) {
      setCatalogError(`Ma ${code} da co trong DanhMucDiem. Hay tai lai danh muc.`)
      return
    }

    setCreatingMissingCatalogCode(code)
    setCatalogError(null)

    try {
      const created = await dataSource.addPointCatalogItem({
        ma_danh_muc: code,
        nhom: form.nhom,
        ten_muc: form.ten_muc.trim(),
        diem: point,
        nghiem_trong: form.nghiem_trong,
        pham_vi: form.pham_vi,
      })
      setPointCatalog((current) => [...current, created].sort(compareCatalogItems))
      setCatalogFixMessage(`Da tao danh muc ${created.ma_danh_muc}. Cac dong dang dung ma nay se duoc kiem tra lai.`)
      closeMissingCatalogModal()
      await loadPointCatalog()
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Khong tao duoc danh muc diem tu ma trong JSON.')
    } finally {
      setCreatingMissingCatalogCode(null)
    }
  }

  function applyStudentToRow(rowIndex: number, student: HocSinh) {
    setJsonText((current) => applyStudentToJsonText(current, rowIndex, student))
    setStudentMessage(`Da gan ${student.ma_hs} - ${studentFullName(student)} vao dong ${rowIndex + 1}.`)
    setSubmitError(null)
  }

  function applyExactStudentMatches() {
    if (studentCheck.autoMatchItems.length === 0) {
      return
    }

    setJsonText((current) =>
      updateImportRowsInJsonText(current, (row, index) => {
        const match = studentCheck.autoMatchItems.find((item) => item.rowIndex === index)?.exactMatch
        return match ? enrichRowWithStudent(row, match) : row
      }),
    )
    setStudentMessage(`Da tu gan ma_hs cho ${studentCheck.autoMatchItems.length} dong khop ten chinh xac.`)
    setSubmitError(null)
  }

  function openStudentCreateModal(item: StudentResolutionItem) {
    const name = splitStudentName(item.hoTen)
    setStudentCreateForm({
      sourceRowIndex: item.rowIndex,
      ma_hs: nextStudentId(students),
      ho: name.ho,
      ten: name.ten,
      dien: '2B',
      nu: false,
      dan_toc: 'Kinh',
      to: '',
    })
    setStudentsError(null)
  }

  function closeStudentCreateModal() {
    setStudentCreateForm(null)
    setCreatingStudent(false)
  }

  function updateStudentCreateForm(patch: Partial<StudentCreateForm>) {
    setStudentCreateForm((current) => (current ? { ...current, ...patch } : current))
  }

  async function createStudentFromImport() {
    if (!studentCreateForm) {
      return
    }

    if (!studentCreateForm.ho.trim() || !studentCreateForm.ten.trim()) {
      setStudentsError('Can co ho va ten hoc sinh truoc khi tao moi.')
      return
    }

    const student: HocSinh = {
      ma_hs: nextStudentId(students),
      tt: nextStudentOrder(students),
      ho: studentCreateForm.ho.trim(),
      ten: studentCreateForm.ten.trim(),
      dien: studentCreateForm.dien,
      nu: studentCreateForm.nu,
      dan_toc: studentCreateForm.dan_toc.trim() || 'Kinh',
      ngay_sinh: null,
      sdt_1: null,
      sdt_2: null,
      ngay_nhap_hoc: null,
      ngay_roi_lop: null,
      to: studentCreateForm.to ? Number(studentCreateForm.to) : null,
      token_ho_so: randomToken(),
      la_co_do: false,
      anh_dai_dien: null,
      ghi_chu: 'Tao tu man Import khi xu ly ma_hs null',
    }

    setCreatingStudent(true)
    setStudentsError(null)

    try {
      const created = await dataSource.addStudent(student)
      setStudents((current) => [...current, created].sort(compareStudentsByOrder))
      setJsonText((current) => applyStudentToJsonText(current, studentCreateForm.sourceRowIndex, created))
      setStudentMessage(
        `Da tao ${created.ma_hs} - ${studentFullName(created)} va gan vao dong ${studentCreateForm.sourceRowIndex + 1}.`,
      )
      closeStudentCreateModal()
    } catch (error) {
      setStudentsError(error instanceof Error ? error.message : 'Khong tao duoc hoc sinh moi tu Import.')
    } finally {
      setCreatingStudent(false)
    }
  }

  async function deleteImport(log: NhatKyImport) {
    if (log.trang_thai === 'da_xoa') {
      return
    }

    const confirmed = window.confirm(
      `Xoá toàn bộ dữ liệu GhiNhan của lần import ${log.ma_log}? Log import vẫn được giữ lại.`,
    )
    if (!confirmed) {
      return
    }

    setDeletingLog(log.ma_log)
    setLogsError(null)
    setDeleteMessage(null)

    try {
      const deleteResult = await dataSource.deleteImport(log.ma_log)
      setDeleteMessage(
        `Đã xoá ${deleteResult.so_dong_da_xoa} dòng GhiNhan của lần import ${deleteResult.ma_log}.`,
      )
      await loadImportLogs()
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Không xoá được dữ liệu import.')
    } finally {
      setDeletingLog(null)
    }
  }

  async function createCatalogFromSuggestion(form: CatalogSuggestionForm) {
    const code = form.ma_danh_muc.trim().toUpperCase()
    const point = Number(form.diem)

    if (!code || !form.ten_muc.trim()) {
      setSuggestionError('Cần có mã danh mục và tên mục trước khi tạo.')
      return
    }

    if (!Number.isFinite(point)) {
      setSuggestionError('Điểm gợi ý phải là số hợp lệ.')
      return
    }

    if (pointCatalog.some((item) => item.ma_danh_muc.trim().toUpperCase() === code)) {
      setSuggestionError(`Mã ${code} đã có trong DanhMucDiem. Hãy đổi mã hoặc chọn mã có sẵn trong JSON.`)
      return
    }

    const payload: DanhMucDiem = {
      ma_danh_muc: code,
      nhom: form.nhom,
      ten_muc: form.ten_muc.trim(),
      diem: point,
      nghiem_trong: form.nghiem_trong,
      pham_vi: form.pham_vi,
    }

    setCreatingSuggestionIndex(form.sourceIndex)
    setSuggestionError(null)
    setSuggestionMessage(null)

    try {
      const created = await dataSource.addPointCatalogItem(payload)
      const applyResult = applyCatalogCodeToJsonText(jsonText, form, created.ma_danh_muc)

      setPointCatalog((current) => [...current, created].sort(compareCatalogItems))
      setJsonText(applyResult.jsonText)
      setActiveSuggestionIndex(null)
      setSuggestionStep(1)
      setSuggestionMessage(
        applyResult.updatedRows > 0
          ? `Đã tạo ${created.ma_danh_muc} và gắn mã vào ${applyResult.updatedRows} dòng ghi nhận đang chờ.`
          : `Đã tạo ${created.ma_danh_muc}. Chưa tìm thấy dòng ghi nhận khớp tự động, cần gắn mã thủ công nếu còn lỗi thiếu mã.`,
      )
      await loadPointCatalog()
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Không tạo được danh mục từ đề xuất.')
    } finally {
      setCreatingSuggestionIndex(null)
    }
  }

  function applyExistingCatalogToSuggestion(form: CatalogSuggestionForm, catalogItem: DanhMucDiem) {
    const applyResult = applyCatalogCodeToJsonText(jsonText, form, catalogItem.ma_danh_muc)

    setJsonText(applyResult.jsonText)
    setActiveSuggestionIndex(null)
    setSuggestionStep(1)
    setSuggestionError(null)
    setSubmitError(null)
    setSuggestionMessage(
      applyResult.updatedRows > 0
        ? `Đã dùng danh mục có sẵn ${catalogItem.ma_danh_muc} - ${catalogItem.ten_muc} và gắn mã vào ${applyResult.updatedRows} dòng ghi nhận đang chờ.`
        : `Đã bỏ đề xuất mới và chọn dùng ${catalogItem.ma_danh_muc} - ${catalogItem.ten_muc}. Chưa tìm thấy dòng ghi nhận khớp tự động, cần kiểm tra lại JSON nếu còn lỗi thiếu mã.`,
    )
  }

  function updateSuggestionForm(sourceIndex: number, patch: Partial<CatalogSuggestionForm>) {
    setSuggestionForms((current) =>
      current.map((form) => (form.sourceIndex === sourceIndex ? { ...form, ...patch } : form)),
    )
  }

  function changeSuggestionGroup(sourceIndex: number, group: NhomDiem) {
    setSuggestionForms((current) =>
      current.map((form) =>
        form.sourceIndex === sourceIndex
          ? { ...form, nhom: group, ma_danh_muc: nextCodeForGroup(group, pointCatalog) }
          : form,
      ),
    )
  }

  function openSuggestionModal(sourceIndex: number) {
    setActiveSuggestionIndex(sourceIndex)
    setSuggestionStep(1)
    setSuggestionError(null)
  }

  function closeSuggestionModal() {
    setActiveSuggestionIndex(null)
    setSuggestionStep(1)
    setSuggestionError(null)
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Import JSON</h2>
        <p className="text-sm text-slate-600">
          Dán JSON hoặc tải file để ghi dữ liệu vào Sheet và lưu nhật ký import.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Loại dữ liệu
          <select
            value={loai}
            onChange={(event) => {
              setLoai(event.target.value as LoaiDuLieuImport)
              setResult(null)
              setSubmitError(null)
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {IMPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Người thực hiện
          <input
            value={nguoiThucHien}
            onChange={(event) => setNguoiThucHien(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          File JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFileChange(event)}
            className="block h-10 cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:h-full file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
      </div>

      {fileName ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Đã tải: {fileName}
        </div>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Nội dung JSON
        <textarea
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value)
            setFileName(null)
            setResult(null)
            setSubmitError(null)
            setSuggestionError(null)
            setSuggestionMessage(null)
            setCatalogFixMessage(null)
            setStudentMessage(null)
          }}
          spellCheck={false}
          placeholder='[{"ma_hs":"HS001","ngay":"2026-07-13","tuan_so":2}]'
          className="min-h-64 resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {parseState.status === 'invalid' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {parseState.message}
        </div>
      ) : null}

      {parseState.status === 'valid' ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-slate-900">Xem trước</h3>
            <p className="text-sm font-medium text-blue-700">{parseState.rows.length} dòng</p>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    {previewColumns.map((column) => (
                      <th key={column} className="px-3 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parseState.rows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                    <tr key={index}>
                      {previewColumns.map((column) => (
                        <td
                          key={column}
                          className="max-w-64 truncate whitespace-nowrap px-3 py-3 text-slate-700"
                          title={formatCell(row[column])}
                        >
                          {formatCell(row[column]) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {parseState.rows.length > PREVIEW_LIMIT ? (
            <p className="text-xs text-slate-500">
              Đang hiển thị {PREVIEW_LIMIT} dòng đầu tiên.
            </p>
          ) : null}
        </div>
      ) : null}

      {loai === 'ghi_nhan' && parseState.status === 'valid' ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            catalogCheck.errors.length
              ? 'border-red-200 bg-red-50 text-red-900'
              : catalogCheck.warnings.length || catalogError
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold">Kiểm tra liên kết DanhMucDiem</h3>
            <button
              type="button"
              onClick={() => void loadPointCatalog()}
              disabled={catalogLoading}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {catalogLoading ? 'Đang tải...' : 'Tải lại danh mục'}
            </button>
          </div>

          <p className="mt-2">
            {catalogCheck.linkedCount} dòng có mã khớp danh mục hiện hành
            {catalogCheck.studyCount ? `, ${catalogCheck.studyCount} dòng điểm học tập không dùng mã` : ''}.
          </p>

          {catalogError ? <p className="mt-2 font-semibold">{catalogError}</p> : null}

          {catalogFixMessage ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              {catalogFixMessage}
            </div>
          ) : null}

          {catalogCheck.errors.length ? (
            <IssueList title="Cần sửa trước khi import" items={catalogCheck.errors} />
          ) : null}

          {catalogCheck.missingCatalogItems.length ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {catalogCheck.missingCatalogItems.map((item) => {
                const form = missingCatalogForms.find((candidate) => candidate.code === item.code)
                const isCreating = creatingMissingCatalogCode === item.code

                return (
                  <div key={item.code} className="rounded-lg border border-red-200 bg-white p-3 text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-red-700">{item.code}</p>
                        <p className="mt-1 font-semibold text-slate-900">{form?.ten_muc || item.sampleContent || item.code}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Dong {item.rowIndexes.map((index) => index + 1).join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openMissingCatalogModal(item.code)}
                        disabled={isCreating || catalogLoading}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isCreating ? 'Dang tao...' : 'Tao danh muc'}
                      </button>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.sampleContent || '-'}</p>
                  </div>
                )
              })}
            </div>
          ) : null}

          {catalogCheck.warnings.length ? (
            <IssueList title="Cảnh báo" items={catalogCheck.warnings} />
          ) : null}
        </div>
      ) : null}

      {loai === 'ghi_nhan' && parseState.status === 'valid' ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            studentCheck.errors.length || studentCheck.autoMatchItems.length || studentCheck.unresolvedItems.length
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : studentsError
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold">Kiem tra lien ket hoc sinh</h3>
              <p className="mt-1">
                {studentCheck.linkedCount} dong da co ma_hs
                {studentCheck.allowedBlankCount ? `, ${studentCheck.allowedBlankCount} dong tap the/to truc duoc de trong` : ''}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {studentCheck.autoMatchItems.length ? (
                <button
                  type="button"
                  onClick={applyExactStudentMatches}
                  disabled={studentsLoading}
                  className="h-9 rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Tu gan {studentCheck.autoMatchItems.length} dong khop ten
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void loadStudents()}
                disabled={studentsLoading}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {studentsLoading ? 'Dang tai...' : 'Tai lai hoc sinh'}
              </button>
            </div>
          </div>

          {studentMessage ? (
            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              {studentMessage}
            </div>
          ) : null}

          {studentsError ? <p className="mt-2 font-semibold">{studentsError}</p> : null}

          {studentCheck.errors.length ? (
            <IssueList title="Can sua lien ket hoc sinh" items={studentCheck.errors} />
          ) : null}

          {[...studentCheck.autoMatchItems, ...studentCheck.unresolvedItems].length ? (
            <div className="mt-3 overflow-hidden rounded-md border border-amber-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-amber-100 text-sm">
                  <thead className="bg-amber-50 text-left text-xs font-semibold uppercase text-amber-800">
                    <tr>
                      <th className="px-3 py-3">Dong</th>
                      <th className="px-3 py-3">Ten tren JSON</th>
                      <th className="px-3 py-3">Goi y</th>
                      <th className="px-3 py-3">Gan hoc sinh</th>
                      <th className="px-3 py-3 text-right">Tao moi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {[...studentCheck.autoMatchItems, ...studentCheck.unresolvedItems].map((item) => (
                      <tr key={item.rowIndex}>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{item.rowIndex + 1}</td>
                        <td className="max-w-56 px-3 py-3">
                          <p className="font-semibold text-slate-900">{item.hoTen || '-'}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.noiDung || '-'}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {item.exactMatch ? (
                            <button
                              type="button"
                              onClick={() => applyStudentToRow(item.rowIndex, item.exactMatch as HocSinh)}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                            >
                              {item.exactMatch.ma_hs} - {studentFullName(item.exactMatch)}
                            </button>
                          ) : item.candidates.length ? (
                            <span className="text-xs text-slate-600">{item.candidates.length} goi y gan dung</span>
                          ) : (
                            <span className="text-xs text-slate-500">Chua co goi y chac</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            defaultValue=""
                            onChange={(event) => {
                              const student = students.find((candidate) => candidate.ma_hs === event.target.value)
                              if (student) {
                                applyStudentToRow(item.rowIndex, student)
                                event.target.value = ''
                              }
                            }}
                            className="h-9 min-w-56 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          >
                            <option value="">Chon hoc sinh...</option>
                            {students.map((student) => (
                              <option key={student.ma_hs} value={student.ma_hs}>
                                {student.ma_hs} - {studentFullName(student)} - To {student.to || '-'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openStudentCreateModal(item)}
                            className="h-9 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            Tao hoc sinh
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {loai === 'ghi_nhan' && parseState.status === 'valid' && suggestionForms.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
          <div>
            <h3 className="text-base font-bold">Đề xuất danh mục mới từ AI</h3>
            <p className="mt-1">
              Danh sách này chỉ tóm tắt đề xuất. Bấm tạo để mở modal kiểm tra thông tin, sau đó xác nhận gắn mã.
            </p>
          </div>

          {suggestionMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              {suggestionMessage}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {suggestionForms.map((form) => {
              const isCreating = creatingSuggestionIndex === form.sourceIndex

              return (
                <div key={form.sourceIndex} className="rounded-lg border border-cyan-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold text-cyan-700">{form.ma_danh_muc}</p>
                      <p className="mt-1 font-semibold text-slate-900">{form.ten_muc || form.mo_ta_tho}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {form.nhom} · {form.diem} điểm · {labelSuggestionScope(form.pham_vi)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openSuggestionModal(form.sourceIndex)}
                      disabled={isCreating || catalogLoading}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isCreating ? 'Đang tạo...' : 'Tạo danh mục'}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-700">Mô tả thô:</span>{' '}
                      {form.mo_ta_tho || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Lý do:</span>{' '}
                      {form.ly_do_can_tao || '-'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {activeSuggestionForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="suggestion-modal-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-cyan-700">Bước {suggestionStep}/2</p>
                <h3 id="suggestion-modal-title" className="text-lg font-bold text-slate-900">
                  Tạo danh mục từ đề xuất AI
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSuggestionModal}
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-5 py-4">
              {suggestionError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {suggestionError}
                </div>
              ) : null}

              {suggestionStep === 1 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Mã danh mục
                    <input
                      value={activeSuggestionForm.ma_danh_muc}
                      onChange={(event) =>
                        updateSuggestionForm(activeSuggestionForm.sourceIndex, {
                          ma_danh_muc: event.target.value.toUpperCase(),
                        })
                      }
                      className="h-10 rounded-md border border-slate-300 px-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Nhóm
                    <select
                      value={activeSuggestionForm.nhom}
                      onChange={(event) =>
                        changeSuggestionGroup(activeSuggestionForm.sourceIndex, event.target.value as NhomDiem)
                      }
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {GROUP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value} - {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                    Tên danh mục
                    <input
                      value={activeSuggestionForm.ten_muc}
                      onChange={(event) =>
                        updateSuggestionForm(activeSuggestionForm.sourceIndex, { ten_muc: event.target.value })
                      }
                      className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Điểm
                    <input
                      type="number"
                      value={activeSuggestionForm.diem}
                      onChange={(event) =>
                        updateSuggestionForm(activeSuggestionForm.sourceIndex, { diem: event.target.value })
                      }
                      className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Phạm vi
                    <select
                      value={activeSuggestionForm.pham_vi}
                      onChange={(event) =>
                        updateSuggestionForm(activeSuggestionForm.sourceIndex, {
                          pham_vi: event.target.value as PhamViDanhMuc,
                        })
                      }
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {SCOPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {activeSuggestionSimilarMatches.length > 0 ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 md:col-span-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-emerald-950">Danh mục có sẵn gần giống</p>
                          <p className="mt-1 text-xs text-emerald-800">
                            Nếu cùng ý nghĩa với đề xuất AI, dùng mã cũ để tránh tạo danh mục trùng.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-800">
                          {activeSuggestionSimilarMatches.length} gợi ý
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {activeSuggestionSimilarMatches.map(({ item, score }) => (
                          <div
                            key={item.ma_danh_muc}
                            className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                <span className="font-mono">{item.ma_danh_muc}</span> - {item.ten_muc}
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                {item.nhom} · {item.diem} điểm · {labelSuggestionScope(item.pham_vi)} · Khớp{' '}
                                {Math.round(score * 100)}%
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => applyExistingCatalogToSuggestion(activeSuggestionForm, item)}
                              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800"
                            >
                              Dùng mã này
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={activeSuggestionForm.nghiem_trong}
                      onChange={(event) =>
                        updateSuggestionForm(activeSuggestionForm.sourceIndex, {
                          nghiem_trong: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-200"
                    />
                    Đánh dấu nghiêm trọng
                  </label>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                    <p className="font-semibold text-slate-900">
                      {activeSuggestionForm.ma_danh_muc} - {activeSuggestionForm.ten_muc}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {activeSuggestionForm.nhom} · {activeSuggestionForm.diem} điểm ·{' '}
                      {labelSuggestionScope(activeSuggestionForm.pham_vi)}
                    </p>
                  </div>
                  <p>
                    App sẽ tạo danh mục này trong DanhMucDiem và tự gắn mã vào{' '}
                    <span className="font-bold text-cyan-700">{activeSuggestionMatchCount}</span> dòng ghi nhận đang
                    chờ trong JSON.
                  </p>
                  <p className="text-xs text-slate-500">
                    Nếu số dòng khớp bằng 0, app vẫn tạo danh mục nhưng thầy cần gắn mã thủ công vào dòng JSON còn thiếu.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => (suggestionStep === 1 ? closeSuggestionModal() : setSuggestionStep(1))}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {suggestionStep === 1 ? 'Huỷ' : 'Quay lại'}
              </button>
              {suggestionStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setSuggestionStep(2)}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void createCatalogFromSuggestion(activeSuggestionForm)}
                  disabled={creatingSuggestionIndex === activeSuggestionForm.sourceIndex || catalogLoading}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {creatingSuggestionIndex === activeSuggestionForm.sourceIndex ? 'Đang tạo...' : 'Tạo & gắn mã'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeMissingCatalogForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="missing-catalog-modal-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-red-700">Ma tu JSON</p>
                <h3 id="missing-catalog-modal-title" className="text-lg font-bold text-slate-900">
                  Tao danh muc diem {activeMissingCatalogForm.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeMissingCatalogModal}
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Dong
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-5 py-4">
              {catalogError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {catalogError}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Ma danh muc
                  <input
                    value={activeMissingCatalogForm.code}
                    readOnly
                    className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-normal text-slate-700"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Nhom
                  <select
                    value={activeMissingCatalogForm.nhom}
                    onChange={(event) =>
                      updateMissingCatalogForm(activeMissingCatalogForm.code, {
                        nhom: event.target.value as NhomDiem,
                      })
                    }
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {GROUP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} - {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
                  Ten danh muc
                  <input
                    value={activeMissingCatalogForm.ten_muc}
                    onChange={(event) =>
                      updateMissingCatalogForm(activeMissingCatalogForm.code, { ten_muc: event.target.value })
                    }
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Diem
                  <input
                    type="number"
                    value={activeMissingCatalogForm.diem}
                    onChange={(event) =>
                      updateMissingCatalogForm(activeMissingCatalogForm.code, { diem: event.target.value })
                    }
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Pham vi
                  <select
                    value={activeMissingCatalogForm.pham_vi}
                    onChange={(event) =>
                      updateMissingCatalogForm(activeMissingCatalogForm.code, {
                        pham_vi: event.target.value as PhamViDanhMuc,
                      })
                    }
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={activeMissingCatalogForm.nghiem_trong}
                    onChange={(event) =>
                      updateMissingCatalogForm(activeMissingCatalogForm.code, {
                        nghiem_trong: event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-200"
                  />
                  Danh dau nghiem trong
                </label>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 md:col-span-2">
                  <p className="font-semibold text-slate-800">
                    Dang dung o dong {activeMissingCatalogForm.rowIndexes.map((index) => index + 1).join(', ')}
                  </p>
                  <p className="mt-1">{activeMissingCatalogForm.sampleContent || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeMissingCatalogModal}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void createMissingCatalogFromJson(activeMissingCatalogForm)}
                disabled={creatingMissingCatalogCode === activeMissingCatalogForm.code || catalogLoading}
                className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {creatingMissingCatalogCode === activeMissingCatalogForm.code ? 'Dang tao...' : 'Tao danh muc'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {studentCreateForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-create-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-amber-700">Dong {studentCreateForm.sourceRowIndex + 1}</p>
                <h3 id="student-create-modal-title" className="text-lg font-bold text-slate-900">
                  Tao hoc sinh moi tu Import
                </h3>
              </div>
              <button
                type="button"
                onClick={closeStudentCreateModal}
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Dong
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-5 py-4">
              {studentsError ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {studentsError}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Ma hoc sinh tu sinh
                  <input
                    value={studentCreateForm.ma_hs}
                    readOnly
                    className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-normal text-slate-700"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  To
                  <input
                    type="number"
                    min={1}
                    value={studentCreateForm.to}
                    onChange={(event) => updateStudentCreateForm({ to: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Ho va ten dem
                  <input
                    value={studentCreateForm.ho}
                    onChange={(event) => updateStudentCreateForm({ ho: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Ten
                  <input
                    value={studentCreateForm.ten}
                    onChange={(event) => updateStudentCreateForm({ ten: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Dien
                  <select
                    value={studentCreateForm.dien}
                    onChange={(event) => updateStudentCreateForm({ dien: event.target.value as DienHocSinh })}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  >
                    {STUDENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Dan toc
                  <input
                    value={studentCreateForm.dan_toc}
                    onChange={(event) => updateStudentCreateForm({ dan_toc: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={studentCreateForm.nu}
                    onChange={(event) => updateStudentCreateForm({ nu: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-200"
                  />
                  Hoc sinh nu
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeStudentCreateModal}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void createStudentFromImport()}
                disabled={creatingStudent}
                className="inline-flex h-10 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {creatingStudent ? 'Dang tao...' : 'Tao va gan vao JSON'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {submitError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Import {result.trang_thai}</p>
          <p>
            Log {result.ma_log}: {result.so_dong_thanh_cong} dòng thành công,{' '}
            {result.so_dong_loi} dòng lỗi.
          </p>
          {result.ghi_chu ? <p>{result.ghi_chu}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {loai === 'ghi_nhan' &&
        parseState.status === 'valid' &&
        importReadiness.blockedCount > 0 &&
        importReadiness.validCount > 0 ? (
          <button
            type="button"
            onClick={() => void importValidRowsOnly()}
            disabled={submitting || catalogLoading || studentsLoading || Boolean(catalogError) || Boolean(studentsError)}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Import {importReadiness.validCount} dong du dieu kien
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void submitImport()}
          disabled={
            submitting ||
            parseState.status !== 'valid' ||
            parseState.rows.length === 0 ||
            hasCatalogBlockingError ||
            hasStudentBlockingError
          }
          className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Đang import...' : 'Xác nhận import'}
        </button>
        <button
          type="button"
          onClick={() => {
            setJsonText('')
            setFileName(null)
            setSubmitError(null)
            setResult(null)
            setSuggestionError(null)
            setSuggestionMessage(null)
            setCatalogFixMessage(null)
            setStudentMessage(null)
          }}
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Xoá nội dung
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Lịch sử import</h3>
            <p className="text-sm text-slate-600">
              Xoá nhanh dữ liệu GhiNhan theo đúng lần import, log vẫn được giữ để đối chiếu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadImportLogs()}
            disabled={logsLoading}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {logsLoading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {logsError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {logsError}
          </div>
        ) : null}

        {deleteMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {deleteMessage}
          </div>
        ) : null}

        {sortedImportLogs.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            {logsLoading ? 'Đang tải lịch sử import...' : 'Chưa có lịch sử import.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Log</th>
                    <th className="px-3 py-3">Thời gian</th>
                    <th className="px-3 py-3">Loại</th>
                    <th className="px-3 py-3">Số dòng</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedImportLogs.map((log) => {
                    const isDeleting = deletingLog === log.ma_log
                    const canDelete = canDeleteImportLog(log)

                    return (
                      <tr key={log.ma_log}>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-700">
                          {log.ma_log}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                          {formatDateTime(log.thoi_gian)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                          {log.loai_du_lieu}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{log.so_dong}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(log.trang_thai)}`}
                          >
                            {STATUS_LABELS[log.trang_thai] ?? log.trang_thai}
                          </span>
                        </td>
                        <td className="max-w-72 truncate px-3 py-3 text-slate-600" title={log.ghi_chu ?? ''}>
                          {log.ghi_chu || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteImport(log)}
                            disabled={!canDelete || isDeleting}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                            title={
                              canDelete
                                ? 'Xoá dữ liệu GhiNhan của lần import này'
                                : 'Chỉ xoá được import GhiNhan chưa bị xoá'
                            }
                          >
                            {isDeleting ? 'Đang xoá...' : 'Xoá dữ liệu của lần này'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

type CatalogCheck = {
  blockingRowIndexes: number[]
  errors: string[]
  linkedCount: number
  missingCatalogItems: MissingCatalogItem[]
  studyCount: number
  warnings: string[]
}

const EMPTY_CATALOG_CHECK: CatalogCheck = {
  blockingRowIndexes: [],
  errors: [],
  linkedCount: 0,
  missingCatalogItems: [],
  studyCount: 0,
  warnings: [],
}

const EMPTY_STUDENT_CHECK: StudentCheck = {
  blockingRowIndexes: [],
  errors: [],
  linkedCount: 0,
  allowedBlankCount: 0,
  autoMatchItems: [],
  unresolvedItems: [],
}

function IssueList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-3">
      <p className="font-bold">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.slice(0, ISSUE_PREVIEW_LIMIT).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {items.length > ISSUE_PREVIEW_LIMIT ? (
        <p className="mt-1 text-xs font-semibold">Còn {items.length - ISSUE_PREVIEW_LIMIT} dòng khác.</p>
      ) : null}
    </div>
  )
}

function checkRecordCatalogLinks(rows: Record<string, unknown>[], catalog: DanhMucDiem[]): CatalogCheck {
  const catalogByCode = new Map(
    catalog.map((item) => [String(item.ma_danh_muc || '').trim().toUpperCase(), item]),
  )
  const missingByCode = new Map<string, MissingCatalogItem>()
  const result: CatalogCheck = {
    blockingRowIndexes: [],
    errors: [],
    linkedCount: 0,
    missingCatalogItems: [],
    studyCount: 0,
    warnings: [],
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const code = toText(row.ma_danh_muc).trim().toUpperCase()
    const type = toText(row.loai).trim()

    if (code) {
      const catalogItem = catalogByCode.get(code)
      if (!catalogItem) {
        result.errors.push(`Dòng ${rowNumber}: ma_danh_muc "${code}" chưa có trong DanhMucDiem.`)
        result.blockingRowIndexes.push(index)
        const existing = missingByCode.get(code)
        if (existing) {
          existing.rowIndexes.push(index)
          if (!existing.sampleContent) {
            existing.sampleContent = getRecordContent(row) || code
          }
        } else {
          missingByCode.set(code, {
            code,
            rowIndexes: [index],
            sampleContent: getRecordContent(row) || code,
            loai: type,
          })
        }
        return
      }

      result.linkedCount += 1
      if (type === 'hoc_tap') {
        result.warnings.push(
          `Dòng ${rowNumber}: có ma_danh_muc "${code}" nên loại/điểm sẽ lấy theo DanhMucDiem, không giữ loai=hoc_tap.`,
        )
      }
      return
    }

    if (type === 'hoc_tap') {
      result.studyCount += 1
      return
    }

    result.errors.push(
      `Dòng ${rowNumber}: thiếu ma_danh_muc. Chỉ dòng loai=hoc_tap mới được import không có mã danh mục.`,
    )
    result.blockingRowIndexes.push(index)
  })

  result.missingCatalogItems = Array.from(missingByCode.values())
  return result
}

function getRecordContent(row: Record<string, unknown>): string {
  return (
    cleanupNeedCreatePrefix(toText(row.noi_dung)).trim() ||
    cleanupNeedConfirmPrefix(toText(row.ho_ten)).trim() ||
    toText(row.ly_do).trim() ||
    toText(row.ghi_chu).trim()
  )
}

function missingCatalogToForm(item: MissingCatalogItem): MissingCatalogForm {
  const code = normalizeCatalogCode(item.code)
  const group = inferGroupFromCode(code) || toPointGroup('', item.loai === 'khen_thuong' ? 1 : -1)
  const point = group === 'KT' ? '1' : '-1'
  const content = cleanupNeedCreatePrefix(item.sampleContent).trim()

  return {
    code,
    nhom: group,
    ten_muc: content || code,
    diem: point,
    nghiem_trong: false,
    pham_vi: 'ca_nhan',
    rowIndexes: [...item.rowIndexes],
    sampleContent: item.sampleContent,
  }
}

function inferGroupFromCode(code: string): NhomDiem | null {
  const normalized = code.trim().toUpperCase()
  const match = GROUP_OPTIONS.find((option) => normalized.startsWith(option.value))
  return match?.value ?? null
}

function checkRecordStudentLinks(
  rows: Record<string, unknown>[],
  catalog: DanhMucDiem[],
  students: HocSinh[],
): StudentCheck {
  const studentById = new Map(students.map((student) => [student.ma_hs.trim().toUpperCase(), student]))
  const catalogByCode = new Map(
    catalog.map((item) => [String(item.ma_danh_muc || '').trim().toUpperCase(), item]),
  )
  const result: StudentCheck = {
    blockingRowIndexes: [],
    errors: [],
    linkedCount: 0,
    allowedBlankCount: 0,
    autoMatchItems: [],
    unresolvedItems: [],
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const maHs = toText(row.ma_hs).trim().toUpperCase()
    const hoTen = cleanupNeedConfirmPrefix(toText(row.ho_ten).trim())

    if (maHs) {
      if (studentById.has(maHs)) {
        result.linkedCount += 1
      } else {
        result.errors.push(`Dong ${rowNumber}: ma_hs "${maHs}" khong co trong danh sach HocSinh.`)
        result.blockingRowIndexes.push(index)
      }
      return
    }

    if (!isPersonalRecord(row, catalogByCode)) {
      result.allowedBlankCount += 1
      return
    }

    const item: StudentResolutionItem = {
      rowIndex: index,
      hoTen,
      noiDung: toText(row.noi_dung),
      exactMatch: findExactStudentByName(hoTen, students),
      candidates: findStudentCandidates(hoTen, students),
    }

    if (item.exactMatch) {
      result.autoMatchItems.push(item)
    } else {
      result.unresolvedItems.push(item)
    }
    result.blockingRowIndexes.push(index)
  })

  return result
}

function isPersonalRecord(
  row: Record<string, unknown>,
  catalogByCode: Map<string, DanhMucDiem>,
): boolean {
  const explicitStudentId = toText(row.ma_hs).trim()
  const explicitStudentName = cleanupNeedConfirmPrefix(toText(row.ho_ten).trim())
  if (explicitStudentId || explicitStudentName) {
    return true
  }

  const rawScope = normalizeForMatch(toText(row.pham_vi)).replace(/\s+/g, '_')
  if (rawScope === 'ca_nhan') {
    return true
  }
  if (rawScope === 'tap_the' || rawScope === 'to_truc') {
    return false
  }

  const code = toText(row.ma_danh_muc).trim().toUpperCase()
  const catalogItem = code ? catalogByCode.get(code) : undefined

  if (catalogItem) {
    return catalogItem.pham_vi === 'ca_nhan'
  }

  return !toText(row.to_lien_quan).trim()
}

function findExactStudentByName(rawName: string, students: HocSinh[]): HocSinh | null {
  const normalizedName = normalizeForMatch(rawName)
  if (!normalizedName) return null

  const matches = students.filter((student) => normalizeForMatch(studentFullName(student)) === normalizedName)
  return matches.length === 1 ? matches[0] : null
}

function findStudentCandidates(rawName: string, students: HocSinh[]): HocSinh[] {
  const normalizedName = normalizeForMatch(rawName)
  if (!normalizedName) return []

  const tokens = normalizedName.split(/\s+/).filter(Boolean)
  const lastToken = tokens[tokens.length - 1] || normalizedName

  return students
    .map((student) => {
      const fullName = normalizeForMatch(studentFullName(student))
      const score =
        fullName === normalizedName
          ? 100
          : fullName.includes(normalizedName)
            ? 70
            : normalizedName.includes(fullName)
              ? 60
              : fullName.split(/\s+/).includes(lastToken)
                ? 30
                : 0

      return { score, student }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compareStudentsByOrder(left.student, right.student))
    .slice(0, 5)
    .map((item) => item.student)
}

function applyStudentToJsonText(jsonText: string, rowIndex: number, student: HocSinh): string {
  return updateImportRowsInJsonText(jsonText, (row, index) =>
    index === rowIndex ? enrichRowWithStudent(row, student) : row,
  )
}

function enrichRowWithStudent(row: Record<string, unknown>, student: HocSinh): Record<string, unknown> {
  return {
    ...row,
    ma_hs: student.ma_hs,
    ho_ten: studentFullName(student),
    dien_tai_thoi_diem: row.dien_tai_thoi_diem || student.dien,
  }
}

function updateImportRowsInJsonText(
  jsonText: string,
  updater: (row: Record<string, unknown>, index: number) => Record<string, unknown>,
): string {
  try {
    const parsed = JSON.parse(jsonText) as unknown
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!sourceRows || !sourceRows.every(isRecord)) {
      return jsonText
    }

    const rows = sourceRows.map((row, index) => updater(row, index))
    if (Array.isArray(parsed)) {
      return JSON.stringify(rows, null, 2)
    }

    return JSON.stringify({ ...(parsed as Record<string, unknown>), ban_ghi: rows }, null, 2)
  } catch {
    return jsonText
  }
}

function keepOnlyRowsInJsonText(jsonText: string, rowIndexes: number[]): string {
  try {
    const parsed = JSON.parse(jsonText) as unknown
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!sourceRows || !sourceRows.every(isRecord)) {
      return jsonText
    }

    const indexSet = new Set(rowIndexes)
    const rows = sourceRows.filter((_row, index) => indexSet.has(index))

    if (Array.isArray(parsed)) {
      return JSON.stringify(rows, null, 2)
    }

    return JSON.stringify({ ...(parsed as Record<string, unknown>), ban_ghi: rows }, null, 2)
  } catch {
    return jsonText
  }
}

function studentFullName(student: HocSinh): string {
  return `${student.ho} ${student.ten}`.replace(/\s+/g, ' ').trim()
}

function splitStudentName(rawName: string): { ho: string; ten: string } {
  const cleanName = cleanupNeedConfirmPrefix(rawName).replace(/\s+/g, ' ').trim()
  const parts = cleanName.split(' ').filter(Boolean)
  if (parts.length <= 1) {
    return { ho: '', ten: cleanName }
  }

  return { ho: parts.slice(0, -1).join(' '), ten: parts[parts.length - 1] }
}

function cleanupNeedConfirmPrefix(value: string): string {
  return value.replace(/^\s*\[[^\]]*C[ẦA]N X[ÁA]C NH[ẬA]N T[ÊE]N[^\]]*\]\s*/i, '').trim()
}

function nextStudentId(students: HocSinh[]): string {
  const existingIds = new Set(students.map((student) => student.ma_hs.trim().toUpperCase()))
  const maxNumber = students.reduce((currentMax, student) => {
    const numericId = Number.parseInt(student.ma_hs.replace(/^HS/i, ''), 10)
    return Number.isNaN(numericId) ? currentMax : Math.max(currentMax, numericId)
  }, 0)

  let nextNumber = maxNumber + 1
  let candidate = `HS${String(nextNumber).padStart(3, '0')}`
  while (existingIds.has(candidate)) {
    nextNumber += 1
    candidate = `HS${String(nextNumber).padStart(3, '0')}`
  }

  return candidate
}

function nextStudentOrder(students: HocSinh[]): number {
  return students.reduce((currentMax, student) => Math.max(currentMax, Number(student.tt) || 0), 0) + 1
}

function randomToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(8)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function compareStudentsByOrder(left: HocSinh, right: HocSinh): number {
  return (Number(left.tt) || 0) - (Number(right.tt) || 0)
}

function parseJsonRows(jsonText: string): ParseState {
  const trimmed = jsonText.trim()
  if (!trimmed) {
    return { status: 'empty' }
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    const rows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null
    const catalogSuggestions =
      isRecord(parsed) && Array.isArray(parsed.de_xuat_danh_muc)
        ? parsed.de_xuat_danh_muc.filter(isRecord).map(normalizeCatalogSuggestion)
        : []

    if (!rows) {
      return { status: 'invalid', message: 'JSON cần là array hoặc object có ban_ghi array.' }
    }

    if (!rows.every(isRecord)) {
      return { status: 'invalid', message: 'Mỗi phần tử trong array cần là object.' }
    }

    return { status: 'valid', rows, catalogSuggestions }
  } catch (error) {
    return {
      status: 'invalid',
      message: error instanceof Error ? error.message : 'JSON không hợp lệ.',
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCatalogSuggestion(row: Record<string, unknown>): CatalogSuggestion {
  return {
    nhom_goi_y: toText(row.nhom_goi_y).trim().toUpperCase(),
    ten_muc_goi_y: toText(row.ten_muc_goi_y).trim(),
    diem_goi_y: row.diem_goi_y === undefined ? null : (row.diem_goi_y as string | number | null),
    pham_vi_goi_y: toText(row.pham_vi_goi_y).trim(),
    mo_ta_tho: toText(row.mo_ta_tho).trim(),
    ly_do_can_tao: toText(row.ly_do_can_tao).trim(),
    ma_goi_y: toText(row.ma_goi_y).trim() || null,
  }
}

function suggestionToForm(
  suggestion: CatalogSuggestion,
  sourceIndex: number,
  catalog: DanhMucDiem[],
): CatalogSuggestionForm {
  const group = toPointGroup(suggestion.nhom_goi_y, suggestion.diem_goi_y)
  const suggestedCode = normalizeCatalogCode(suggestion.ma_goi_y)
  const suggestedCodeExists = catalog.some(
    (item) => item.ma_danh_muc.trim().toUpperCase() === suggestedCode,
  )

  return {
    sourceIndex,
    ma_danh_muc: suggestedCode && !suggestedCodeExists ? suggestedCode : nextCodeForGroup(group, catalog),
    nhom: group,
    ten_muc: suggestion.ten_muc_goi_y || suggestion.mo_ta_tho,
    diem: toText(suggestion.diem_goi_y || (group === 'KT' ? 1 : -1)),
    nghiem_trong: Number(suggestion.diem_goi_y) <= -10,
    pham_vi: toCatalogScope(suggestion.pham_vi_goi_y),
    mo_ta_tho: suggestion.mo_ta_tho,
    ly_do_can_tao: suggestion.ly_do_can_tao,
  }
}

function toPointGroup(value: string, point: string | number | null): NhomDiem {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CC' || normalized === 'VS' || normalized === 'NN' || normalized === 'KL' || normalized === 'KT') {
    return normalized
  }

  return Number(point) > 0 ? 'KT' : 'NN'
}

function toCatalogScope(value: string): PhamViDanhMuc {
  const normalized = normalizeForMatch(value).replace(/\s+/g, '_')
  if (normalized === 'tap_the') return 'tap_the'
  if (normalized === 'to_truc') return 'to_truc'
  return 'ca_nhan'
}

function normalizeCatalogCode(value: string | null): string {
  return toText(value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
}

function nextCodeForGroup(group: NhomDiem, catalog: DanhMucDiem[]): string {
  const existingCodes = new Set(catalog.map((item) => item.ma_danh_muc.trim().toUpperCase()))
  const maxNumber = catalog.reduce((max, item) => {
    const code = item.ma_danh_muc.trim().toUpperCase()
    if (!code.startsWith(group)) return max
    const match = code.slice(group.length).match(/^(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  let nextNumber = maxNumber + 1
  let candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  while (existingCodes.has(candidate)) {
    nextNumber += 1
    candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  }

  return candidate
}

function applyCatalogCodeToJsonText(
  jsonText: string,
  form: CatalogSuggestionForm,
  code: string,
): { jsonText: string; updatedRows: number } {
  try {
    const parsed = JSON.parse(jsonText) as unknown
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!sourceRows || !sourceRows.every(isRecord)) {
      return { jsonText, updatedRows: 0 }
    }

    const pendingIndexes = sourceRows
      .map((row, index) => (rowNeedsCatalog(row) ? index : -1))
      .filter((index) => index >= 0)
    let updatedRows = 0
    const matchedIndexes = sourceRows
      .map((row, index) => (rowNeedsCatalog(row) && rowMatchesSuggestion(row, form) ? index : -1))
      .filter((index) => index >= 0)
    const indexesToUpdate = matchedIndexes.length > 0 ? matchedIndexes : pendingIndexes.length === 1 ? pendingIndexes : []

    const rows = sourceRows.map((row, index) => {
      if (!indexesToUpdate.includes(index)) {
        return row
      }

      updatedRows += 1
      return {
        ...row,
        ma_danh_muc: code,
        noi_dung: cleanupNeedCreatePrefix(toText(row.noi_dung)) || form.mo_ta_tho || form.ten_muc,
      }
    })

    if (Array.isArray(parsed)) {
      return { jsonText: JSON.stringify(rows, null, 2), updatedRows }
    }

    const nextPayload: Record<string, unknown> = { ...(parsed as Record<string, unknown>), ban_ghi: rows }
    const suggestions = Array.isArray(nextPayload.de_xuat_danh_muc)
      ? nextPayload.de_xuat_danh_muc.filter((_item: unknown, index: number) => index !== form.sourceIndex)
      : []

    nextPayload.de_xuat_danh_muc = suggestions
    return { jsonText: JSON.stringify(nextPayload, null, 2), updatedRows }
  } catch {
    return { jsonText, updatedRows: 0 }
  }
}

function countSuggestionMatchedRows(jsonText: string, form: CatalogSuggestionForm): number {
  try {
    const parsed = JSON.parse(jsonText) as unknown
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!sourceRows || !sourceRows.every(isRecord)) {
      return 0
    }

    const matchedCount = sourceRows.filter((row) => rowNeedsCatalog(row) && rowMatchesSuggestion(row, form)).length
    if (matchedCount > 0) {
      return matchedCount
    }

    return sourceRows.filter(rowNeedsCatalog).length === 1 ? 1 : 0
  } catch {
    return 0
  }
}

function rowNeedsCatalog(row: Record<string, unknown>): boolean {
  return !toText(row.ma_danh_muc).trim() && toText(row.loai).trim() !== 'hoc_tap'
}

function rowMatchesSuggestion(row: Record<string, unknown>, form: CatalogSuggestionForm): boolean {
  const haystack = normalizeForMatch(`${toText(row.noi_dung)} ${toText(row.ly_do)}`)
  const needles = [form.mo_ta_tho, form.ten_muc].map(normalizeForMatch).filter(Boolean)

  return needles.some((needle) => haystack.includes(needle))
}

function getSimilarCatalogMatches(form: CatalogSuggestionForm, catalog: DanhMucDiem[]): SimilarCatalogMatch[] {
  return catalog
    .map((item) => ({ item, score: scoreCatalogSimilarity(form, item) }))
    .filter((match) => match.score >= 0.35)
    .sort((left, right) => right.score - left.score || compareCatalogItems(left.item, right.item))
    .slice(0, 5)
}

function scoreCatalogSimilarity(form: CatalogSuggestionForm, item: DanhMucDiem): number {
  const formText = `${form.ten_muc} ${form.mo_ta_tho}`
  const itemText = item.ten_muc
  const formTokens = tokenizeForMatch(formText)
  const itemTokens = tokenizeForMatch(itemText)

  if (formTokens.length === 0 || itemTokens.length === 0) {
    return 0
  }

  const itemTokenSet = new Set(itemTokens)
  const overlap = formTokens.filter((token) => itemTokenSet.has(token)).length
  let score = overlap / Math.max(formTokens.length, itemTokens.length)

  const normalizedFormText = normalizeForMatch(formText).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const normalizedItemText = normalizeForMatch(itemText).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (normalizedFormText.includes(normalizedItemText) || normalizedItemText.includes(normalizedFormText)) {
    score += 0.2
  }

  if (form.nhom === item.nhom) {
    score += 0.15
  }

  if (form.pham_vi === item.pham_vi) {
    score += 0.05
  }

  const formPoint = Number(form.diem)
  const itemPoint = Number(item.diem)
  if (Number.isFinite(formPoint) && Number.isFinite(itemPoint) && Math.sign(formPoint) === Math.sign(itemPoint)) {
    score += 0.1
  }

  return Math.min(score, 1)
}

function tokenizeForMatch(value: string): string[] {
  return normalizeForMatch(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function cleanupNeedCreatePrefix(value: string): string {
  return value.replace(/^\s*\[CẦN TẠO DANH MỤC[^\]]*\]\s*/i, '').trim()
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function compareCatalogItems(left: DanhMucDiem, right: DanhMucDiem): number {
  return `${left.nhom}-${left.ma_danh_muc}`.localeCompare(`${right.nhom}-${right.ma_danh_muc}`)
}

function labelSuggestionScope(value: PhamViDanhMuc): string {
  if (value === 'tap_the') return 'Tập thể'
  if (value === 'to_truc') return 'Tổ trực'
  return 'Cá nhân'
}

function collectPreviewColumns(rows: Record<string, unknown>[]): string[] {
  const columns = new Set<string>()

  rows.slice(0, PREVIEW_LIMIT).forEach((row) => {
    Object.keys(row).forEach((key) => columns.add(key))
  })

  return Array.from(columns).slice(0, 10)
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function canDeleteImportLog(log: NhatKyImport): boolean {
  return log.loai_du_lieu === 'ghi_nhan' && log.trang_thai !== 'da_xoa'
}

function sortDateDesc(left: string, right: string): number {
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return String(right).localeCompare(String(left))
  }

  return rightTime - leftTime
}

function formatDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value || '-'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: value.includes(':') ? 'short' : undefined,
  }).format(parsed)
}

function getStatusClass(status: TrangThaiImport): string {
  if (status === 'da_xoa') {
    return 'bg-slate-100 text-slate-700'
  }

  if (status === 'thanh_cong') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (status === 'loi_mot_phan') {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-red-100 text-red-800'
}
