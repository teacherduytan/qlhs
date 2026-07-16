import type { DanhMucDiem, NhomDiem, PhamViDanhMuc } from '../../data/types'

export type SimilarCatalogMatch = {
  item: DanhMucDiem
  score: number
}

export type MissingCatalogItem = {
  code: string
  rowIndexes: number[]
  sampleContent: string
  loai: string
  generatedFromMissingCode?: boolean
}

export type CatalogAutoMatchItem = {
  rowIndex: number
  content: string
  catalogItem: DanhMucDiem
  score: number
}

export type MissingCatalogForm = {
  code: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  mo_ta: string
  de_xuat_xu_ly: string
  ma_xu_ly_de_xuat: string
  rowIndexes: number[]
  sampleContent: string
}

export type CatalogCheck = {
  autoMatchItems: CatalogAutoMatchItem[]
  blockingRowIndexes: number[]
  errors: string[]
  linkedCount: number
  missingCatalogItems: MissingCatalogItem[]
  studyCount: number
  warnings: string[]
}

const GROUPS: NhomDiem[] = ['CC', 'VS', 'NN', 'KL', 'KT']

export function checkRecordCatalogLinks(rows: Record<string, unknown>[], catalog: DanhMucDiem[]): CatalogCheck {
  const catalogByCode = new Map(
    catalog.map((item) => [String(item.ma_danh_muc || '').trim().toUpperCase(), item]),
  )
  const missingByCode = new Map<string, MissingCatalogItem>()
  const missingContentToCode = new Map<string, string>()
  const reservedCatalogCodes = new Set(catalog.map((item) => item.ma_danh_muc.trim().toUpperCase()))
  const result: CatalogCheck = {
    autoMatchItems: [],
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

    const content = getRecordContent(row)
    const bestMatch = findBestCatalogMatchForMissingRow(row, catalog)
    if (bestMatch && bestMatch.score >= 0.72) {
      result.autoMatchItems.push({
        rowIndex: index,
        content,
        catalogItem: bestMatch.item,
        score: bestMatch.score,
      })
      result.errors.push(
        `Dong ${rowNumber}: thieu ma_danh_muc, app co the tu gan ${bestMatch.item.ma_danh_muc} - ${bestMatch.item.ten_muc}.`,
      )
      result.blockingRowIndexes.push(index)
      return
    }

    const group = inferMissingCatalogGroup(row)
    const contentKey = `${group}:${normalizeForMatch(content || type || String(rowNumber))}`
    let generatedCode = missingContentToCode.get(contentKey)
    if (!generatedCode) {
      generatedCode = nextCodeForGroupWithReserved(group, reservedCatalogCodes)
      missingContentToCode.set(contentKey, generatedCode)
      reservedCatalogCodes.add(generatedCode)
    }

    const existingMissing = missingByCode.get(generatedCode)
    if (existingMissing) {
      existingMissing.rowIndexes.push(index)
    } else {
      missingByCode.set(generatedCode, {
        code: generatedCode,
        rowIndexes: [index],
        sampleContent: content || generatedCode,
        loai: type,
        generatedFromMissingCode: true,
      })
    }

    result.errors.push(
      `Dong ${rowNumber}: thieu ma_danh_muc. App da goi y tao/chon danh muc ${generatedCode} tu noi dung dong nay.`,
    )
    result.blockingRowIndexes.push(index)
  })

  result.missingCatalogItems = Array.from(missingByCode.values())
  return result
}

export function missingCatalogToForm(item: MissingCatalogItem): MissingCatalogForm {
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
    mo_ta: content || item.sampleContent,
    de_xuat_xu_ly: suggestImportCatalogHandling(content || item.sampleContent, point),
    ma_xu_ly_de_xuat: '',
    rowIndexes: [...item.rowIndexes],
    sampleContent: item.sampleContent,
  }
}

export function getSimilarCatalogMatchesForMissing(
  form: MissingCatalogForm,
  catalog: DanhMucDiem[],
): SimilarCatalogMatch[] {
  const text = `${form.ten_muc} ${form.mo_ta} ${form.sampleContent}`
  return catalog
    .map((item) => ({ item, score: scoreCatalogTextSimilarity(text, item) + (item.nhom === form.nhom ? 0.15 : 0) }))
    .filter((match) => match.score >= 0.35)
    .sort((left, right) => right.score - left.score || compareCatalogItems(left.item, right.item))
    .slice(0, 5)
}

export function findBestCatalogMatchForMissingRow(
  row: Record<string, unknown>,
  catalog: DanhMucDiem[],
): { item: DanhMucDiem; score: number } | null {
  const content = getRecordContent(row)
  if (!content) return null

  const group = inferMissingCatalogGroup(row)
  const matches = catalog
    .map((item) => ({
      item,
      score: scoreCatalogTextSimilarity(content, item) + (item.nhom === group ? 0.15 : 0),
    }))
    .filter((match) => match.score >= 0.45)
    .sort((left, right) => right.score - left.score || compareCatalogItems(left.item, right.item))

  return matches[0] || null
}

export function scoreCatalogTextSimilarity(text: string, item: DanhMucDiem): number {
  const sourceTokens = tokenizeForMatch(text)
  const itemTokens = tokenizeForMatch(`${item.ten_muc} ${item.mo_ta || ''}`)
  if (sourceTokens.length === 0 || itemTokens.length === 0) return 0

  const itemTokenSet = new Set(itemTokens)
  const overlap = sourceTokens.filter((token) => itemTokenSet.has(token)).length
  let score = overlap / Math.max(sourceTokens.length, itemTokens.length)

  const sourceText = normalizePlainText(text)
  const itemText = normalizePlainText(item.ten_muc)
  if (sourceText.includes(itemText) || itemText.includes(sourceText)) score += 0.3
  if (item.diem > 0 && normalizeForMatch(toText(text)).includes('khen')) score += 0.1
  if (item.diem < 0 && normalizeForMatch(toText(text)).includes('khong')) score += 0.05
  score += semanticCatalogBoost(sourceText, itemText)

  return Math.min(score, 1)
}

export function suggestImportCatalogHandling(content: string, pointValue: string | number): string {
  const point = Number(pointValue)
  const normalized = normalizeForMatch(content)

  if (normalized.includes('khong thuoc bai')) {
    return [
      'Lần 1: nhắc nhở, ghi rõ phần không thuộc; nếu không thuộc 1 từ/1 ý nhỏ thì chép 20 lần nội dung đó.',
      'Lần 2: chép phạt 50 lần phần chưa thuộc, trừ điểm nội bộ theo danh mục.',
      'Lần 3: viết kiểm điểm và báo phụ huynh.',
      'Tái phạm nhiều lần: mời phụ huynh trao đổi biện pháp học bài tại nhà.',
    ].join('\n')
  }

  if (normalized.includes('dung cu') || normalized.includes('sgk') || normalized.includes('may tinh')) {
    return [
      'Lần 1: nhắc nhở, yêu cầu bổ sung dụng cụ ở tiết sau.',
      'Lần 2: đóng 10k quỹ lớp hoặc chép phạt 50 lần nội quy chuẩn bị bài.',
      'Lần 3: viết kiểm điểm và báo phụ huynh.',
      'Tái phạm nhiều lần: mời phụ huynh phối hợp chuẩn bị dụng cụ học tập.',
    ].join('\n')
  }

  if (point < 0) {
    return [
      'Lần 1: nhắc nhở riêng, ghi nhận vào hệ thống.',
      'Lần 2: chép phạt 50 lần nội dung liên quan hoặc đóng 10k quỹ lớp theo quy ước lớp.',
      'Lần 3: viết kiểm điểm, báo phụ huynh.',
      'Tái phạm nhiều lần hoặc nghiêm trọng: mời phụ huynh làm việc với GVCN.',
    ].join('\n')
  }

  if (point > 0) {
    return 'Ghi nhận tích cực, cộng điểm nội bộ; nếu lặp lại nhiều lần có thể tuyên dương trước lớp hoặc trong tổng kết tuần.'
  }

  return ''
}

function getRecordContent(row: Record<string, unknown>): string {
  return (
    cleanupNeedCreatePrefix(toText(row.noi_dung)).trim() ||
    cleanupNeedConfirmPrefix(toText(row.ho_ten)).trim() ||
    toText(row.ly_do).trim() ||
    toText(row.ghi_chu).trim()
  )
}

function inferMissingCatalogGroup(row: Record<string, unknown>): NhomDiem {
  const type = normalizeForMatch(toText(row.loai))
  const text = normalizeForMatch(`${getRecordContent(row)} ${toText(row.ly_do)} ${toText(row.ghi_chu)}`)
  if (type.includes('khen') || type.includes('tich_cuc') || text.includes('gio tay')) return 'KT'
  if (text.includes('ve sinh')) return 'VS'
  if (text.includes('di tre') || text.includes('vang')) return 'CC'
  if (text.includes('mat trat tu') || text.includes('ky luat') || text.includes('noi chuyen')) return 'KL'
  return 'NN'
}

function nextCodeForGroupWithReserved(group: NhomDiem, reservedCodes: Set<string>): string {
  let maxNumber = 0
  reservedCodes.forEach((code) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized.startsWith(group)) return
    const match = normalized.slice(group.length).match(/^(\d+)$/)
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]))
  })

  let nextNumber = maxNumber + 1
  let candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  while (reservedCodes.has(candidate)) {
    nextNumber += 1
    candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  }

  return candidate
}

function inferGroupFromCode(code: string): NhomDiem | null {
  const normalized = code.trim().toUpperCase()
  return GROUPS.find((group) => normalized.startsWith(group)) ?? null
}

function toPointGroup(value: string, point: string | number | null): NhomDiem {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CC' || normalized === 'VS' || normalized === 'NN' || normalized === 'KL' || normalized === 'KT') {
    return normalized
  }

  return Number(point) > 0 ? 'KT' : 'NN'
}

function normalizeCatalogCode(value: string | null): string {
  return toText(value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
}

function tokenizeForMatch(value: string): string[] {
  return normalizeForMatch(value)
    .replace(/[^a-z0-9đ\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function semanticCatalogBoost(sourceText: string, itemText: string): number {
  if (itemText.includes('khong mang dung cu hoc tap')) {
    const isMissingSupply =
      sourceText.includes('khong mang') ||
      sourceText.includes('quen') ||
      sourceText.includes('thieu')
    const hasSupplyWord =
      sourceText.includes('may tinh') ||
      sourceText.includes('sgk') ||
      sourceText.includes('sach') ||
      sourceText.includes('vo') ||
      sourceText.includes('dung cu')
    if (isMissingSupply && hasSupplyWord) return 0.45
  }

  if (itemText.includes('khong bao bia') && sourceText.includes('bao bia')) return 0.45
  if (itemText.includes('dan nhan') && sourceText.includes('dan nhan')) return 0.45

  if (
    itemText.includes('noi chuyen') &&
    itemText.includes('phat bieu') &&
    (sourceText.includes('phat bieu linh tinh') || sourceText.includes('noi chuyen'))
  ) {
    return 0.45
  }

  if (itemText.includes('doi cho ngoi') && sourceText.includes('doi cho')) return 0.45
  if (itemText.includes('khong thuoc bai') && sourceText.includes('khong thuoc bai')) return 0.45

  return 0
}

function cleanupNeedCreatePrefix(value: string): string {
  return value.replace(/^\s*\[CẦN TẠO DANH MỤC[^\]]*\]\s*/i, '').trim()
}

function cleanupNeedConfirmPrefix(value: string): string {
  return value.replace(/^\s*\[[^\]]*C[ẦA]N X[ÁA]C NH[ẬA]N T[ÊE]N[^\]]*\]\s*/i, '').trim()
}

function normalizePlainText(value: string): string {
  return normalizeForMatch(value).replace(/[^a-z0-9đ\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function compareCatalogItems(left: DanhMucDiem, right: DanhMucDiem): number {
  return `${left.nhom}-${left.ma_danh_muc}`.localeCompare(`${right.nhom}-${right.ma_danh_muc}`)
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}
