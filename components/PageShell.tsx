'use client'
import Nav from './Nav'

type Props = {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  subtitle?: string
}

export default function PageShell({ title, children, action, subtitle }: Props) {
  return (
    <>
      <Nav />
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-10 page-enter">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content">{title}</h1>
            {subtitle && <p className="text-sm text-content-muted mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
    </>
  )
}
