import type { DanhMucDiem, NhomDiem } from '../../data/types'

export function nextCodeForGroup(group: NhomDiem, catalog: DanhMucDiem[]): string {
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
