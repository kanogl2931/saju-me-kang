import { CALENDAR_LABEL, GENDER_LABEL } from '../../constants/saju'
import { formatBirthLabel } from '../../utils/formatters'
import ChartRows from '../chart/ChartRows'
import PillarGrid from '../chart/PillarGrid'
import CatSpeechPanel from './CatSpeechPanel'

export default function SavedResultPanel({
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
  hasSeenSajuResult,
  isSigningIn,
  authError,
  onLogin,
  onShare,
  onEdit,
  onNewSaju,
}) {
  return (
    <section className="saved-result-panel" ref={resultRef} aria-live="polite">
      <div className="saved-result-hero">
        <p className="saved-result-eyebrow">{isSharedView ? '공유된 사주' : '저장된 사주'}</p>
        <h2 className="saved-result-name">{name || '이름 없음'}</h2>
        <p className="saved-result-birth">{formatBirthLabel(birthDate, birthTime)}</p>
        <div className="saved-result-meta">
          {gender && <span className="meta-chip">{GENDER_LABEL[gender]}</span>}
          {calendarType && <span className="meta-chip">{CALENDAR_LABEL[calendarType]}</span>}
        </div>
      </div>

      <PillarGrid pillars={pillars} />

      {chartRows.length > 0 && <ChartRows rows={chartRows} title="사주 명식" />}

      {sajuChart && pillars.length === 0 && chartRows.length === 0 && (
        <ChartRows rows={[]} title="사주 명식" fallbackText={sajuChart.formatted} />
      )}

      {previewResult.visible.length > 0 && (
        <div className="interpretation-block">
          <h3>사주 해석</h3>
          <CatSpeechPanel
            blocks={previewResult.visible}
            personName={name}
            locked={previewResult.locked}
            onLogin={onLogin}
            isSigningIn={isSigningIn}
            authError={authError}
          />
        </div>
      )}

      <div className="saved-result-actions">
        <button
          type="button"
          className="share-result-btn"
          onClick={onShare}
          disabled={isSharing || (!result && !sajuChart)}
        >
          {isSharing ? '링크 준비 중...' : '결과 링크 복사'}
        </button>
        {!isSharedView && (
          <button type="button" className="edit-saved-btn" onClick={onEdit}>
            수정하기
          </button>
        )}
        {hasSeenSajuResult && (
          <button type="button" className="clear-saved-btn" onClick={onNewSaju}>
            새 사주 입력
          </button>
        )}
      </div>
      {shareMessage && <p className="share-toast">{shareMessage}</p>}
    </section>
  )
}
