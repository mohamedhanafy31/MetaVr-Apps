import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Avatar Closed',
  description: 'AI Avatar Closed Game',
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

