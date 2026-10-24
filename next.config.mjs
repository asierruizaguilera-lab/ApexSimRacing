const dev = process.env.NODE_ENV !== 'production'

// URL pública (para permitir el WebSocket propio en connect-src)
const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
let wsPropio = ''
try {
  const u = new URL(appUrl)
  wsPropio = `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`
} catch {}

// Content-Security-Policy. Next.js inyecta scripts inline para la hidratación, de ahí 'unsafe-inline'
// en script-src (sin nonces). Las imágenes admiten cualquier https: avatares, logos y coches vienen de
// URLs externas (Wikimedia incluida) que pegan los usuarios y el admin.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${wsPropio} ${dev ? 'ws://localhost:* ' : ''}https://www.paypal.com https://*.paypal.com https://*.paypalobjects.com`,
  // Academia (YouTube, Google Slides/Drive) y los popups/iframes de PayPal
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://docs.google.com https://drive.google.com https://www.paypal.com https://*.paypal.com',
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.paypal.com https://*.paypal.com",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://www.paypal.com")' },
  // HSTS solo en producción (en local se sirve por http)
  ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default nextConfig;
