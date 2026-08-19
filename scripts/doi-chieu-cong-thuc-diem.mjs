// Script doi chieu 1 lan: cong thuc diem CU (truoc khi cau hinh hoa, xem lich su
// git cua src/features/scoring/scoring.ts truoc commit lien quan den
// docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md) vs cong thuc MOI (dang chay
// trong scoring.ts hien tai, doc tham so tu Supabase). Xem huong dan §7 muc 1.
//
// Chay: node --env-file=.env scripts/doi-chieu-cong-thuc-diem.mjs
// Can dang nhap giao vien that (RLS chi cho phep role "authenticated" doc du lieu):
//   TEACHER_EMAIL=... TEACHER_PASSWORD=... node --env-file=.env scripts/doi-chieu-cong-thuc-diem.mjs
//
// Xuat: file CSV doi-chieu-diem-<timestamp>.csv trong thu muc goc du an, kem tom tat
// so hoc sinh/tuan doi xep loai in ra console.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Thieu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Chay voi: node --env-file=.env scripts/doi-chieu-cong-thuc-diem.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  if (process.env.TEACHER_EMAIL && process.env.TEACHER_PASSWORD) {
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.TEACHER_EMAIL,
      password: process.env.TEACHER_PASSWORD,
    })
    if (error) {
      console.error('Dang nhap giao vien that bai:', error.message)
      process.exit(1)
    }
  }

  const [students, catalog, records, thanhPhanCfg, heSoCfg, nguongCfg] = await Promise.all([
    fetchAll('hoc_sinh'),
    fetchAll('danh_muc_diem'),
    fetchAll('ghi_nhan'),
    fetchAll('diem_cau_hinh_thanh_phan'),
    fetchAll('diem_cau_hinh_he_so_dieu_kien'),
    fetchAll('diem_nguong_xep_loai'),
  ])

  const studentByMaHs = new Map(students.map((s) => [s.ma_hs, s]))
  const catalogByCode = new Map(catalog.map((c) => [c.ma_danh_muc, c]))

  const pairs = new Set()
  for (const r of records) {
    if (r.ma_hs) pairs.add(`${r.ma_hs}|${r.tuan_so}`)
  }

  const rows = []
  let soDoiXepLoai = 0
  let soTangDiem = 0
  let soGiamDiem = 0

  for (const pair of pairs) {
    const [maHs, tuanSoStr] = pair.split('|')
    const tuanSo = Number(tuanSoStr)
    const student = studentByMaHs.get(maHs)
    if (!student) continue

    const studentRecords = records.filter((r) => r.ma_hs === maHs && r.tuan_so === tuanSo)

    const cu = tinhDiemCu(studentRecords, catalogByCode, student)
    const moi = tinhDiemMoi(studentRecords, catalogByCode, student, thanhPhanCfg, heSoCfg, nguongCfg)

    const doiXepLoai = cu.xepLoai !== moi.xepLoai
    if (doiXepLoai) soDoiXepLoai += 1
    if (moi.diem > cu.diem) soTangDiem += 1
    if (moi.diem < cu.diem) soGiamDiem += 1

    rows.push({
      ma_hs: maHs,
      ho_ten: `${student.ho} ${student.ten}`,
      tuan_so: tuanSo,
      diem_cu: cu.diem,
      xep_loai_cu: cu.xepLoai,
      diem_moi: moi.diem,
      xep_loai_moi: moi.xepLoai,
      co_doi: doiXepLoai ? 'CO' : '',
    })
  }

  rows.sort((a, b) => (a.ma_hs === b.ma_hs ? a.tuan_so - b.tuan_so : a.ma_hs.localeCompare(b.ma_hs)))

  const header = 'ma_hs,ho_ten,tuan_so,diem_cu,xep_loai_cu,diem_moi,xep_loai_moi,co_doi_xep_loai'
  const csv = [header, ...rows.map((r) =>
    [r.ma_hs, `"${r.ho_ten}"`, r.tuan_so, r.diem_cu, r.xep_loai_cu, r.diem_moi, r.xep_loai_moi, r.co_doi].join(','),
  )].join('\n')

  const outFile = `doi-chieu-diem-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  writeFileSync(outFile, csv, 'utf8')

  console.log(`Da doi chieu ${rows.length} cap (hoc sinh, tuan).`)
  console.log(`So cap DOI xep loai: ${soDoiXepLoai}`)
  console.log(`So cap diem TANG (cong thuc moi > cu): ${soTangDiem}`)
  console.log(`So cap diem GIAM (cong thuc moi < cu): ${soGiamDiem}`)
  console.log(`Ket qua chi tiet: ${outFile}`)
}

async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    console.error(`Khong doc duoc bang ${table}:`, error.message)
    process.exit(1)
  }
  return data || []
}

// ===================== Cong thuc CU (truoc khi cau hinh hoa) =====================

function tinhDiemCu(records, catalogByCode, student) {
  const components = {}
  for (const nhom of ['CC', 'VS', 'NN', 'KL']) {
    const delta = records.reduce((sum, record) => {
      const item = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : null
      if (!item || item.nhom !== nhom || item.pham_vi !== 'ca_nhan') return sum
      const baseScore = typeof record.diem_cong_tru === 'number' ? record.diem_cong_tru : item.diem
      const occurrenceCount = Math.max(1, record.so_lan || 1)
      const multiplier = student.la_co_do && baseScore < 0 ? 2 : 1
      return sum + baseScore * occurrenceCount * multiplier
    }, 0)
    components[nhom] = Math.min(100, Math.max(0, round2(100 + delta)))
  }

  const studyScores = records
    .filter((r) => r.loai === 'hoc_tap')
    .map((r) => r.diem_so_mon)
    .filter((v) => typeof v === 'number')
  const diemHocTap = studyScores.length === 0 ? null : (studyScores.reduce((a, b) => a + b, 0) / studyScores.length) * 2
  const hasStudyScore = diemHocTap !== null

  const diemTongHop = hasStudyScore
    ? (components.CC + components.VS + components.NN + components.KL + diemHocTap) / 6
    : (components.CC + components.VS + components.NN + components.KL) / 4

  let xepLoai
  if (hasStudyScore) {
    xepLoai = diemTongHop >= 60 ? 'Tốt' : diemTongHop >= 45 ? 'Khá' : diemTongHop >= 30 ? 'Trung bình' : 'Yếu'
  } else {
    xepLoai = diemTongHop >= 90 ? 'Tốt' : diemTongHop >= 70 ? 'Khá' : diemTongHop >= 50 ? 'Trung bình' : 'Yếu'
  }

  return { diem: round2(diemTongHop), xepLoai }
}

// ===================== Cong thuc MOI (dang chay trong scoring.ts) =====================
// Sao chep pipeline tu src/features/scoring/scoring.ts de khong phai import module TS
// tu script Node thuan .mjs. Neu sua cong thuc trong scoring.ts, nho sua lai o day
// truoc khi chay doi chieu lan sau.

const DEFAULT_THANH_PHAN = [
  { ma_thanh_phan: 'CC', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'CC', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 1 },
  { ma_thanh_phan: 'VS', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'VS', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 2 },
  { ma_thanh_phan: 'NN', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'NN', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 3 },
  { ma_thanh_phan: 'KL', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'KL', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 4 },
  { ma_thanh_phan: 'HT', loai_tinh: 'trung_binh_diem_so', nhom_diem_lien_ket: null, thang_goc_min: 0, thang_goc_max: 10, he_so_chuan_hoa: 10, trong_so: 2, bat_buoc: false, dang_bat: true, thu_tu: 5 },
]

const DEFAULT_HE_SO_DIEU_KIEN = [
  { ma_thanh_phan: null, dieu_kien_hoc_sinh: 'la_co_do', chi_ap_dung_khi_am: true, he_so: 2, dang_bat: true },
]

const DEFAULT_NGUONG = [
  { ma_xep_loai: 'yeu', ten_hien_thi: 'Yếu', diem_toi_thieu: 0, thu_tu: 1 },
  { ma_xep_loai: 'trung_binh', ten_hien_thi: 'Trung bình', diem_toi_thieu: 50, thu_tu: 2 },
  { ma_xep_loai: 'kha', ten_hien_thi: 'Khá', diem_toi_thieu: 70, thu_tu: 3 },
  { ma_xep_loai: 'tot', ten_hien_thi: 'Tốt', diem_toi_thieu: 90, thu_tu: 4 },
]

function tinhDiemMoi(records, catalogByCode, student, thanhPhanCfgDb, heSoCfgDb, nguongCfgDb) {
  const thanhPhanCfg = thanhPhanCfgDb.length > 0 ? thanhPhanCfgDb : DEFAULT_THANH_PHAN
  const heSoCfg = heSoCfgDb.length > 0 ? heSoCfgDb : DEFAULT_HE_SO_DIEU_KIEN
  const nguongCfg = nguongCfgDb.length > 0 ? nguongCfgDb : DEFAULT_NGUONG

  let tuSo = 0
  let mauSo = 0

  for (const t of [...thanhPhanCfg].filter((t) => t.dang_bat).sort((a, b) => a.thu_tu - b.thu_tu)) {
    const { raw, coDuLieu } = tinhGiaTriTho(t, records, catalogByCode, student, heSoCfg)
    if (!t.bat_buoc && !coDuLieu) continue
    const chuanHoa = round2((raw ?? 0) * t.he_so_chuan_hoa)
    tuSo += t.trong_so * chuanHoa
    mauSo += t.trong_so
  }

  const diemTongHop = mauSo > 0 ? tuSo / mauSo : 0
  const sapXep = [...nguongCfg].sort((a, b) => b.diem_toi_thieu - a.diem_toi_thieu)
  const dat = sapXep.find((n) => diemTongHop >= n.diem_toi_thieu)
  const xepLoai = dat?.ten_hien_thi ?? sapXep[sapXep.length - 1]?.ten_hien_thi ?? 'Yếu'

  return { diem: round2(diemTongHop), xepLoai }
}

function tinhGiaTriTho(t, records, catalogByCode, student, heSoCfg) {
  if (t.loai_tinh === 'tich_luy_danh_muc') {
    const delta = records.reduce((sum, record) => {
      const item = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : null
      if (!item || item.nhom !== t.nhom_diem_lien_ket || item.pham_vi !== 'ca_nhan') return sum
      const baseScore = typeof record.diem_cong_tru === 'number' ? record.diem_cong_tru : item.diem
      const occurrenceCount = Math.max(1, record.so_lan || 1)
      const multiplier = heSoCfg.reduce((m, dk) => {
        if (!dk.dang_bat) return m
        if (dk.ma_thanh_phan !== null && dk.ma_thanh_phan !== t.ma_thanh_phan) return m
        if (dk.chi_ap_dung_khi_am && !(baseScore < 0)) return m
        if (student[dk.dieu_kien_hoc_sinh] !== true) return m
        return m * dk.he_so
      }, 1)
      return sum + baseScore * occurrenceCount * multiplier
    }, 0)
    return { raw: clamp(t.thang_goc_max + delta, t.thang_goc_min, t.thang_goc_max), coDuLieu: true }
  }

  const studyScores = records
    .filter((r) => r.loai === 'hoc_tap')
    .map((r) => r.diem_so_mon)
    .filter((v) => typeof v === 'number')
  if (studyScores.length === 0) return { raw: null, coDuLieu: false }
  const trungBinh = studyScores.reduce((a, b) => a + b, 0) / studyScores.length
  return { raw: clamp(trungBinh, t.thang_goc_min, t.thang_goc_max), coDuLieu: true }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, round2(value)))
}

function round2(value) {
  return Math.round(value * 100) / 100
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
