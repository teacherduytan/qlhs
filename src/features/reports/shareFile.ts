// Tren di dong (Android Chrome, iOS Safari) navigator.share ho tro dinh kem
// file, mo bang chia se native cua he dieu hanh - cho phep gui thang file
// bao cao qua Zalo/Messenger/Telegram... thay vi phai tai ve roi tu dinh kem
// tay. Tren desktop (khong ho tro navigator.share voi file, hoac tu choi vi
// ly do bao mat/khong co ung dung nhan) tu dong quay lai cach tai file cu
// qua Blob URL + the <a download> nhu truoc.
export async function shareOrDownloadFile(
  blob: Blob,
  filename: string,
  mimeType: string,
  shareTitle: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: mimeType })

  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: shareTitle })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Nguoi dung tu dong huy hop thoai chia se - khong phai loi, khong can fallback tai ve.
        return 'shared'
      }
      // Cac loi khac (vi du trinh duyet tu choi giua chung) - roi xuong tai file binh thuong.
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
