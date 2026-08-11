// Vite는 VITE_ 로 시작하는 .env 변수만 클라이언트에 노출
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// gemini-2.0-flash는 2026년 6월 종료 → gemini-3.6-flash 사용
const MODEL = 'gemini-3.6-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

// Gemini API에 프롬프트를 보내고 한국어 해석 결과를 받음
export async function requestSajuInterpretation(prompt) {
  if (!API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.')
  }

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Gemini 3.x: temperature, top_p, top_k 등 샘플링 매개변수 사용 금지
      // 마지막 턴은 user 역할이어야 함 (model 턴으로 끝나면 400 오류)
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'
    throw new Error(message)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini API에서 해석 결과를 받지 못했습니다.')
  }

  return text
}
