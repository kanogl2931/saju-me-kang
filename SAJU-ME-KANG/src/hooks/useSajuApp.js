import { useEffect, useMemo, useRef, useState } from 'react'
import { CURRENT_YEAR, MIN_YEAR } from '../constants/saju'
import { consumeLoginSource, rememberLoginSource, setUserProperties, trackEvent } from '../services/analytics'
import { signInWithGoogle, signOut } from '../services/auth'
import { requestSajuInterpretation } from '../services/gemini'
import { fetchProfile, upsertProfile } from '../services/profile'
import {
  READING_SELECT,
  buildShareUrl,
  createSharedReading,
  ensureReadingShareToken,
  fetchSharedReading,
} from '../services/share'
import { fetchSajuGenerationCount, incrementSajuGenerationCount } from '../services/stats'
import { supabase } from '../services/supabase'
import { applyProfileFields } from '../utils/applyProfileFields'
import { buildSajuPrompt } from '../utils/buildSajuPrompt'
import { calculateSaju } from '../utils/calculateSaju'
import { extractPillars, parseChartRows } from '../utils/chartParsers'
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from '../utils/guestDraft'
import { removeTautologicalParentheses } from '../utils/removeTautologicalParentheses'
import { parseResultBlocks, splitBlocksForPreview } from '../utils/resultBlocks'

export function useSajuApp() {
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
  const [shareToken, setShareToken] = useState(null)
  const [isSharing, setIsSharing] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [isSharedView, setIsSharedView] = useState(false)
  const [generationCount, setGenerationCount] = useState(null)

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
    return splitBlocksForPreview(resultBlocks)
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
    setShareToken(draft.shareToken ?? null)
    setSelectedId(draft.selectedId ?? null)
    setIsViewingSaved(false)
    setIsEditingSaved(false)
    setIsSharedView(false)
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
      shareToken,
      selectedId,
      ...overrides,
    })
  }

  const loadReadings = async () => {
    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select(READING_SELECT)
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
      setUserProperties({ logged_in: currentSession ? 'true' : 'false' })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      setUserProperties({ logged_in: nextSession ? 'true' : 'false' })

      if (event === 'SIGNED_IN') {
        const source = consumeLoginSource()
        if (source) {
          trackEvent('login', { method: 'google', login_source: source })
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    fetchSajuGenerationCount()
      .then((count) => {
        if (isMounted) setGenerationCount(count)
      })
      .catch(() => {
        if (isMounted) setGenerationCount(null)
      })

    return () => {
      isMounted = false
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

        const readingSelect = READING_SELECT
        const { data: reading, error: saveError } = await supabase
          .from('saju_readings')
          .insert(readingPayload)
          .select(readingSelect)
          .single()

        if (!saveError && reading) {
          setSelectedId(reading.id)
          setShareToken(reading.share_token ?? null)
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
    setShareToken(null)
    setShareMessage('')
    setIsViewingSaved(false)
    setIsEditingSaved(false)
    setIsSharedView(false)
    clearGuestDraft()

    const url = new URL(window.location.href)
    if (url.searchParams.has('share')) {
      url.searchParams.delete('share')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
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
    trackEvent('saju_new')
    clearResultState()
    clearFormFields()
    setIsSidebarOpen(false)
  }

  const hasSeenSajuResult = readings.length > 0 || Boolean(result) || Boolean(sajuChart)

  const handleGoogleSignIn = async (loginSource = 'unknown') => {
    const source = typeof loginSource === 'string' ? loginSource : 'unknown'
    trackEvent('login_click', { method: 'google', login_source: source })
    rememberLoginSource(source)

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
    trackEvent('logout')
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
    const isFirst = isProfileRequired
    const saved = await upsertProfile(session.user.id, profileInput)
    trackEvent('profile_save', { is_first: isFirst })
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
          const readingSelect = READING_SELECT
          const { data: reading, error: saveError } = await supabase
            .from('saju_readings')
            .insert(readingPayload)
            .select(readingSelect)
            .single()

          if (!saveError && reading) {
            setSelectedId(reading.id)
            setShareToken(reading.share_token ?? null)
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
    trackEvent('profile_open')
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

  const applyReading = (reading, { shared = false } = {}) => {
    setSelectedId(reading.id)
    setShareToken(reading.share_token ?? null)
    setIsViewingSaved(true)
    setIsEditingSaved(false)
    setIsSharedView(shared)
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
    setShareMessage('')
    setIsSidebarOpen(false)

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleSelectReading = (reading) => {
    trackEvent('saju_view_saved')
    applyReading(reading)
  }

  const copyShareLink = async (token) => {
    const shareUrl = buildShareUrl(token)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('공유 링크를 복사했어요')
    } catch {
      window.prompt('아래 링크를 복사하세요', shareUrl)
      setShareMessage('공유 링크를 준비했어요')
    }
  }

  const handleShareResult = async () => {
    if (!result && !sajuChart) return

    setIsSharing(true)
    setShareMessage('')
    setError('')

    try {
      let token = shareToken

      if (!token && selectedId && session) {
        const reading = await ensureReadingShareToken(selectedId)
        token = reading.share_token
        setShareToken(token)
        setReadings((prev) =>
          prev.map((item) => (item.id === reading.id ? { ...item, ...reading } : item)),
        )
      }

      if (!token) {
        if (!isFormComplete) {
          throw new Error('공유하려면 이름·생년월일·시간·성별·양력/음력이 필요해요.')
        }

        const created = await createSharedReading({
          name: name.trim(),
          birth_date: birthDate,
          birth_time: birthTime,
          gender,
          calendar_type: calendarType,
          saju_chart: sajuChart?.formatted ?? '',
          result,
        })

        token = created.share_token
        setShareToken(token)
        setSelectedId(created.id)
        persistGuestDraft({
          shareToken: token,
          selectedId: created.id,
          sajuChart,
          result,
        })
      }

      const url = new URL(window.location.href)
      url.searchParams.set('share', token)
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`)

      await copyShareLink(token)
      trackEvent('share', {
        method: 'copy_link',
        content_type: 'saju_result',
        logged_in: Boolean(session),
      })
    } catch (shareError) {
      setError(`공유에 실패했습니다: ${shareError.message}`)
      trackEvent('share_error')
    } finally {
      setIsSharing(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('share')
    if (!token) return

    let cancelled = false

    ;(async () => {
      try {
        const reading = await fetchSharedReading(token)
        if (cancelled) return
        applyReading(reading, { shared: true })
        trackEvent('saju_view_shared')
      } catch (shareLoadError) {
        if (!cancelled) {
          setError(`공유 결과를 불러오지 못했습니다: ${shareLoadError.message}`)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const startEditSaved = () => {
    trackEvent('saju_edit')
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

    trackEvent('saju_delete')
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

    const isEdit = Boolean(isEditingSaved && selectedId)
    trackEvent('saju_generate', {
      logged_in: Boolean(session),
      is_edit: isEdit,
      gender,
      calendar_type: calendarType,
    })

    setIsLoading(true)
    setError('')
    setResult('')
    setSajuChart(null)
    setShareToken(null)
    setShareMessage('')
    setIsSharedView(false)
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
      trackEvent('saju_generate_success', {
        logged_in: Boolean(session),
        is_edit: Boolean(editingId),
      })

      if (!editingId) {
        try {
          const nextCount = await incrementSajuGenerationCount()
          setGenerationCount(nextCount)
        } catch {
          // 카운터 실패는 해석 흐름을 막지 않음
        }
      }

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

      const readingSelect = READING_SELECT

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
      setShareToken(saved.share_token ?? null)
      setReadings((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])
    } catch (requestError) {
      setError(requestError.message)
      trackEvent('saju_generate_error', { logged_in: Boolean(session) })
    } finally {
      setIsLoading(false)
    }
  }

  const isBootstrapping =
    authLoading || (session && profileLoading && !profile && !showProfileModal)

  const userLabel = profile?.name || googleDefaultName || session?.user?.email || '사용자'

  return {
    isBootstrapping,
    isLoggedIn,
    showProfileModal,
    isProfileRequired,
    profile,
    googleDefaultName,
    handleSaveProfile,
    setShowProfileModal,
    isSidebarOpen,
    setIsSidebarOpen,
    readings,
    selectedId,
    hasSeenSajuResult,
    handleNewSaju,
    handleSelectReading,
    handleDeleteReading,
    userLabel,
    isSigningIn,
    openProfileEditor,
    handleSignOut,
    handleGoogleSignIn,
    isEditingSaved,
    generationCount,
    isViewingSaved,
    resultRef,
    isSharedView,
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    pillars,
    chartRows,
    sajuChart,
    previewResult,
    isSharing,
    result,
    shareMessage,
    authError,
    handleShareResult,
    startEditSaved,
    isLoading,
    isFormComplete,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    years,
    months,
    days,
    hours,
    minutes,
    setName,
    setBirthYear,
    setBirthMonth,
    handleDayChange,
    setBirthHour,
    setBirthMinute,
    setGender,
    setCalendarType,
    handleSubmit,
    error,
  }
}
