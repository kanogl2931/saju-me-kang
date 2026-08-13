export function formatBirthLabel(birthDate, birthTime) {
  if (!birthDate) return ''
  const [year, month, day] = birthDate.split('-')
  const time = (birthTime ?? '').slice(0, 5)
  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${time}`
}

export function formatReadingDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
