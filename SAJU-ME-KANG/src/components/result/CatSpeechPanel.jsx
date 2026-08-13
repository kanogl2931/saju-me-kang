import sajuCatResult from '../../assets/saju-cat-2.png'
import ResultBody from './ResultBody'

export default function CatSpeechPanel({
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
                  특이점까지는 미리 볼 수 있어요. Google로 로그인하면 약점·특징·질문까지 전체 해석과
                  저장·공유를 이용할 수 있습니다.
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
