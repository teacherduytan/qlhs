import imageCompression from 'browser-image-compression'

const MAX_SIZE_MB = 0.4
const MAX_WIDTH_OR_HEIGHT = 1920
const PDF_CANH_BAO_BYTES = 5 * 1024 * 1024

export interface FileDaChuanBi {
  file: File
  canhBao: string | null
}

/** Nen anh phia client truoc khi upload (bat buoc theo docs/11-...); PDF giu nguyen, chi canh bao neu > ~5MB. */
export async function chuanBiFileTaiLen(file: File): Promise<FileDaChuanBi> {
  if (file.type === 'application/pdf') {
    return {
      file,
      canhBao:
        file.size > PDF_CANH_BAO_BYTES
          ? `File PDF "${file.name}" khá lớn (${formatKichThuoc(file.size)}), có thể tải lên chậm.`
          : null,
    }
  }

  if (!file.type.startsWith('image/')) {
    return { file, canhBao: null }
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      fileType: 'image/jpeg',
      useWebWorker: true,
    })
    const renamed = new File([compressed], renameToJpeg(file.name), { type: 'image/jpeg' })
    return { file: renamed, canhBao: null }
  } catch {
    return { file, canhBao: `Không nén được ảnh "${file.name}", đã dùng file gốc.` }
  }
}

function renameToJpeg(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const base = dot >= 0 ? fileName.slice(0, dot) : fileName
  return `${base}.jpg`
}

export function formatKichThuoc(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
