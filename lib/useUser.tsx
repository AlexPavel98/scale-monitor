'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase, type Profile } from './supabase'

type UserContextType = {
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isOperator: boolean
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  isAdmin: false,
  isOperator: false,
  signOut: async () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        loadProfile()
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('scale_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    window.location.href = '/login'
  }

  const role = profile?.role
  return (
    <UserContext.Provider value={{
      profile,
      loading,
      isAdmin: role === 'admin',
      isOperator: role === 'operator' || role === 'admin',
      signOut,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
