export const CURRENT_YEAR = new Date().getFullYear()
export const MIN_YEAR = 1940

export const GENDER_LABEL = { male: '남성', female: '여성' }
export const CALENDAR_LABEL = { solar: '양력', lunar: '음력' }

export const PILLAR_KEYS = [
  { key: '년주', short: '년' },
  { key: '월주', short: '월' },
  { key: '일주', short: '일' },
  { key: '시주', short: '시' },
]

export const GUEST_DRAFT_KEY = 'saju-guest-draft'
export const PREVIEW_CUTOFF_HEADING = /사주에서\s*가장\s*특이.*눈에\s*띄는\s*점|특이.*눈에\s*띄는\s*점/
