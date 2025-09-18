import React, { createContext, useContext, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUsuario } from './useUsuario'

const AuthCtx = createContext(null)
const queryClient = new QueryClient()

export function AuthProvider({ children }) {
  const auth = useUsuario()
  const userId = auth.session?.user?.id ?? null

  // Correção do bug de troca de login: limpar caches/estados ao trocar userId
  useEffect(() => {
    queryClient.clear()
    localStorage.removeItem('aa.currentTeamId')
    localStorage.removeItem('aa.currentChampId')
  }, [userId])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>
    </QueryClientProvider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
