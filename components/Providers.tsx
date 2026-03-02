'use client'
import { UserProvider } from '@/lib/useUser'
import { LangProvider } from '@/lib/i18n'
import { ToastProvider } from '@/lib/useToast'
import ToastContainer from '@/components/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <UserProvider>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </UserProvider>
    </LangProvider>
  )
}
