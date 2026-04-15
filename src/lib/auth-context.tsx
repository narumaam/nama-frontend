'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from './api'

interface AuthUser {
  token: string
  userId: number
  tenantId: number
  role: string
  email: string
}

interface AuthCtx {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('nama_token')
    const userData = localStorage.getItem('nama_user')
    if (token && userData) {
      try {
        setUser({ token, ...JSON.parse(userData) })
      } catch {}
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const userData = { userId: res.user_id, tenantId: res.tenant_id, role: res.role, email: res.email }
    localStorage.setItem('nama_token', res.access_token)
    localStorage.setItem('nama_user', JSON.stringify(userData))
    setUser({ token: res.access_token, ...userData })
  }

  const logout = () => {
    localStorage.removeItem('nama_token')
    localStorage.removeItem('nama_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
