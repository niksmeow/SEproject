import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CareerOS - AI-Powered Career Platform',
  description: 'Discover the path to your dream job with AI-powered resume matching and learning roadmaps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
