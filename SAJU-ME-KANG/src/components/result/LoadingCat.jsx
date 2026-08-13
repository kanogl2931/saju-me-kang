import sajuCatLoading from '../../assets/saju-cat-1.png'

export default function LoadingCat() {
  return (
    <div className="cat-loading" aria-live="polite">
      <img src={sajuCatLoading} alt="사주를 해석 중인 고양이" className="cat-loading-image" />
      <div className="cat-loading-bubble">
        <p className="cat-loading-title">사주를 보고 있다냥!</p>
        <p className="cat-loading-text">조금만 기다리라냥.</p>
        <div className="cat-loading-dots" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    </div>
  )
}
