import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Hook responsável por:
// 1) Observar a sessão atual
// 2) Garantir registro em public.usuarios (primeiro acesso)
// 3) Expor usuario/ownerId/ready
export function useUsuario() {
  const [session, setSession] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  // carrega sessão inicial + ouve mudanças
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data?.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s ?? null)
      // limpeza básica quando troca/encerra
      if (evt === 'SIGNED_OUT' || evt === 'USER_DELETED') {
        localStorage.removeItem('aa.currentTeamId')
        localStorage.removeItem('aa.currentChampId')
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  // garante/obtém usuario
  useEffect(() => {
    let active = true

    async function ensureUsuario(user) {
      const { data: found, error: selErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_uid', user.id)
        .limit(1)
        .maybeSingle()
      if (selErr) throw selErr
      if (found) return found

      const payload = {
        auth_uid: user.id,
        nome: user.user_metadata?.name ?? null,
        email: user.email ?? null,
      }
      const { data: created, error: insErr } = await supabase
        .from('usuarios')
        .insert(payload)
        .select('*')
        .single()
      if (insErr) throw insErr
      return created
    }

    async function run() {
      setLoading(true)
      try {
        if (!session?.user) { setUsuario(null); return }
        const u = await ensureUsuario(session.user)
        if (!active) return
        setUsuario(u)
      } catch (e) {
        console.error('[useUsuario] error', e)
        setUsuario(null)
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => { active = false }
  }, [session?.user?.id])

  const ownerId = useMemo(() => usuario?.id ?? null, [usuario])
  return { session, usuario, ownerId, loading }
}
