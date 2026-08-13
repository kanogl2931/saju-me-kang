import { supabase } from './supabase'

function getOAuthRedirectTo() {
  const redirectUrl = new URL(window.location.href)
  // Supabase puts the session in the URL hash (#access_token=...).
  // If redirectTo already has a hash (leftover tokens or bare "#"),
  // the callback becomes /##access_token=... and login fails to restore.
  redirectUrl.hash = ''
  return redirectUrl.toString()
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Keep path + query (e.g. ?share=...) but never the hash
      redirectTo: getOAuthRedirectTo(),
    },
  })

  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
