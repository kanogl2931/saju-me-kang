import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { requestSajuInterpretation } from './services/gemini'
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

function formatBirthLabel(birthDate, birthTime) {
  if (!birthDate) return ''
  const [year, month, day] = birthDate.split('-')
  const time = (birthTime ?? '').slice(0, 5)
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${time}`
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
  const resultRef = useRef(null)

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

  const loadReadings = async () => {
    const { data, error: loadError } = await supabase
      .from('saju_readings')
      .select('id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      return
    }

    setReadings(data ?? [])
  }

  useEffect(() => {
    loadReadings()
  }, [])

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

  const resetForm = () => {
    setName('')
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBirthHour('')
    setBirthMinute('')
    setGender('')
    setCalendarType('')
    setSajuChart(null)
    setResult('')
    setError('')
    setSelectedId(null)
    setIsViewingSaved(false)
    setIsEditingSaved(false)
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

      const readingPayload = {
        name: name.trim(),
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar_type: calendarType,
        saju_chart: chart.formatted,
        result: cleanedResult,
      }

      const readingSelect =
        'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at'

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

      setSelectedId(saved.id)
      setReadings((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen((open) => !open)}
        aria-expanded={isSidebarOpen}
        aria-controls="readings-sidebar"
      >
        {isSidebarOpen ? '목록 닫기' : '저장된 사주'}
      </button>

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="사이드바 닫기"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        id="readings-sidebar"
        className={`readings-sidebar${isSidebarOpen ? ' open' : ''}`}
        aria-label="저장된 사주 목록"
      >
        <div className="sidebar-header">
          <h2>저장된 사주</h2>
          <p>이름을 누르면 결과가 열립니다</p>
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

      <div className="app">
        <header className="app-header">
          <h1>사주 해석</h1>
          <p>
            {isEditingSaved
              ? '저장된 사주를 수정한 뒤 다시 해석해 주세요'
              : '생년월일과 태어난 시간을 선택해 주세요'}
          </p>
        </header>

        {isViewingSaved && (sajuChart || result) && (
          <section className="saved-result-panel" ref={resultRef} aria-live="polite">
            <div className="saved-result-hero">
              <p className="saved-result-eyebrow">저장된 사주</p>
              <h2 className="saved-result-name">{name || '이름 없음'}</h2>
              <p className="saved-result-birth">
                {formatBirthLabel(birthDate, birthTime)}
              </p>
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

            {resultBlocks.length > 0 && (
              <div className="interpretation-block">
                <h3>사주 해석</h3>
                <ResultBody blocks={resultBlocks} />
              </div>
            )}

            <div className="saved-result-actions">
              <button type="button" className="edit-saved-btn" onClick={startEditSaved}>
                수정하기
              </button>
              <button type="button" className="clear-saved-btn" onClick={resetForm}>
                새 사주 입력하기
              </button>
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

        {error && <p className="error-message">{error}</p>}

        {isLoading && (
          <div className="loading-indicator" aria-live="polite">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span>사주를 해석하고 있습니다</span>
          </div>
        )}

        {!isViewingSaved && sajuChart && (
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

        {!isViewingSaved && result && (
          <section className="result-section">
            <h2>사주 해석</h2>
            <ResultBody blocks={resultBlocks} />
          </section>
        )}
      </div>
    </div>
  )
}

export default App
