export default function SajuForm({
  isViewingSaved,
  isLoading,
  isEditingSaved,
  isFormComplete,
  name,
  birthYear,
  birthMonth,
  birthDay,
  birthHour,
  birthMinute,
  gender,
  calendarType,
  years,
  months,
  days,
  hours,
  minutes,
  onNameChange,
  onBirthYearChange,
  onBirthMonthChange,
  onDayChange,
  onBirthHourChange,
  onBirthMinuteChange,
  onGenderChange,
  onCalendarTypeChange,
  onSubmit,
}) {
  return (
    <form className={`saju-form${isViewingSaved ? ' form-collapsed' : ''}`} onSubmit={onSubmit}>
      <div className="field">
        <label className="field-label" htmlFor="name">
          이름
        </label>
        <input
          id="name"
          className="text-input"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
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
              onChange={(e) => onBirthYearChange(e.target.value)}
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
              onChange={(e) => onBirthMonthChange(e.target.value)}
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
              onChange={(e) => onDayChange(e.target.value)}
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
            onChange={(e) => onBirthHourChange(e.target.value)}
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
            onChange={(e) => onBirthMinuteChange(e.target.value)}
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
            onClick={() => onGenderChange('male')}
            aria-pressed={gender === 'male'}
          >
            남성
          </button>
          <button
            type="button"
            className={`segment-btn${gender === 'female' ? ' active' : ''}`}
            onClick={() => onGenderChange('female')}
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
            onClick={() => onCalendarTypeChange('solar')}
            aria-pressed={calendarType === 'solar'}
          >
            양력
          </button>
          <button
            type="button"
            className={`segment-btn${calendarType === 'lunar' ? ' active' : ''}`}
            onClick={() => onCalendarTypeChange('lunar')}
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
  )
}
