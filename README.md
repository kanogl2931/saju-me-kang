# 사주미

생년월일만 입력하면 AI가 사주 명식과 해석을 알려주는 무료 사주 풀이 서비스입니다.  
고양이 사주 선생님과 함께, 쉽고 친근한 톤으로 결과를 받아볼 수 있어요.

앱 코드는 [`SAJU-ME-KANG/`](./SAJU-ME-KANG)에 있습니다.

## 주요 기능

- **사주 명식 계산** — 생년월일·시간·성별·양력/음력을 바탕으로 사주 차트 생성
- **AI 해석** — Gemini로 성격·연애·재물·직업 등 맞춤 풀이 제공
- **Google 로그인** — Supabase Auth로 프로필·결과 저장
- **결과 히스토리** — 사이드바에서 이전 사주 결과 조회·삭제
- **공유 링크** — 해석 결과를 URL로 공유
- **게스트 초안** — 비로그인 입력값을 임시 보관하고, 로그인 후 이어서 이용
- **PWA** — 홈 화면 추가 및 오프라인 캐시 지원

## 기술 스택

| 구분 | 사용 |
|------|------|
| Frontend | React 19, Vite 8 |
| 사주 계산 | lunar-javascript |
| AI | Google Gemini API |
| Backend / Auth | Supabase (Auth, DB) |
| Analytics | Google Analytics 4 |
| Deploy | Vercel |
| PWA | vite-plugin-pwa |

## 시작하기

```bash
cd SAJU-ME-KANG
npm install
cp .env.example .env   # 값 채우기
npm run dev
```

### 환경 변수 (`SAJU-ME-KANG/.env`)

| 변수 | 설명 |
|------|------|
| `VITE_GEMINI_API_KEY` | Gemini API 키 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon(publishable) 키 |
| `VITE_SITE_URL` | 배포 사이트 주소 (끝 슬래시 없이). OG·canonical·sitemap에 사용 |
| `VITE_GOOGLE_SITE_VERIFICATION` | Google Search Console HTML 태그 인증 코드 (content 값만) |
| `VITE_GA_MEASUREMENT_ID` | GA4 Measurement ID (예: `G-XXXXXXXXXX`) |

## 스크립트

`SAJU-ME-KANG` 디렉터리에서 실행합니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 |

## 배포

루트 `vercel.json`으로 Vercel에 배포합니다.

- Install: `npm install --prefix SAJU-ME-KANG`
- Build: `npm run build --prefix SAJU-ME-KANG`
- Output: `SAJU-ME-KANG/dist`
- SPA rewrite: 모든 경로 → `/index.html`

배포 전 Vercel 프로젝트에 `VITE_*` 환경 변수를 등록하고, `VITE_SITE_URL`을 실제 도메인으로 맞춰 주세요.
