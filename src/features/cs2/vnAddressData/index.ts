// Du lieu don vi hanh chinh Viet Nam sau sap nhap 2025 (34 tinh/thanh pho,
// khong con cap quan/huyen - chi con Tinh/Thanh pho -> Xa/Phuong) - nguon:
// https://github.com/zuydd/vn-geo (du lieu cong khai, thu thap thu cong +
// AI ho tro nen co the con sai sot le, uu tien dung de goi y/chuan hoa dau
// vao, khong dung de doi soat phap ly tuyet doi).
//
// Import dong (khong static import o dau file) de 2 file JSON nay (~250KB)
// chi tai khi thuc su can (trang cong khai Cs2LookupPage khi den buoc dien
// dia chi), khong lam nang bundle chinh cho nguoi dung khac cua app.

export interface VnProvince {
  code: string
  name: string
  fullName: string
}

export interface VnWard {
  code: string
  name: string
  type: 'ward' | 'commune'
  provinceCode: string
}

let cache: { provinces: VnProvince[]; wards: VnWard[] } | null = null

export async function loadVnAddressData(): Promise<{ provinces: VnProvince[]; wards: VnWard[] }> {
  if (cache) return cache
  const [provincesModule, wardsModule] = await Promise.all([import('./provinces.json'), import('./wards.json')])
  cache = {
    provinces: (provincesModule.default as VnProvince[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    wards: wardsModule.default as VnWard[],
  }
  return cache
}

export function wardLabel(ward: VnWard): string {
  return `${ward.type === 'ward' ? 'Phường' : 'Xã'} ${ward.name}`
}

// Sap "Phuong" rieng, "Xa" rieng (moi nhom tu A-Z) thay vi tron lan theo ten
// - giup danh sach de do khi 1 tinh/thanh co ca phuong lan xa.
export function wardsByProvince(wards: VnWard[], provinceCode: string): VnWard[] {
  return wards
    .filter((ward) => ward.provinceCode === provinceCode)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'ward' ? -1 : 1
      return a.name.localeCompare(b.name, 'vi')
    })
}
