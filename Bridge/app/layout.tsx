import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Raid Helper Bridge',
  description: 'Bridge Discord Raid-Helper signups to WoW',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
