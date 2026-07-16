import { describe, expect, it } from 'vitest'
import type { DanhMucDiem } from '../../data/types'
import { checkRecordCatalogLinks } from './importCatalog'

const currentCatalog: DanhMucDiem[] = [
  item('NN07', 'NN', 'Không mang dụng cụ học tập', -1),
  item('NN08', 'NN', 'Không bao bìa, dán nhãn sách vở', -1),
  item('NN09', 'NN', 'Nói chuyện/phát biểu không đúng lúc trong giờ', -1),
  item('NN10', 'NN', 'Tự ý đổi chỗ ngồi khi chưa được cho phép', -1),
  item('NN11', 'NN', 'Không thuộc bài', -2),
  item('KT01', 'KT', 'Giơ tay xây dựng bài', 1),
]

describe('checkRecordCatalogLinks', () => {
  it.each([
    ['Không mang dụng cụ học tập (máy tính)', 'NN07'],
    ['Không mang máy tính', 'NN07'],
    ['Quên không mang vở', 'NN07'],
    ['[CẦN TẠO DANH MỤC] Không bao bìa, dán nhãn sách vở', 'NN08'],
    ['Phát biểu linh tinh', 'NN09'],
    ['Đổi chỗ ngồi', 'NN10'],
    ['Không thuộc bài', 'NN11'],
  ])('gợi ý mã hiện hành cho nội dung "%s"', (noiDung, expectedCode) => {
    const result = checkRecordCatalogLinks([record(noiDung)], currentCatalog)

    expect(result.missingCatalogItems).toEqual([])
    expect(result.autoMatchItems).toHaveLength(1)
    expect(result.autoMatchItems[0].catalogItem.ma_danh_muc).toBe(expectedCode)
    expect(result.blockingRowIndexes).toEqual([0])
  })

  it('không tự gợi ý mã NN08/NN09 cho lỗi không mang dụng cụ học tập', () => {
    const result = checkRecordCatalogLinks([record('Không mang dụng cụ học tập (máy tính)')], currentCatalog)

    expect(result.autoMatchItems[0].catalogItem.ma_danh_muc).toBe('NN07')
  })

  it('gom các dòng thiếu danh mục giống nhau vào cùng một mã đề xuất', () => {
    const result = checkRecordCatalogLinks(
      [
        record('Mang đồ chơi lạ vào lớp'),
        record('[CẦN TẠO DANH MỤC] Mang đồ chơi lạ vào lớp'),
      ],
      currentCatalog,
    )

    expect(result.autoMatchItems).toEqual([])
    expect(result.missingCatalogItems).toHaveLength(1)
    expect(result.missingCatalogItems[0].code).toBe('NN12')
    expect(result.missingCatalogItems[0].rowIndexes).toEqual([0, 1])
  })

  it('cho phép dòng học tập không có ma_danh_muc', () => {
    const result = checkRecordCatalogLinks(
      [
        {
          ...record('Được 9 điểm miệng Toán'),
          loai: 'hoc_tap',
        },
      ],
      currentCatalog,
    )

    expect(result.studyCount).toBe(1)
    expect(result.blockingRowIndexes).toEqual([])
    expect(result.errors).toEqual([])
  })
})

function item(
  ma_danh_muc: string,
  nhom: DanhMucDiem['nhom'],
  ten_muc: string,
  diem: number,
): DanhMucDiem {
  return {
    ma_danh_muc,
    nhom,
    ten_muc,
    diem,
    nghiem_trong: false,
    pham_vi: 'ca_nhan',
    mo_ta: null,
    de_xuat_xu_ly: null,
    ma_xu_ly_de_xuat: null,
  }
}

function record(noi_dung: string): Record<string, unknown> {
  return {
    ma_hs: 'HS001',
    ho_ten: 'Bùi Vân Anh',
    loai: 'ne_nep',
    ma_danh_muc: null,
    noi_dung,
  }
}
