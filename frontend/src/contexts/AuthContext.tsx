'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'
import Cookies from 'js-cookie'
import { toast } from 'react-hot-toast'

interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  email: string
  role: string
  isEmailVerified: boolean
  diasporaProfile: {
    currentCountry: string
    currentCity: string
    originCity: string
    diasporaGeneration: string
  }
  stats: {
    diasporaScore: number
    followersCount: number
    followingCount: number
  }
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const token = Cookies.get('access_token')
    if (token) {
      fetchUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      // Token might be expired, try to refresh
      await refreshToken()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { user, tokens } = response.data

      // Store tokens
      Cookies.set('access_token', tokens.accessToken, { expires: 7 })
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 30 })

      setUser(user)
      toast.success('Giriş başarılı! Hoş geldiniz 🏕️')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Giriş yapılırken hata oluştu'
      toast.error(message)
      throw error
    }
  }

  const register = async (userData: any) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { user, tokens } = response.data

      // Store tokens
      Cookies.set('access_token', tokens.accessToken, { expires: 7 })
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 30 })

      setUser(user)
      toast.success('Kayıt başarılı! Diaspora yolculuğunuza hoş geldiniz 🎉')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Kayıt olurken hata oluştu'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout fails on server, clear local data
      console.error('Logout error:', error)
    } finally {
      // Clear tokens and user data
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      setUser(null)
      toast.success('Başarıyla çıkış yapıldı')
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = Cookies.get('refresh_token')
      if (!refreshTokenValue) {
        throw new Error('No refresh token')
      }

      const response = await api.post('/auth/refresh-token', {
        refreshToken: refreshTokenValue
      })
      
      const { tokens } = response.data
      
      // Update tokens
      Cookies.set('access_token', tokens.accessToken, { expires: 7 })
      Cookies.set('refresh_token', tokens.refreshToken, { expires: 30 })

      // Fetch updated user data
      await fetchUser()
    } catch (error) {
      // Refresh failed, clear everything
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      setUser(null)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}