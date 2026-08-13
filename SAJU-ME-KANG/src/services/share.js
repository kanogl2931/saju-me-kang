import { supabase } from './supabase'

const READING_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, saju_chart, result, created_at, user_id, share_token'

export function buildShareUrl(shareToken) {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('share', shareToken)
  return url.toString()
}

export async function fetchSharedReading(shareToken) {
  const { data, error } = await supabase.rpc('get_shared_reading', {
    p_token: shareToken,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('공유 결과를 찾을 수 없습니다.')
  }

  return row
}

export async function createSharedReading(payload) {
  const { data, error } = await supabase.rpc('create_shared_reading', {
    p_name: payload.name,
    p_birth_date: payload.birth_date,
    p_birth_time: payload.birth_time,
    p_gender: payload.gender,
    p_calendar_type: payload.calendar_type,
    p_saju_chart: payload.saju_chart ?? '',
    p_result: payload.result,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.share_token) {
    throw new Error('공유 링크를 만들지 못했습니다.')
  }

  return row
}

export async function ensureReadingShareToken(readingId) {
  const { data, error } = await supabase
    .from('saju_readings')
    .select(READING_SELECT)
    .eq('id', readingId)
    .single()

  if (error) throw error
  return data
}

export { READING_SELECT }
