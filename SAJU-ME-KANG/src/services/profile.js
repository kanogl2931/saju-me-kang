import { supabase } from './supabase'

const PROFILE_SELECT =
  'id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at'

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertProfile(userId, profile) {
  const payload = {
    id: userId,
    name: profile.name.trim(),
    birth_date: profile.birthDate,
    birth_time: profile.birthTime,
    gender: profile.gender,
    calendar_type: profile.calendarType,
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return data
}
