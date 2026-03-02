'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, Globe } from 'lucide-react'
import { NAV_ITEMS, PRIMARY_NAV_KEYS } from '@/lib/consts'
import { useLang } from '@/lib/i18n'
import { useUser } from '@/lib/useUser'

export default function Nav() {
  const pathname = usePathname()
  const { lang, setLang, t } = useLang()
  const { profile, isAdmin, signOut } = useUser()
  const [moreOpen, setMoreOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const navItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)
  const navLabels = t.nav as Record<string, string>

  const primaryItems = navItems.filter(i => PRIMARY_NAV_KEYS.includes(i.labelKey))
  const secondaryItems = navItems.filter(i => !PRIMARY_NAV_KEYS.includes(i.labelKey))

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const toggleLang = () => setLang(lang === 'da' ? 'en' : 'da')

  // === MOBILE: Bottom nav ===
  if (isMobile) {
    return (
      <>
        <nav className="fixed bottom-0 inset-x-0 z-50 glass-nav safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {primaryItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${active ? 'text-brand-primary' : 'text-content-muted'}`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{navLabels[item.labelKey]}</span>
                </Link>
              )
            })}
            <button onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${moreOpen ? 'text-brand-primary' : 'text-content-muted'}`}
            >
              {moreOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </div>
        </nav>

        {moreOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--overlay-bg)' }} />
            <div className="absolute bottom-20 inset-x-4 glass rounded-2xl p-4 slide-up" onClick={e => e.stopPropagation()}>
              {profile && (
                <div className="px-3 py-2 mb-3 border-b border-subtle">
                  <p className="text-sm font-semibold text-content">{profile.name}</p>
                  <p className="text-xs text-content-muted">{profile.role}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {secondaryItems.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${active ? 'bg-brand-primary/10 text-brand-primary' : 'text-content-muted hover:bg-subtle'}`}
                    >
                      <Icon size={18} />
                      <span className="text-[11px] font-medium">{navLabels[item.labelKey]}</span>
                    </Link>
                  )
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-subtle">
                <button onClick={toggleLang} className="flex items-center gap-2 text-sm text-content-muted hover:text-content transition-colors">
                  <Globe size={16} />
                  {lang === 'da' ? 'English' : 'Dansk'}
                </button>
                <button onClick={signOut} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // === DESKTOP: Top nav ===
  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-content tracking-tight">
          Scale Monitor
        </Link>

        <div className="flex items-center gap-1 bg-subtle rounded-full px-1 py-1">
          {navItems.slice(0, 7).map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active ? 'bg-white dark:bg-zinc-800 text-brand-primary shadow-sm' : 'text-content-muted hover:text-content'
                }`}
              >
                <Icon size={15} />
                {navLabels[item.labelKey]}
              </Link>
            )
          })}
          {navItems.length > 7 && (
            <div className="relative">
              <button onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-content-muted hover:text-content transition-all"
              >
                <Menu size={15} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl p-2 z-50 shadow-xl slide-up">
                    {navItems.slice(7).map(item => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            active ? 'text-brand-primary bg-brand-primary/10' : 'text-content-muted hover:text-content hover:bg-subtle'
                          }`}
                        >
                          <Icon size={16} />
                          {navLabels[item.labelKey]}
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content transition-colors"
          >
            <Globe size={15} />
            {lang === 'da' ? 'EN' : 'DA'}
          </button>
          {profile && (
            <span className="text-sm text-content-muted">{profile.name}</span>
          )}
          <button onClick={signOut} className="text-content-muted hover:text-red-500 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  )
}
