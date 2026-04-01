import {
  LayoutDashboard, Scale, History, Truck, Users, Package,
  CreditCard, BarChart3, Trash2, Receipt, Settings
} from 'lucide-react'

export type NavItem = {
  href: string
  labelKey: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/weighing', labelKey: 'weighing', icon: Scale },
  { href: '/history', labelKey: 'history', icon: History },
  { href: '/vehicles', labelKey: 'vehicles', icon: Truck },
  { href: '/customers', labelKey: 'customers', icon: Users },
  { href: '/products', labelKey: 'products', icon: Package },
  { href: '/cards', labelKey: 'cards', icon: CreditCard },
  { href: '/statistics', labelKey: 'statistics', icon: BarChart3 },
  { href: '/waste', labelKey: 'waste', icon: Trash2 },
  { href: '/debtors', labelKey: 'debtors', icon: Receipt },
  { href: '/settings', labelKey: 'settings', icon: Settings, adminOnly: true },
]

// Primary nav items shown on mobile bottom bar (max 4 + more)
export const PRIMARY_NAV_KEYS = ['dashboard', 'weighing', 'history', 'statistics']
