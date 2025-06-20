import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'video2game',
  description: 'video2game',
  generator: 'video2game',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
