import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/auth/AuthProvider'

export function AccountMenu() {
  const { session, usuario } = useAuth()
  if (!session) return null

  async function signOut() {
    await supabase.auth.signOut()
    // redireciona via SupabaseSessionListener
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-right">
        <div className="font-semibold">{usuario?.nome || session.user.email}</div>
        <div className="opacity-70 text-xs">{session.user.email}</div>
      </div>
      <button onClick={signOut} className="border rounded-xl px-3 py-2 text-sm">Sair</button>
    </div>
  )
}
