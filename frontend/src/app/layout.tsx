import type { Metadata } from 'next'
import { Inter, Cal_Sans } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const calSans = Cal_Sans({
  subsets: ['latin'],
  variable: '--font-cal-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ObaNet - Dijital Diaspora Platformu',
    template: '%s | ObaNet'
  },
  description: 'Dünya çapındaki Türk diaspora toplulukları için dijital buluşma noktası. Kültürünüzü yaşayın, bağlantılar kurun, hikayelerinizi paylaşın.',
  keywords: [
    'diaspora',
    'türk',
    'turkish',
    'community',
    'platform',
    'germany',
    'europe',
    'immigration',
    'culture',
    'social network'
  ],
  authors: [
    {
      name: 'ObaNet Team',
      url: 'https://obanet.com',
    },
  ],
  creator: 'ObaNet',
  publisher: 'ObaNet',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://obanet.com'),
  alternates: {
    canonical: '/',
    languages: {
      'tr-TR': '/tr',
      'en-US': '/en',
      'de-DE': '/de',
      'fr-FR': '/fr',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    alternateLocale: ['en_US', 'de_DE', 'fr_FR'],
    url: 'https://obanet.com',
    siteName: 'ObaNet',
    title: 'ObaNet - Dijital Diaspora Platformu',
    description: 'Dünya çapındaki Türk diaspora toplulukları için dijital buluşma noktası',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ObaNet - Connecting Turkish Diaspora Communities Worldwide',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@obanet',
    creator: '@obanet',
    title: 'ObaNet - Dijital Diaspora Platformu',
    description: 'Dünya çapındaki Türk diaspora toplulukları için dijital buluşma noktası',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#ee7544',
      },
    ],
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ee7544' },
    { media: '(prefers-color-scheme: dark)', color: '#df5a2c' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className={`${inter.variable} ${calSans.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}