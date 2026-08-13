import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function seoEmitPlugin(siteUrl) {
  const normalized = (siteUrl || '').replace(/\/$/, '')

  return {
    name: 'seo-emit',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Search Console 인증값이 없거나 플레이스홀더면 메타 태그 제거
        return html
          .replace(
            /<meta\s+name="google-site-verification"\s+content="%VITE_GOOGLE_SITE_VERIFICATION%"\s*\/?>\s*/i,
            '',
          )
          .replace(
            /<meta\s+name="google-site-verification"\s+content="\s*"\s*\/?>\s*/i,
            '',
          )
      },
    },
    closeBundle() {
      if (!normalized) return

      const outDir = path.resolve('dist')
      if (!fs.existsSync(outDir)) return

      const today = new Date().toISOString().slice(0, 10)

      fs.writeFileSync(
        path.join(outDir, 'robots.txt'),
        [
          'User-agent: *',
          'Allow: /',
          `Sitemap: ${normalized}/sitemap.xml`,
        ].join('\n') + '\n',
        'utf8',
      )

      fs.writeFileSync(
        path.join(outDir, 'sitemap.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${normalized}/</loc>`,
          `    <lastmod>${today}</lastmod>`,
          '    <changefreq>weekly</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
        'utf8',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      seoEmitPlugin(env.VITE_SITE_URL || ''),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'favicon.svg', 'og-image.png', 'robots.txt'],
        manifest: {
          name: '사주미 | AI 사주 해석',
          short_name: '사주미',
          description: '생년월일만 입력하면 AI가 사주 명식과 해석을 알려드려요.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#f3eee4',
          theme_color: '#1f316f',
          lang: 'ko-KR',
          icons: [
            {
              src: '/favicon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/favicon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        manifestFilename: 'site.webmanifest',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          navigateFallback: '/index.html',
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  }
})
