import type { NoiDungTinNhan } from '../../data/types'

// "Hien tai" = ban ghi da_duyet=true co created_at MOI NHAT - moi lan import
// la 1 ban ghi moi (khong upsert), lich su hinh thanh tu nhien qua nhieu lan
// import ma khong can khai bao "day la ky nao".
export function findCurrentMessage(messages: NoiDungTinNhan[]): NoiDungTinNhan | null {
  const approved = messages.filter((message) => message.da_duyet)
  if (approved.length === 0) return null

  return [...approved].sort((left, right) => (left.created_at < right.created_at ? 1 : -1))[0]
}

export function formatMessageTimestamp(message: NoiDungTinNhan): string {
  const date = new Date(message.created_at)
  if (Number.isNaN(date.getTime())) return message.created_at

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
