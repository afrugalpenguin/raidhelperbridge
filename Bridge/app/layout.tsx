import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
