import { PILLAR_KEYS } from '../constants/saju'

export function extractPillars(chartText) {
  if (!chartText) return []

  const pillars = []
  for (const { key, short } of PILLAR_KEYS) {
    const lineMatch = chartText.match(new RegExp(`${key}\\s*[:：]\\s*([^\\n,，]+)`))
    if (lineMatch) {
      pillars.push({ label: short, value: lineMatch[1].trim() })
    }
  }

  return pillars
}

export function parseChartRows(chartText) {
  if (!chartText) return []

  return chartText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.search(/[:：]/)
      if (separatorIndex === -1) {
        return { label: '', value: line }
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      }
    })
    .filter((row) => !PILLAR_KEYS.some(({ key }) => row.label === key) || row.label === '')
}
