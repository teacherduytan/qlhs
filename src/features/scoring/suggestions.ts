import type { GhiNhan } from '../../data/types'
import type { WeeklyStudentScore } from './scoring'

export function buildPedagogySuggestions({
  currentWeekRecords,
  previousScore,
  score,
  twoWeekRecords,
}: {
  currentWeekRecords: GhiNhan[]
  previousScore?: WeeklyStudentScore
  score: WeeklyStudentScore
  twoWeekRecords: GhiNhan[]
}): string[] {
  const suggestions: string[] = []

  if (
    score.diem_chuyen_can < 50 ||
    score.diem_ve_sinh < 50 ||
    score.diem_ne_nep < 50 ||
    score.diem_ky_luat < 50
  ) {
    suggestions.push('Nên trao đổi riêng và mời phụ huynh trong tuần.')
  }

  if (hasRepeatedViolation(currentWeekRecords)) {
    suggestions.push('Vi phạm lặp lại, cân nhắc hình thức xử lý cao hơn.')
  }

  if (score.can_canh_bao_ngay) {
    suggestions.push('Vi phạm nghiêm trọng, xử lý ngay theo quy chế.')
  }

  if (
    previousScore &&
    previousScore.diem_xep_loai_thi_dua - score.diem_xep_loai_thi_dua >= 15
  ) {
    suggestions.push('Điểm đi xuống rõ rệt, nên tìm hiểu sớm.')
  }

  if (twoWeekRecords.length === 0) {
    suggestions.push('Có thể tuyên dương làm gương.')
  }

  return suggestions
}

function hasRepeatedViolation(records: GhiNhan[]): boolean {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    if (!record.ma_danh_muc) {
      return
    }

    counts.set(record.ma_danh_muc, (counts.get(record.ma_danh_muc) || 0) + (record.so_lan || 1))
  })

  return Array.from(counts.values()).some((count) => count >= 3)
}
