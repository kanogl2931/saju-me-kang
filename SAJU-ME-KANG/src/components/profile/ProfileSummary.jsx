import { CALENDAR_LABEL, GENDER_LABEL } from '../../constants/saju'
import { formatBirthLabel } from '../../utils/formatters'

export default function ProfileSummary({ profile, onEdit }) {
  return (
    <section className="profile-summary" aria-label="내 프로필">
      <div className="profile-summary-text">
        <p className="profile-summary-eyebrow">내 사주 정보</p>
        <h2 className="profile-summary-name">{profile.name}</h2>
        <p className="profile-summary-birth">
          {formatBirthLabel(profile.birth_date, profile.birth_time)}
        </p>
        <div className="saved-result-meta">
          <span className="meta-chip">{GENDER_LABEL[profile.gender]}</span>
          <span className="meta-chip">{CALENDAR_LABEL[profile.calendar_type]}</span>
        </div>
      </div>
      <button type="button" className="profile-edit-link" onClick={onEdit}>
        수정
      </button>
    </section>
  )
}
