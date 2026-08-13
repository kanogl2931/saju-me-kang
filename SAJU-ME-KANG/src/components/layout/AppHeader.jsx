export default function AppHeader({
  isEditingSaved,
  isLoggedIn,
  profile,
  generationCount,
  hasSeenSajuResult,
  onNewSaju,
}) {
  return (
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
          {!isLoggedIn && generationCount != null && generationCount > 0 && (
            <p className="trust-stat" aria-live="polite">
              지금까지 <strong>{generationCount.toLocaleString('ko-KR')}</strong>개의 사주가
              해석되었어요
            </p>
          )}
        </div>
        {hasSeenSajuResult && (
          <button type="button" className="new-saju-btn" onClick={onNewSaju}>
            새 사주 입력
          </button>
        )}
      </div>
    </header>
  )
}
