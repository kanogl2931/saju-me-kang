import { useMemo, useState } from 'react'
import './App.css'
import { requestSajuInterpretation } from './services/gemini'
import { buildSajuPrompt } from './utils/buildSajuPrompt'
import { calculateSaju } from './utils/calculateSaju'
import { removeTautologicalParentheses } from './utils/removeTautologicalParentheses'

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1940

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

  const handleDayChange = (value) => {
    const nextDay = Number(value)
    if (nextDay > daysInMonth) {
      setBirthDay(String(daysInMonth))
      return
    }
    setBirthDay(value)
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
      setResult(removeTautologicalParentheses(interpretation))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>사주 입력</h1>
        <p>생년월일과 태어난 시간을 선택해 주세요</p>
      </header>

      <form className="saju-form" onSubmit={handleSubmit}>
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
          {isLoading ? '해석 중...' : '사주 해석하기'}
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

      {sajuChart && (
        <section className="result-section chart-section">
          <h2>사주 명식</h2>
          <div className="result-text chart-text">{sajuChart.formatted}</div>
        </section>
      )}

      {result && (
        <section className="result-section">
          <h2>사주 해석</h2>
          <div className="result-text">{result}</div>
        </section>
      )}
    </div>
  )
}

export default App
