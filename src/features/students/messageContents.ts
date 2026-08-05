import type { CauHinhTuan, NoiDungTinNhan } from '../../data/types'

// "Hien tai" = ban ghi co KY GAN NHAT VOI NGAY THUC TE (khong phai ban ghi
// moi nhap nhat) - so khoang cach tu hom nay den ngay dai dien cua tung ky
// (dau tuan cho ky tuan, ngay 15 cua thang cho ky thang lam moc uoc luong),
// lay ky co khoang cach nho nhat.
export function findCurrentMessage(
  messages: NoiDungTinNhan[],
  weekConfig: CauHinhTuan[],
): NoiDungTinNhan | null {
  if (messages.length === 0) return null

  const today = new Date()
  let best: NoiDungTinNhan | null = null
  let bestDistance = Infinity

  for (const message of messages) {
    const refDate = referenceDateOf(message, weekConfig)
    if (!refDate) continue

    const distance = Math.abs(today.getTime() - refDate.getTime())
    if (distance < bestDistance) {
      bestDistance = distance
      best = message
    }
  }

  return best || messages[0]
}

function referenceDateOf(message: NoiDungTinNhan, weekConfig: CauHinhTuan[]): Date | null {
  if (message.loai_ky === 'tuan' && message.tuan_so !== null) {
    const week = weekConfig.find((item) => item.tuan_so === message.tuan_so)
    return week ? parseIsoDate(week.tu_ngay) : null
  }

  if (message.loai_ky === 'thang' && message.thang !== null && message.nam !== null) {
    return new Date(message.nam, message.thang - 1, 15)
  }

  return null
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function formatKyLabel(message: NoiDungTinNhan): string {
  if (message.loai_ky === 'tuan') return `Tuần ${message.tuan_so ?? '?'}`
  return `Tháng ${message.thang ?? '?'}/${message.nam ?? '?'}`
}
