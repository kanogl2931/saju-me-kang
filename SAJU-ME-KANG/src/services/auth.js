import { supabase } from './supabase'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // 공유 링크·작성 중이던 결과 화면으로 돌아올 수 있게 현재 URL 유지
      redirectTo: window.location.href,
    },
  })

  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
