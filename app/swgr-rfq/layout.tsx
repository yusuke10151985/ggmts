import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SWGR RFQ Form - GGMTS',
  description: 'Dynamic SWGR RFQ Form Management System',
}

export default function SWGRRFQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}