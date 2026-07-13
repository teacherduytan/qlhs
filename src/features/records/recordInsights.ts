import type { DanhMucDiem, GhiNhan } from '../../data/types'

export type RecordPolarity = 'positive' | 'negative' | 'neutral'

export type InterventionRule = {
  minCount: number
  label: string
  action: string
}

export type RecordInsight = {
  duplicateCount: number
  duplicateKey: string | null
  impactValue: -1 | 0 | 1
  intervention: InterventionRule | null
  polarity: RecordPolarity
}

export const INTERVENTION_RULES: InterventionRule[] = [
  {
    minCount: 1,
    label: 'Lần 1: nhắc nhở',
    action: 'Nhắc nhở trực tiếp, cho học sinh biết nội dung cần sửa.',
  },
  {
    minCount: 2,
    label: 'Lần 2: đóng 10k quỹ lớp',
    action: 'Ghi nhận tái phạm và đóng 10k quỹ lớp theo quy ước lớp.',
  },
  {
    minCount: 3,
    label: 'Lần 3: chép phạt 50 lần',
    action: 'Yêu cầu chép phạt 50 lần nội dung cam kết không tái phạm.',
  },
  {
    minCount: 4,
    label: 'Lần 4: viết kiểm điểm',
    action: 'Viết bản kiểm điểm có chữ ký xác nhận theo yêu cầu giáo viên.',
  },
  {
    minCount: 5,
    label: 'Lần 5+: mời phụ huynh',
    action: 'Mời phụ huynh trao đổi nếu tiếp tục lặp lại cùng lỗi.',
  },
]

export function getRecordInsight(
  record: GhiNhan,
  allRecords: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
): RecordInsight {
  const polarity = getRecordPolarity(record, catalogByCode)
  const impactValue = polarity === 'positive' ? 1 : polarity === 'negative' ? -1 : 0
  const duplicateKey = polarity === 'negative' ? buildDuplicateKey(record, catalogByCode) : null
  const duplicateCount = duplicateKey
    ? allRecords.filter((item) => buildDuplicateKey(item, catalogByCode) === duplicateKey).length
    : 0

  return {
    duplicateCount,
    duplicateKey,
    impactValue,
    intervention: duplicateCount > 0 ? getInterventionRule(duplicateCount) : null,
    polarity,
  }
}

export function summarizeRecordImpacts(
  records: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
): { negative: number; positive: number } {
  return records.reduce(
    (summary, record) => {
      const polarity = getRecordPolarity(record, catalogByCode)
      if (polarity === 'positive') {
        summary.positive += 1
      }
      if (polarity === 'negative') {
        summary.negative += 1
      }
      return summary
    },
    { negative: 0, positive: 0 },
  )
}

export function getRecordPolarity(
  record: GhiNhan,
  catalogByCode: Map<string, DanhMucDiem>,
): RecordPolarity {
  const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined

  if (record.loai === 'khen_thuong' || catalogItem?.nhom === 'KT') {
    return 'positive'
  }

  if (typeof record.diem_cong_tru === 'number') {
    if (record.diem_cong_tru > 0) {
      return 'positive'
    }
    if (record.diem_cong_tru < 0) {
      return 'negative'
    }
  }

  if (
    catalogItem &&
    ['CC', 'VS', 'NN', 'KL'].includes(catalogItem.nhom) &&
    catalogItem.diem < 0
  ) {
    return 'negative'
  }

  return 'neutral'
}

export function buildDuplicateKey(
  record: GhiNhan,
  catalogByCode: Map<string, DanhMucDiem>,
): string | null {
  if (!record.ma_hs) {
    return null
  }

  const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
  const issueKey =
    record.ma_danh_muc ||
    catalogItem?.ten_muc ||
    record.noi_dung ||
    record.ly_do ||
    record.loai
  const normalizedIssue = normalizeIssue(issueKey)

  return normalizedIssue ? `${record.ma_hs}|${record.loai}|${normalizedIssue}` : null
}

function getInterventionRule(count: number): InterventionRule {
  return [...INTERVENTION_RULES]
    .sort((left, right) => right.minCount - left.minCount)
    .find((rule) => count >= rule.minCount) || INTERVENTION_RULES[0]
}

function normalizeIssue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(lan|lần)\s*\d+\b/g, '')
    .replace(/\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
