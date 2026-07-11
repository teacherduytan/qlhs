import type { DanhMucDiem, GhiNhan, NhomDiem } from '../../data/types'

type BadgeTone = NhomDiem | 'HT' | 'KL_NGHIEM_TRONG' | 'TAP_THE' | 'MAC_DINH'

const BADGE_CLASSES: Record<BadgeTone, string> = {
  CC: 'bg-blue-100 text-blue-700 border-blue-200',
  VS: 'bg-green-100 text-green-700 border-green-200',
  NN: 'bg-purple-100 text-purple-700 border-purple-200',
  KL: 'bg-orange-100 text-orange-700 border-orange-200',
  KL_NGHIEM_TRONG: 'bg-red-100 text-red-700 border-red-500',
  HT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  KT: 'bg-teal-100 text-teal-700 border-teal-200',
  TAP_THE: 'bg-slate-100 text-slate-600 border-slate-200',
  MAC_DINH: 'bg-slate-100 text-slate-700 border-slate-200',
}

const TYPE_TO_TONE: Record<GhiNhan['loai'], BadgeTone> = {
  chuyen_can: 'CC',
  ve_sinh: 'VS',
  ne_nep: 'NN',
  trat_tu_ky_luat: 'KL',
  hoc_tap: 'HT',
  khen_thuong: 'KT',
}

export function getBadgeClassForCatalog(catalogItem?: DanhMucDiem): string {
  return BADGE_CLASSES[getToneForCatalog(catalogItem)]
}

export function getBadgeClassForRecord(
  record: GhiNhan,
  catalogByCode: Map<string, DanhMucDiem>,
): string {
  const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined

  if (catalogItem) {
    return getBadgeClassForCatalog(catalogItem)
  }

  return BADGE_CLASSES[TYPE_TO_TONE[record.loai] || 'MAC_DINH']
}

export function getBadgeClassForGroup(group: string): string {
  return BADGE_CLASSES[toBadgeTone(group)]
}

function getToneForCatalog(catalogItem?: DanhMucDiem): BadgeTone {
  if (!catalogItem) {
    return 'MAC_DINH'
  }

  if (catalogItem.pham_vi === 'tap_the' || catalogItem.pham_vi === 'to_truc') {
    return 'TAP_THE'
  }

  if (catalogItem.nhom === 'KL' && catalogItem.nghiem_trong) {
    return 'KL_NGHIEM_TRONG'
  }

  return catalogItem.nhom
}

function toBadgeTone(value: string): BadgeTone {
  const normalized = value.toUpperCase()

  if (normalized === 'HT') {
    return 'HT'
  }

  if (normalized === 'KT') {
    return 'KT'
  }

  if (normalized === 'CC' || normalized === 'VS' || normalized === 'NN' || normalized === 'KL') {
    return normalized
  }

  return 'MAC_DINH'
}
