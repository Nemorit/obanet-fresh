import axios from 'axios'
import Cookies from 'js-cookie'
import { toast } from 'react-hot-toast'

// Create axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = Cookies.get('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
            { refreshToken }
          )

          const { tokens } = response.data
          
          // Update tokens
          Cookies.set('access_token', tokens.accessToken, { expires: 7 })
          Cookies.set('refresh_token', tokens.refreshToken, { expires: 30 })

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          
          if (typeof window !== 'undefined') {
            window.location.href = '/giris'
          }
          
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/giris'
        }
      }
    }

    // Handle other errors
    if (error.response?.status >= 500) {
      toast.error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.')
    } else if (error.response?.status === 404) {
      toast.error('İstenilen kaynak bulunamadı.')
    } else if (error.response?.status === 403) {
      toast.error('Bu işlem için yetkiniz bulunmuyor.')
    }

    return Promise.reject(error)
  }
)

// SWR fetcher function
export const fetcher = (url: string) => api.get(url).then((res) => res.data)

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh-token',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: (token: string) => `/auth/reset-password/${token}`,
    verifyEmail: (token: string) => `/auth/verify-email/${token}`,
    changePassword: '/auth/change-password',
  },

  // Users
  users: {
    search: '/users/search',
    profile: (id: string) => `/users/${id}`,
    updateProfile: '/users/me/profile',
    follow: (id: string) => `/users/follow/${id}`,
    unfollow: (id: string) => `/users/unfollow/${id}`,
    followers: '/users/me/followers',
    following: '/users/me/following',
    diasporaConnections: '/users/me/diaspora-connections',
    stats: '/users/me/stats',
  },

  // Communities
  communities: {
    list: '/communities',
    search: '/communities/search',
    featured: '/communities/featured',
    byCountry: (country: string) => `/communities/by-country/${country}`,
    categories: '/communities/categories',
    detail: (id: string) => `/communities/${id}`,
    create: '/communities',
    join: (id: string) => `/communities/${id}/join`,
    leave: (id: string) => `/communities/${id}/leave`,
    members: (id: string) => `/communities/${id}/members`,
    posts: (id: string) => `/communities/${id}/posts`,
    events: (id: string) => `/communities/${id}/events`,
    myJoined: '/communities/me/joined',
    myOwned: '/communities/me/owned',
  },

  // Posts
  posts: {
    list: '/posts',
    trending: '/posts/trending',
    diasporaFeed: '/posts/diaspora-feed',
    search: '/posts/search',
    detail: (id: string) => `/posts/${id}`,
    create: '/posts',
    update: (id: string) => `/posts/${id}`,
    delete: (id: string) => `/posts/${id}`,
    like: (id: string) => `/posts/${id}/like`,
    unlike: (id: string) => `/posts/${id}/like`,
    save: (id: string) => `/posts/${id}/save`,
    unsave: (id: string) => `/posts/${id}/save`,
    comments: (id: string) => `/posts/${id}/comments`,
    addComment: (id: string) => `/posts/${id}/comments`,
    myPosts: '/posts/me/posts',
    myLiked: '/posts/me/liked',
    mySaved: '/posts/me/saved',
    followingFeed: '/posts/following/feed',
  },
}

export default api