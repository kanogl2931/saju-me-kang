import { useEffect, useMemo, useState } from 'react'

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1940

function splitDate(birthDate) {
  if (!birthDate) return { year: '', month: '', day: '' }
  const [year = '', month = '', day = ''] = birthDate.split('-')
  return {
    year,
    month: month ? String(Number(month)) : '',
    day: day ? String(Number(day)) : '',
  }
}

function splitTime(birthTime) {
  if (!birthTime) return { hour: '', minute: '' }
  const [hour = '', minute = ''] = birthTime.slice(0, 5).split(':')
  return {
    hour: hour !== '' ? String(Number(hour)) : '',
    minute: minute !== '' ? String(Number(minute)) : '',
  }
}

export default function ProfileModal({
  open,
  required = false,
  initialProfile = null,
  defaultName = '',
  onSave,
  onClose,
}) {
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [birthMinute, setBirthMinute] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

  useEffect(() => {
    if (!open) return

    const dateParts = splitDate(initialProfile?.birth_date)
    const timeParts = splitTime(initialProfile?.birth_time)

    setName(initialProfile?.name ?? defaultName ?? '')
    setBirthYear(dateParts.year)
    setBirthMonth(dateParts.month)
    setBirthDay(dateParts.day)
    setBirthHour(timeParts.hour)
    setBirthMinute(timeParts.minute)
    setGender(initialProfile?.gender ?? '')
    setCalendarType(initialProfile?.calendar_type ?? '')
    setError('')
    setIsSaving(false)
  }, [open, initialProfile, defaultName])

  useEffect(() => {
    if (!birthDay) return
    if (Number(birthDay) > daysInMonth) {
      setBirthDay(String(daysInMonth))
    }
  }, [birthDay, daysInMonth])

  if (!open) return null

  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      : ''

  const birthTime =
    birthHour !== '' && birthMinute !== ''
      ? `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`
      : ''

  const isComplete =
    name.trim() !== '' &&
    birthDate !== '' &&
    birthTime !== '' &&
    gender !== '' &&
    calendarType !== ''

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isComplete) {
      setError('필수 정보를 모두 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await onSave({
        name: name.trim(),
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
    } catch (saveError) {
      setError(saveError.message)
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">{required ? '처음 오신 분' : '프로필'}</p>
            <h2 id="profile-modal-title">
              {required ? '사주 정보를 입력해 주세요' : '프로필 수정'}
            </h2>
            <p className="modal-description">
              {required
                ? '한 번만 입력하면 다음부터 바로 사주 해석을 시작할 수 있습니다.'
                : '변경한 내용은 다음 사주 해석에 반영됩니다.'}
            </p>
          </div>
          {!required && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          )}
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="profile-name">
              이름
            </label>
            <input
              id="profile-name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              autoFocus
            />
          </div>

          <div className="field">
            <span className="field-label">생년월일</span>
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
                onChange={(e) => setBirthDay(e.target.value)}
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

          <div className="field">
            <span className="field-label">태어난 시간</span>
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

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="submit-btn" disabled={isSaving || !isComplete}>
            {isSaving ? '저장 중...' : required ? '저장하고 시작하기' : '프로필 저장'}
          </button>
        </form>
      </div>
    </div>
  )
}
