'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import io, { Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinDiasporaRoom: (diasporaData: { country: string; city?: string }) => void
  joinCommunityRoom: (communityId: string) => void
  leaveRoom: (roomName: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Initialize socket connection when user is authenticated
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        transports: ['websocket', 'polling'],
        auth: {
          userId: user.id,
          username: user.username
        }
      })

      socketInstance.on('connect', () => {
        console.log('🔗 Connected to ObaNet socket')
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('🔌 Disconnected from ObaNet socket')
        setIsConnected(false)
      })

      socketInstance.on('joined-diaspora', (data) => {
        console.log('🏠 Joined diaspora room:', data)
      })

      socketInstance.on('new-message', (message) => {
        console.log('💬 New message received:', message)
        // Handle new messages (could emit to other parts of app)
      })

      socketInstance.on('activity-update', (activity) => {
        console.log('📈 Community activity update:', activity)
        // Handle activity updates
      })

      setSocket(socketInstance)

      // Auto-join user's diaspora room
      if (user.diasporaProfile?.currentCountry) {
        socketInstance.emit('join-diaspora', {
          country: user.diasporaProfile.currentCountry,
          city: user.diasporaProfile.currentCity
        })
      }

      return () => {
        socketInstance.disconnect()
      }
    } else {
      // Disconnect socket when user logs out
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [user])

  const joinDiasporaRoom = (diasporaData: { country: string; city?: string }) => {
    if (socket && isConnected) {
      socket.emit('join-diaspora', diasporaData)
    }
  }

  const joinCommunityRoom = (communityId: string) => {
    if (socket && isConnected) {
      socket.emit('join-community', { communityId })
    }
  }

  const leaveRoom = (roomName: string) => {
    if (socket && isConnected) {
      socket.emit('leave-room', { roomName })
    }
  }

  const value = {
    socket,
    isConnected,
    joinDiasporaRoom,
    joinCommunityRoom,
    leaveRoom
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}