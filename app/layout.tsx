import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Latent Liturgy',
  description: 'An interactive digital triptych exploring the anomaly of algorithmic creation',
  keywords: ['AI art', 'generative art', 'Tilda Swinton', 'latent space', 'digital liturgy'],
  authors: [{ name: 'Paul Lazniak' }],
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
