import { formatBirthLabel } from '../../utils/formatters'

export default function UserBar({
  isLoggedIn,
  userLabel,
  profile,
  isSigningIn,
  onOpenProfile,
  onSignOut,
  onSignIn,
}) {
  return (
    <div className="user-bar">
      <div className="user-bar-main">
        {isLoggedIn ? (
          <>
            <span className="user-label">{userLabel}</span>
            {profile && (
              <span className="user-birth-hint">
                {formatBirthLabel(profile.birth_date, profile.birth_time)}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="user-label">게스트로 이용 중</span>
            <span className="user-birth-hint">로그인하면 전체 해석과 저장이 가능합니다</span>
          </>
        )}
      </div>
      <div className="user-bar-actions">
        {isLoggedIn ? (
          <>
            <button type="button" className="profile-btn" onClick={onOpenProfile}>
              프로필
            </button>
            <button type="button" className="sign-out-btn" onClick={onSignOut}>
              로그아웃
            </button>
          </>
        ) : (
          <button
            type="button"
            className="profile-btn"
            onClick={onSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? '이동 중...' : '로그인'}
          </button>
        )}
      </div>
    </div>
  )
}
