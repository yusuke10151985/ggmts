import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Factory Dictionary - GGMTS',
  description: 'Multilingual Factory Terms Dictionary',
}

export default function FactoryDictionaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}