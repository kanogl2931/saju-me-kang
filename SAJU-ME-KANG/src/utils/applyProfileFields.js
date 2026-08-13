export function applyProfileFields(profile, setters) {
  if (!profile) return

  const [year = '', month = '', day = ''] = (profile.birth_date ?? '').split('-')
  const [hour = '', minute = ''] = (profile.birth_time ?? '').slice(0, 5).split(':')

  setters.setName(profile.name ?? '')
  setters.setBirthYear(year)
  setters.setBirthMonth(month ? String(Number(month)) : '')
  setters.setBirthDay(day ? String(Number(day)) : '')
  setters.setBirthHour(hour !== '' ? String(Number(hour)) : '')
  setters.setBirthMinute(minute !== '' ? String(Number(minute)) : '')
  setters.setGender(profile.gender ?? '')
  setters.setCalendarType(profile.calendar_type ?? '')
}
