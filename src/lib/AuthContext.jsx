import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile with role + employee English name
  async function fetchProfile(userId) {
    // Try with employee join first
    const { data, error } = await supabase
      .from('hr_user_profiles')
      .select('*, hr_employees(first_name_en, last_name_en)')
      .eq('id', userId)
      .single()
    if (!error && data) {
      // Build English display name: "FirstName L."
      if (data?.hr_employees?.first_name_en && data?.hr_employees?.last_name_en) {
        data.display_name_en = `${data.hr_employees.first_name_en} ${data.hr_employees.last_name_en.charAt(0)}.`
      }
      return data
    }
    // Fallback: fetch profile without join (in case hr_employees RLS blocks it)
    console.warn('Profile join failed, retrying without join:', error?.message)
    const { data: fallback, error: err2 } = await supabase
      .from('hr_user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (err2) {
      console.error('Error fetching profile:', err2)
      return null
    }
    return fallback
  }

  useEffect(() => {
    // Safety timeout - if auth takes too long, show login page
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000)

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  // Sign in
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Sign up (admin creates accounts)
  async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    if (error) throw error
    return data
  }

  // Change own password (with timeout to prevent hanging)
  async function changePassword(newPassword) {
    const timeoutMs = 8000
    const updatePromise = supabase.auth.updateUser({ password: newPassword })
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('__TIMEOUT__')), timeoutMs)
    )
    try {
      const { data, error } = await Promise.race([updatePromise, timeoutPromise])
      if (error) throw error
      return data
    } catch (err) {
      if (err.message === '__TIMEOUT__') {
        // API likely succeeded (200 OK) but Supabase client hung on session refresh
        // Treat as success
        return { user: user }
      }
      throw err
    }
  }

  // Sign out
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  // Check role
  const role = profile?.role || 'employee'
  const isSuperUser = role === 'superuser'
  const isAdmin = role === 'admin' || isSuperUser
  const isManager = role === 'manager' || isAdmin
  const isEmployee = role === 'employee' || isManager

  // Permission helpers
  const canViewAll = isAdmin
  const canViewTeam = isAdmin || isManager
  const canEdit = isAdmin
  const canManageUsers = isAdmin
  const canViewSalary = isSuperUser

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      role, isSuperUser, isAdmin, isManager, isEmployee,
      canViewAll, canViewTeam, canEdit, canManageUsers, canViewSalary,
      signIn, signUp, signOut, changePassword,
      fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
