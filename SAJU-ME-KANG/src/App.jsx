import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import sajuCatLoading from './assets/saju-cat-1.png'
import sajuCatResult from './assets/saju-cat-2.png'
import ProfileModal from './components/ProfileModal'
import { signInWithGoogle, signOut } from './services/auth'
import { requestSajuInterpretation } from './services/gemini'
import { fetchProfile, upsertProfile } from './services/profile'
import { supabase } from './services/supabase'
import { buildSajuPrompt } from './utils/buildSajuPrompt'
import { calculateSaju } from './utils/calculateSaju'
import { removeTautologicalParentheses } from './utils/removeTautologicalParentheses'

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1940

const GENDER_LABEL = { male: '남성', female: '여성' }
const CALENDAR_LABEL = { solar: '양력', lunar: '음력' }
const PILLAR_KEYS = [
  { key: '년주', short: '년' },
  { key: '월주', short: '월' },
  { key: '일주', short: '일' },
  { key: '시주', short: '시' },
]

function extractPillars(chartText) {
  if (!chartText) return []

  const pillars = []
  for (const { key, short } of PILLAR_KEYS) {
    const lineMatch = chartText.match(new RegExp(`${key}\\s*[:：]\\s*([^\\n,，]+)`))
    if (lineMatch) {
      pillars.push({ label: short, value: lineMatch[1].trim() })
    }
  }

  return pillars
}

function parseChartRows(chartText) {
  if (!chartText) return []

  return chartText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.search(/[:：]/)
      if (separatorIndex === -1) {
        return { label: '', value: line }
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      }
    })
    .filter((row) => !PILLAR_KEYS.some(({ key }) => row.label === key) || row.label === '')
}

function stripMarkdownMarkers(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()
}

const GUEST_DRAFT_KEY = 'saju-guest-draft'

function parseResultBlocks(text) {
  if (!text) return []

  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (/^---+$/.test(line)) {
        return [{ type: 'divider' }]
      }

      const boldHeading = line.match(/^\*\*(.+?)\*\*$/)
      if (boldHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(boldHeading[1]) }]
      }

      const bracketHeading = line.match(/^\[(.+?)\]$/)
      if (bracketHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(bracketHeading[1]) }]
      }

      const numberedHeading = line.match(/^\*\*\s*(\d+\.\s*.+?)\s*\*\*$/)
      if (numberedHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(numberedHeading[1]) }]
      }

      return [{ type: 'paragraph', text: stripMarkdownMarkers(line) }]
    })
}

function blockTextLength(block) {
  if (block.type === 'divider') return 0
  return block.text?.length ?? 0
}

/** 로그인 전 미리보기: 전체 해석의 약 절반만 공개 */
function splitBlocksForPreview(blocks, ratio = 0.5) {
  if (!blocks.length) {
    return { visible: [], locked: false }
  }

  const totalLength = blocks.reduce((sum, block) => sum + blockTextLength(block), 0)
  if (totalLength === 0) {
    return { visible: blocks, locked: false }
  }

  const targetLength = Math.max(1, Math.floor(totalLength * ratio))
  let visibleCount = 0
  let accumulated = 0

  for (let index = 0; index < blocks.length; index += 1) {
    accumulated += blockTextLength(blocks[index])
    visibleCount = index + 1
    if (accumulated >= targetLength) break
  }

  // 마지막 블록까지 다 보여주면 잠글 내용이 없음 → 최소 1블록은 가림
  if (visibleCount >= blocks.length && blocks.length > 1) {
    visibleCount = Math.max(1, Math.floor(blocks.length * ratio))
  }

  if (visibleCount >= blocks.length) {
    const [first] = blocks
    if (first?.type === 'paragraph' && first.text.length > 80) {
      const cut = Math.floor(first.text.length * ratio)
      return {
        visible: [{ ...first, text: `${first.text.slice(0, cut).trimEnd()}…` }],
        locked: true,
      }
    }
    return { visible: blocks, locked: false }
  }

  return {
    visible: blocks.slice(0, visibleCount),
    locked: restHasContent(blocks, visibleCount),
  }
}

function restHasContent(blocks, fromIndex) {
  return blocks.slice(fromIndex).some((block) => block.type !== 'divider')
}

function saveGuestDraft(draft) {
  try {
    sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // sessionStorage 사용 불가 시 무시
  }
}

function loadGuestDraft() {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearGuestDraft() {
  try {
    sessionStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // ignore
  }
}

function ResultBody({ blocks }) {
  if (!blocks.length) return null

  return (
    <div className="interpretation-body">
      {blocks.map((block, index) => {
        if (block.type === 'divider') {
          return <hr key={`divider-${index}`} className="result-divider" />
        }

        if (block.type === 'heading') {
          return (
            <h4 key={`heading-${index}`} className="result-subtitle">
              {block.text}
            </h4>
          )
        }

        return (
          <p key={`paragraph-${index}`} className="result-paragraph">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

function CatSpeechPanel({
  blocks,
  personName,
  locked = false,
  onLogin,
  isSigningIn = false,
  authError = '',
}) {
  if (!blocks.length) return null

  return (
    <div className="cat-speech-panel">
      <div className="cat-speech-figure">
        <img src={sajuCatResult} alt="사주 해석을 알려주는 고양이" className="cat-speech-image" />
      </div>
      <div className="cat-result-content">
        <p className="cat-speech-label">
          {personName ? `${personName}님 사주를 살펴봤다냥!` : '사주를 살펴봤다냥!'}
        </p>
        <div className={locked ? 'interpretation-preview' : undefined}>
          <ResultBody blocks={blocks} />
          {locked && (
            <div className="result-lock-gate">
              <div className="result-lock-fade" aria-hidden="true" />
              <div className="result-lock-card">
                <p className="result-lock-title">나머지 해석은 로그인 후 확인할 수 있어요</p>
                <p className="result-lock-desc">
                  Google로 로그인하면 전체 사주 해석과 저장 기능을 이용할 수 있습니다.
                </p>
                <button
                  type="button"
                  className="google-sign-in-btn"
                  onClick={onLogin}
                  disabled={isSigningIn}
                >
                  <span className="google-sign-in-icon" aria-hidden="true">
                    G
                  </span>
                  {isSigningIn ? 'Google로 이동 중...' : 'Google로 로그인하고 전체 보기'}
                </button>
                {authError && <p className="error-message auth-error">{authError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBirthLabel(birthDate, birthTime) {
  if (!birthDate) return ''
  const [year, month, day] = birthDate.split('-')
  const time = (birthTime ?? '').slice(0, 5)
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${time}`
}

function formatReadingDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function applyProfileFields(profile, setters) {
  if (!profile) return

  const [year = '', month = '', day = ''] = (profile.birth_date ?? '').split('-')
  const [hour = '', minute = ''] = (profile.birth_time ?? '').slice(0, 5).split(':')

  setters.setName(profile.name ?? '')
  setters.setBirthYear(year)
  setters.setBirthMonth(month ? String(Number(month)) : '')
  setters.setBirthDay(day ? String(Number(day)) : '')
  setters.setBirthHour(hour !== '' ? String(Number(hour)) : '')
  setters.setBirthMinute(minute !== '' ? String(Number(minute)) : '')
  setters.setGender(profile.gender ?? '')
  setters.setCalendarType(profile.calendar_type ?? '')
}

function App() {
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [birthMinute, setBirthMinute] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [sajuChart, setSajuChart] = useState(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isViewingSaved, setIsViewingSaved] = useState(false)
  const [isEditingSaved, setIsEditingSaved] = useState(false)

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isProfileRequired, setIsProfileRequired] = useState(false)

  const resultRef = useRef(null)
  const guestDraftHandledRef = useRef(false)

  const fieldSetters = {
    setName,
    setBirthYear,
    setBirthMonth,
    setBirthDay,
    setBirthHour,
    setBirthMinute,
    setGender,
    setCalendarType,
  }

  const years = useMemo(() => {
    const list = []
    for (let year = CURRENT_YEAR; year >= MIN_YEAR; year -= 1) {
      list.push(year)
    }
    return list
  }, [])

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])

  const daysInMonth = useMemo(() => {
    if (!birthYear || !birthMonth) return 31
    return new Date(Number(birthYear), Number(birthMonth), 0).getDate()
  }, [birthYear, birthMonth])

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  )

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])

  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      : ''

  const birthTime =
    birthHour !== '' && birthMinute !== ''
      ? `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`
      : ''

  const isFormComplete =
    name.trim() !== '' &&
    birthDate !== '' &&
    birthTime !== '' &&
    gender !== '' &&
    calendarType !== ''

  const chartText = sajuChart?.formatted ?? ''
  const pillars = useMemo(() => extractPillars(chartText), [chartText])
  const chartRows = useMemo(() => parseChartRows(chartText), [chartText])
  const resultBlocks = useMemo(() => parseResultBlocks(result), [result])
  const isLoggedIn = Boolean(session)
  const previewResult = useMemo(() => {
    if (isLoggedIn) {
      return { visible: resultBlocks, locked: false }
    }
    return splitBlocksForPreview(resultBlocks, 0.5)
  }, [isLoggedIn, resultBlocks])

  const googleDefaultName =
    session?.user?.user_metadata?.full_name ??
    session?.user?.user_metadata?.name ??
    ''

  const applyGuestDraft = (draft) => {
    if (!draft) return

    setName(draft.name ?? '')
    setBirthYear(draft.birthYear ?? '')
    setBirthMonth(draft.birthMonth ?? '')
    setBirthDay(draft.birthDay ?? '')
    setBirthHour(draft.birthHour ?? '')
    setBirthMinute(draft.birthMinute ?? '')
    setGender(draft.gender ?? '')
    setCalendarType(draft.calendarType ?? '')
    setSajuChart(draft.sajuChart ?? null)
    setResult(draft.result ?? '')
    setSelectedId(null)
    setIsViewingSaved(false)
    setIsEditingSaved(false)
    setError('')
  }

  const persistGuestDraft = (overrides = {}) => {
    saveGuestDraft({
      name: name.trim(),
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      gender,
      calendarType,
      sajuChart,
      result,
      ...overrides,
    })
  }

  const loadReadings = async () => {
    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select(
        'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at, user_id',
      )
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      return
    }

    setReadings(data ?? [])
  }

  const loadProfile = async (userId, { skipFormFill = false } = {}) => {
    setProfileLoading(true)
    setError('')

    try {
      const data = await fetchProfile(userId)
      setProfile(data)

      if (!data) {
        setIsProfileRequired(true)
        setShowProfileModal(true)
        return
      }

      setIsProfileRequired(false)
      setShowProfileModal(false)
      if (!skipFormFill) {
        applyProfileFields(data, fieldSetters)
      }
    } catch (profileError) {
      setError(`프로필을 불러오지 못했습니다: ${profileError.message}`)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return
      setSession(currentSession)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setReadings([])
      setProfile(null)
      setShowProfileModal(false)
      setIsProfileRequired(false)
      guestDraftHandledRef.current = false
      return
    }

    if (guestDraftHandledRef.current) {
      return
    }
    guestDraftHandledRef.current = true

    const draft = loadGuestDraft()
    const hasDraftResult = Boolean(draft?.result || draft?.sajuChart)

    if (hasDraftResult) {
      applyGuestDraft(draft)
    }

    ;(async () => {
      await loadProfile(session.user.id, { skipFormFill: hasDraftResult })
      await loadReadings()

      if (!hasDraftResult) return

      const profileData = await fetchProfile(session.user.id)
      if (!profileData) return

      try {
        const readingPayload = {
          user_id: session.user.id,
          name: (draft.name || profileData.name || '').trim(),
          birth_date:
            draft.birthYear && draft.birthMonth && draft.birthDay
              ? `${draft.birthYear}-${String(draft.birthMonth).padStart(2, '0')}-${String(draft.birthDay).padStart(2, '0')}`
              : profileData.birth_date,
          birth_time:
            draft.birthHour !== '' && draft.birthMinute !== ''
              ? `${String(draft.birthHour).padStart(2, '0')}:${String(draft.birthMinute).padStart(2, '0')}`
              : profileData.birth_time,
          gender: draft.gender || profileData.gender,
          calendar_type: draft.calendarType || profileData.calendar_type,
          saju_chart: draft.sajuChart?.formatted ?? '',
          result: draft.result ?? '',
        }

        if (!readingPayload.result && !readingPayload.saju_chart) {
          clearGuestDraft()
          return
        }

        const readingSelect =
          'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at, user_id'
        const { data: reading, error: saveError } = await supabase
          .from('saju_readings')
          .insert(readingPayload)
          .select(readingSelect)
          .single()

        if (!saveError && reading) {
          setSelectedId(reading.id)
          setReadings((prev) => [reading, ...prev.filter((item) => item.id !== reading.id)])
        }
      } catch (saveDraftError) {
        console.error(saveDraftError)
      } finally {
        clearGuestDraft()
      }
    })()
  }, [session])

  const clearResultState = () => {
    setSajuChart(null)
    setResult('')
    setError('')
    setSelectedId(null)
    setIsViewingSaved(false)
    setIsEditingSaved(false)
    clearGuestDraft()
  }

  const clearFormFields = () => {
    setName('')
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBirthHour('')
    setBirthMinute('')
    setGender('')
    setCalendarType('')
  }

  const resetForm = () => {
    clearResultState()
    if (profile) {
      applyProfileFields(profile, fieldSetters)
      return
    }
    clearFormFields()
  }

  const handleNewSaju = () => {
    clearResultState()
    clearFormFields()
    setIsSidebarOpen(false)
  }

  const hasSeenSajuResult = readings.length > 0 || Boolean(result) || Boolean(sajuChart)

  const handleGoogleSignIn = async () => {
    setAuthError('')
    setIsSigningIn(true)

    if (result || sajuChart) {
      persistGuestDraft()
    }

    try {
      await signInWithGoogle()
    } catch (signInError) {
      setAuthError(signInError.message)
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setAuthError('')

    try {
      await signOut()
      setProfile(null)
      resetForm()
    } catch (signOutError) {
      setAuthError(signOutError.message)
    }
  }

  const handleSaveProfile = async (profileInput) => {
    const saved = await upsertProfile(session.user.id, profileInput)
    setProfile(saved)
    setIsProfileRequired(false)
    setShowProfileModal(false)

    const draft = loadGuestDraft()
    if (draft?.result || draft?.sajuChart) {
      applyGuestDraft(draft)
      clearGuestDraft()

      try {
        const readingPayload = {
          user_id: session.user.id,
          name: (draft.name || saved.name || '').trim(),
          birth_date:
            draft.birthYear && draft.birthMonth && draft.birthDay
              ? `${draft.birthYear}-${String(draft.birthMonth).padStart(2, '0')}-${String(draft.birthDay).padStart(2, '0')}`
              : saved.birth_date,
          birth_time:
            draft.birthHour !== '' && draft.birthMinute !== ''
              ? `${String(draft.birthHour).padStart(2, '0')}:${String(draft.birthMinute).padStart(2, '0')}`
              : saved.birth_time,
          gender: draft.gender || saved.gender,
          calendar_type: draft.calendarType || saved.calendar_type,
          saju_chart: draft.sajuChart?.formatted ?? '',
          result: draft.result ?? '',
        }

        if (readingPayload.result || readingPayload.saju_chart) {
          const readingSelect =
            'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at, user_id'
          const { data: reading, error: saveError } = await supabase
            .from('saju_readings')
            .insert(readingPayload)
            .select(readingSelect)
            .single()

          if (!saveError && reading) {
            setSelectedId(reading.id)
            setReadings((prev) => [reading, ...prev.filter((item) => item.id !== reading.id)])
          }
        }
      } catch (saveDraftError) {
        console.error(saveDraftError)
      }

      return
    }

    applyProfileFields(saved, fieldSetters)
    clearResultState()
  }

  const openProfileEditor = () => {
    setIsProfileRequired(false)
    setShowProfileModal(true)
  }

  const handleDayChange = (value) => {
    const nextDay = Number(value)
    if (nextDay > daysInMonth) {
      setBirthDay(String(daysInMonth))
      return
    }
    setBirthDay(value)
  }

  const applyReading = (reading) => {
    setSelectedId(reading.id)
    setIsViewingSaved(true)
    setIsEditingSaved(false)
    setName(reading.name ?? '')

    const [year = '', month = '', day = ''] = (reading.birth_date ?? '').split('-')
    setBirthYear(year)
    setBirthMonth(month ? String(Number(month)) : '')
    setBirthDay(day ? String(Number(day)) : '')

    const [hour = '', minute = ''] = (reading.birth_time ?? '').slice(0, 5).split(':')
    setBirthHour(hour !== '' ? String(Number(hour)) : '')
    setBirthMinute(minute !== '' ? String(Number(minute)) : '')

    setGender(reading.gender ?? '')
    setCalendarType(reading.calendar_type ?? '')
    setSajuChart(reading.saju_chart ? { formatted: reading.saju_chart } : null)
    setResult(reading.result ?? '')
    setError('')
    setIsSidebarOpen(false)

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleSelectReading = (reading) => {
    applyReading(reading)
  }

  const startEditSaved = () => {
    setIsViewingSaved(false)
    setIsEditingSaved(true)
    setError('')
  }

  const handleDeleteReading = async (event, reading) => {
    event.stopPropagation()

    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', reading.id)

    if (deleteError) {
      setError(`삭제에 실패했습니다: ${deleteError.message}`)
      return
    }

    setReadings((prev) => prev.filter((item) => item.id !== reading.id))

    if (selectedId === reading.id) {
      resetForm()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (session && !profile) {
      setIsProfileRequired(true)
      setShowProfileModal(true)
      setError('먼저 프로필 정보를 저장해 주세요.')
      return
    }

    if (!isFormComplete) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setResult('')
    setSajuChart(null)
    const editingId = isEditingSaved && selectedId ? selectedId : null
    setIsViewingSaved(false)
    setIsEditingSaved(false)

    try {
      const chart = calculateSaju({
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
      setSajuChart(chart)

      const prompt = buildSajuPrompt({
        name: name.trim(),
        birthDate,
        birthTime,
        gender,
        calendarType,
        sajuChart: chart,
      })

      const interpretation = await requestSajuInterpretation(prompt)
      const cleanedResult = removeTautologicalParentheses(interpretation)
      setResult(cleanedResult)

      if (!session) {
        persistGuestDraft({
          sajuChart: chart,
          result: cleanedResult,
        })
        return
      }

      const readingPayload = {
        user_id: session.user.id,
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar_type: calendarType,
        saju_chart: chart.formatted,
        result: cleanedResult,
      }

      const readingSelect =
        'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at, user_id'

      const { data: saved, error: saveError } = editingId
        ? await supabase
            .from('saju_readings')
            .update(readingPayload)
            .eq('id', editingId)
            .select(readingSelect)
            .single()
        : await supabase.from('saju_readings').insert(readingPayload).select(readingSelect).single()

      if (saveError) {
        throw new Error(
          editingId
            ? `사주 결과 수정에 실패했습니다: ${saveError.message}`
            : `사주 결과 저장에 실패했습니다: ${saveError.message}`,
        )
      }

      clearGuestDraft()
      setSelectedId(saved.id)
      setReadings((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || (session && profileLoading && !profile && !showProfileModal)) {
    return (
      <div className="auth-screen">
        <p className="auth-loading">잠시만 기다려 주세요</p>
      </div>
    )
  }

  const userLabel = profile?.name || googleDefaultName || session?.user?.email || '사용자'

  return (
    <div className="app-shell">
      {isLoggedIn && (
        <ProfileModal
          open={showProfileModal}
          required={isProfileRequired}
          initialProfile={profile}
          defaultName={googleDefaultName}
          onSave={handleSaveProfile}
          onClose={() => {
            if (!isProfileRequired) setShowProfileModal(false)
          }}
        />
      )}

      {isLoggedIn && (
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsSidebarOpen((open) => !open)}
          aria-expanded={isSidebarOpen}
          aria-controls="readings-sidebar"
        >
          {isSidebarOpen ? '목록 닫기' : '저장된 사주'}
        </button>
      )}

      {isLoggedIn && isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="사이드바 닫기"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {isLoggedIn && (
        <aside
          id="readings-sidebar"
          className={`readings-sidebar${isSidebarOpen ? ' open' : ''}`}
          aria-label="저장된 사주 목록"
        >
          <div className="sidebar-header">
            <h2>저장된 사주</h2>
            <p>날짜를 누르면 결과가 열립니다</p>
            {hasSeenSajuResult && (
              <button type="button" className="sidebar-new-btn" onClick={handleNewSaju}>
                새 사주 입력
              </button>
            )}
          </div>
          <ul className="readings-list">
            {readings.length === 0 ? (
              <li className="readings-empty">아직 저장된 사주가 없습니다</li>
            ) : (
              readings.map((reading) => (
                <li key={reading.id} className="reading-row">
                  <button
                    type="button"
                    className={`reading-item${selectedId === reading.id ? ' active' : ''}`}
                    onClick={() => handleSelectReading(reading)}
                  >
                    <span className="reading-name">{reading.name}</span>
                    <span className="reading-date">{formatReadingDate(reading.created_at)}</span>
                  </button>
                  <button
                    type="button"
                    className="reading-delete"
                    aria-label={`${reading.name} 삭제`}
                    onClick={(event) => handleDeleteReading(event, reading)}
                  >
                    지우기
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      )}

      <div className="app">
        <div className="user-bar">
          <div className="user-bar-main">
            {isLoggedIn ? (
              <>
                <span className="user-label">{userLabel}</span>
                {profile && (
                  <span className="user-birth-hint">
                    {formatBirthLabel(profile.birth_date, profile.birth_time)}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="user-label">게스트로 이용 중</span>
                <span className="user-birth-hint">로그인하면 전체 해석과 저장이 가능합니다</span>
              </>
            )}
          </div>
          <div className="user-bar-actions">
            {isLoggedIn ? (
              <>
                <button type="button" className="profile-btn" onClick={openProfileEditor}>
                  프로필
                </button>
                <button type="button" className="sign-out-btn" onClick={handleSignOut}>
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                className="profile-btn"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
              >
                {isSigningIn ? '이동 중...' : '로그인'}
              </button>
            )}
          </div>
        </div>

        <header className="app-header">
          <div className="app-header-row">
            <div>
              <h1>사주 해석</h1>
              <p>
                {isEditingSaved
                  ? '저장된 사주를 수정한 뒤 다시 해석해 주세요'
                  : isLoggedIn
                    ? profile
                      ? '프로필 정보가 자동으로 채워져 있습니다'
                      : '프로필을 먼저 저장해 주세요'
                    : '생년월일을 입력하면 바로 사주를 해석해 드려요'}
              </p>
            </div>
            {hasSeenSajuResult && (
              <button type="button" className="new-saju-btn" onClick={handleNewSaju}>
                새 사주 입력
              </button>
            )}
          </div>
        </header>

        {isLoggedIn && profile && !isViewingSaved && (
          <section className="profile-summary" aria-label="내 프로필">
            <div className="profile-summary-text">
              <p className="profile-summary-eyebrow">내 사주 정보</p>
              <h2 className="profile-summary-name">{profile.name}</h2>
              <p className="profile-summary-birth">
                {formatBirthLabel(profile.birth_date, profile.birth_time)}
              </p>
              <div className="saved-result-meta">
                <span className="meta-chip">{GENDER_LABEL[profile.gender]}</span>
                <span className="meta-chip">{CALENDAR_LABEL[profile.calendar_type]}</span>
              </div>
            </div>
            <button type="button" className="profile-edit-link" onClick={openProfileEditor}>
              수정
            </button>
          </section>
        )}

        {isViewingSaved && (sajuChart || result) && (
          <section className="saved-result-panel" ref={resultRef} aria-live="polite">
            <div className="saved-result-hero">
              <p className="saved-result-eyebrow">저장된 사주</p>
              <h2 className="saved-result-name">{name || '이름 없음'}</h2>
              <p className="saved-result-birth">{formatBirthLabel(birthDate, birthTime)}</p>
              <div className="saved-result-meta">
                {gender && <span className="meta-chip">{GENDER_LABEL[gender]}</span>}
                {calendarType && (
                  <span className="meta-chip">{CALENDAR_LABEL[calendarType]}</span>
                )}
              </div>
            </div>

            {pillars.length > 0 && (
              <div className="pillar-grid" aria-label="사주 네 기둥">
                {pillars.map((pillar) => (
                  <div key={pillar.label} className="pillar-card">
                    <span className="pillar-label">{pillar.label}</span>
                    <span className="pillar-value">{pillar.value}</span>
                  </div>
                ))}
              </div>
            )}

            {chartRows.length > 0 && (
              <div className="chart-detail">
                <h3>사주 명식</h3>
                <dl className="chart-rows">
                  {chartRows.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="chart-row">
                      {row.label && <dt>{row.label}</dt>}
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {sajuChart && pillars.length === 0 && chartRows.length === 0 && (
              <div className="chart-detail">
                <h3>사주 명식</h3>
                <div className="result-text chart-text">{sajuChart.formatted}</div>
              </div>
            )}

            {previewResult.visible.length > 0 && (
              <div className="interpretation-block">
                <h3>사주 해석</h3>
                <CatSpeechPanel
                  blocks={previewResult.visible}
                  personName={name}
                  locked={previewResult.locked}
                  onLogin={handleGoogleSignIn}
                  isSigningIn={isSigningIn}
                  authError={authError}
                />
              </div>
            )}

            <div className="saved-result-actions">
              <button type="button" className="edit-saved-btn" onClick={startEditSaved}>
                수정하기
              </button>
              {hasSeenSajuResult && (
                <button type="button" className="clear-saved-btn" onClick={handleNewSaju}>
                  새 사주 입력
                </button>
              )}
            </div>
          </section>
        )}

        <form
          className={`saju-form${isViewingSaved ? ' form-collapsed' : ''}`}
          onSubmit={handleSubmit}
        >
          <div className="field">
            <label className="field-label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="field">
            <span className="field-label">생년월일</span>
            <span className="field-hint">연 · 월 · 일을 각각 선택하세요</span>
            <div className="datetime-group">
              <div className="date-row">
                <select
                  className="select-input"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  aria-label="출생 연도"
                >
                  <option value="">연도</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
                <select
                  className="select-input"
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  disabled={!birthYear}
                  aria-label="출생 월"
                >
                  <option value="">월</option>
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ))}
                </select>
                <select
                  className="select-input"
                  value={birthDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  disabled={!birthYear || !birthMonth}
                  aria-label="출생 일"
                >
                  <option value="">일</option>
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}일
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <span className="field-label">태어난 시간</span>
            <span className="field-hint">24시간 형식으로 선택하세요</span>
            <div className="time-row">
              <select
                className="select-input"
                value={birthHour}
                onChange={(e) => setBirthHour(e.target.value)}
                aria-label="태어난 시"
              >
                <option value="">시</option>
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}시
                  </option>
                ))}
              </select>
              <select
                className="select-input"
                value={birthMinute}
                onChange={(e) => setBirthMinute(e.target.value)}
                aria-label="태어난 분"
              >
                <option value="">분</option>
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {String(minute).padStart(2, '0')}분
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <span className="field-label">성별</span>
            <div className="segment-group" role="group" aria-label="성별 선택">
              <button
                type="button"
                className={`segment-btn${gender === 'male' ? ' active' : ''}`}
                onClick={() => setGender('male')}
                aria-pressed={gender === 'male'}
              >
                남성
              </button>
              <button
                type="button"
                className={`segment-btn${gender === 'female' ? ' active' : ''}`}
                onClick={() => setGender('female')}
                aria-pressed={gender === 'female'}
              >
                여성
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field-label">양력 / 음력</span>
            <div className="segment-group" role="group" aria-label="양력 음력 선택">
              <button
                type="button"
                className={`segment-btn${calendarType === 'solar' ? ' active' : ''}`}
                onClick={() => setCalendarType('solar')}
                aria-pressed={calendarType === 'solar'}
              >
                양력
              </button>
              <button
                type="button"
                className={`segment-btn${calendarType === 'lunar' ? ' active' : ''}`}
                onClick={() => setCalendarType('lunar')}
                aria-pressed={calendarType === 'lunar'}
              >
                음력
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading || !isFormComplete}>
            {isLoading
              ? isEditingSaved
                ? '수정 중...'
                : '해석 중...'
              : isEditingSaved
                ? '사주 수정하기'
                : '사주 해석하기'}
          </button>
        </form>

        {(error || authError) && <p className="error-message">{error || authError}</p>}

        {isLoading && (
          <div className="cat-loading" aria-live="polite">
            <img
              src={sajuCatLoading}
              alt="사주를 해석 중인 고양이"
              className="cat-loading-image"
            />
            <div className="cat-loading-bubble">
              <p className="cat-loading-title">사주를 보고 있다냥!</p>
              <p className="cat-loading-text">조금만 기다리라냥.</p>
              <div className="cat-loading-dots" aria-hidden="true">
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </div>
            </div>
          </div>
        )}

        {!isViewingSaved && !isLoading && sajuChart && (
          <section className="result-section chart-section" ref={resultRef}>
            <h2>사주 명식</h2>
            {pillars.length > 0 && (
              <div className="pillar-grid" aria-label="사주 네 기둥">
                {pillars.map((pillar) => (
                  <div key={pillar.label} className="pillar-card">
                    <span className="pillar-label">{pillar.label}</span>
                    <span className="pillar-value">{pillar.value}</span>
                  </div>
                ))}
              </div>
            )}
            {chartRows.length > 0 ? (
              <dl className="chart-rows">
                {chartRows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="chart-row">
                    {row.label && <dt>{row.label}</dt>}
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="result-text chart-text">{sajuChart.formatted}</div>
            )}
          </section>
        )}

        {!isViewingSaved && !isLoading && result && (
          <section className="result-section cat-result-section">
            <h2>사주 해석</h2>
            <CatSpeechPanel
              blocks={previewResult.visible}
              personName={name}
              locked={previewResult.locked}
              onLogin={handleGoogleSignIn}
              isSigningIn={isSigningIn}
              authError={authError}
            />
          </section>
        )}
      </div>
    </div>
  )
}

export default App
