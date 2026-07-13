const TEACHER_SESSION_KEY = 'qlhs_teacher_session_token'

export function getTeacherSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(TEACHER_SESSION_KEY)
}

export function setTeacherSessionToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(TEACHER_SESSION_KEY, token)
}

export function clearTeacherSessionToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(TEACHER_SESSION_KEY)
}
