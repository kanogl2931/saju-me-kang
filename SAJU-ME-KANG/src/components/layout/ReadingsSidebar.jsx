import { formatReadingDate } from '../../utils/formatters'

export default function ReadingsSidebar({
  isOpen,
  readings,
  selectedId,
  hasSeenSajuResult,
  onToggle,
  onClose,
  onNewSaju,
  onSelectReading,
  onDeleteReading,
}) {
  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="readings-sidebar"
      >
        {isOpen ? '목록 닫기' : '저장된 사주'}
      </button>

      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="사이드바 닫기"
          onClick={onClose}
        />
      )}

      <aside
        id="readings-sidebar"
        className={`readings-sidebar${isOpen ? ' open' : ''}`}
        aria-label="저장된 사주 목록"
      >
        <div className="sidebar-header">
          <h2>저장된 사주</h2>
          <p>날짜를 누르면 결과가 열립니다</p>
          {hasSeenSajuResult && (
            <button type="button" className="sidebar-new-btn" onClick={onNewSaju}>
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
                  onClick={() => onSelectReading(reading)}
                >
                  <span className="reading-name">{reading.name}</span>
                  <span className="reading-date">{formatReadingDate(reading.created_at)}</span>
                </button>
                <button
                  type="button"
                  className="reading-delete"
                  aria-label={`${reading.name} 삭제`}
                  onClick={(event) => onDeleteReading(event, reading)}
                >
                  지우기
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
    </>
  )
}
