import { supabase } from './supabase'

export async function fetchSajuGenerationCount() {
  const { data, error } = await supabase.rpc('get_saju_generation_count')
  if (error) throw error
  return Number(data ?? 0)
}

export async function incrementSajuGenerationCount() {
  const { data, error } = await supabase.rpc('increment_saju_generation_count')
  if (error) throw error
  return Number(data ?? 0)
}
