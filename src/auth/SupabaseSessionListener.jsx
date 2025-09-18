import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'

export function SupabaseSessionListener() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        navigate('/', { replace: true })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return null
}