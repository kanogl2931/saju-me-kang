const LOGIN_SOURCE_KEY = 'ga_login_source'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-Q0KP4QTBX2'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

export function setUserProperties(properties) {
  gtag('set', 'user_properties', properties)
}

export function trackPageView({ path, title } = {}) {
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: path ?? `${window.location.pathname}${window.location.search}`,
    page_title: title ?? document.title,
  })
}

export function rememberLoginSource(source) {
  try {
    sessionStorage.setItem(LOGIN_SOURCE_KEY, source)
  } catch {
    // private mode 등에서 sessionStorage가 막혀도 분석은 건너뜀
  }
}

export function consumeLoginSource() {
  try {
    const source = sessionStorage.getItem(LOGIN_SOURCE_KEY)
    if (source) sessionStorage.removeItem(LOGIN_SOURCE_KEY)
    return source
  } catch {
    return null
  }
}
