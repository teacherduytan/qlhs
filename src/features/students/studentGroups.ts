export const STUDENT_GROUP_BY_ID: Record<string, number> = {
  HS004: 1,
  HS025: 1,
  HS016: 1,
  HS021: 1,
  HS028: 1,
  HS009: 1,
  HS023: 1,
  HS024: 1,
  HS018: 1,
  HS035: 1,

  HS032: 2,
  HS011: 2,
  HS019: 2,
  HS027: 2,
  HS022: 2,
  HS001: 2,
  HS020: 2,
  HS003: 2,
  HS008: 2,
  HS014: 2,

  HS007: 3,
  HS029: 3,
  HS013: 3,
  HS034: 3,
  HS015: 3,
  HS033: 3,
  HS036: 3,
  HS017: 3,
  HS002: 3,
}

export function getStudentGroup(maHs: string): number | null {
  return STUDENT_GROUP_BY_ID[maHs] || null
}
