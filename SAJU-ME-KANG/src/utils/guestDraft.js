import { GUEST_DRAFT_KEY } from '../constants/saju'

export function saveGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // sessionStorage 사용 불가 시 무시
  }
}

export function loadGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}
