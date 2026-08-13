import CatSpeechPanel from './CatSpeechPanel'

export default function InterpretationSection({
  name,
  previewResult,
  isSharing,
  shareMessage,
  isSigningIn,
  authError,
  onLogin,
  onShare,
}) {
  return (
    <section className="result-section cat-result-section">
      <h2>사주 해석</h2>
      <CatSpeechPanel
        blocks={previewResult.visible}
        personName={name}
        locked={previewResult.locked}
        onLogin={onLogin}
        isSigningIn={isSigningIn}
        authError={authError}
      />
      <div className="result-share-actions">
        <button
          type="button"
          className="share-result-btn"
          onClick={onShare}
          disabled={isSharing}
        >
          {isSharing ? '링크 준비 중...' : '결과 링크 복사'}
        </button>
        {shareMessage && <p className="share-toast">{shareMessage}</p>}
      </div>
    </section>
  )
}
