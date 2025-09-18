// SignIn.jsx — layout final com espaçamento consistente entre cards e labels
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const routedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!alive) return;
      if (sess?.user) routeAfterAuth(sess, from);
    });
    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  async function fetchUsuario(authUserId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("status")
      .eq("auth_uid", authUserId)
      .single();
    if (error) throw error;
    return data;
  }

  async function routeAfterAuth(sess, fromPath) {
    if (routedRef.current) return;
    try {
      const data = await fetchUsuario(sess.user.id);
      const status = String(data?.status || "").toLowerCase();
      routedRef.current = true;
      navigate(status === "atualizar" ? "/atualiza-usuario" : (fromPath || "/perfil"), { replace: true });
    } catch {
      setMessage("Não foi possível verificar seu perfil. Tente novamente.");
      routedRef.current = false;
    }
  }

  async function handlePasswordSignIn(e) {
    e.preventDefault();
    setLoading(true); setMessage(null); routedRef.current = false;
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      await routeAfterAuth(data.session, from);
    } catch (err) {
      setMessage(
        err?.message?.includes("Invalid")
          ? "Credenciais inválidas. Confira e-mail e senha."
          : err?.message || "Não foi possível entrar."
      );
    } finally { setLoading(false); }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setLoading(true); setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage("Enviamos um link mágico para seu e-mail.");
    } catch (err) {
      setMessage(err?.message || "Não foi possível enviar o link mágico.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* HERO */}
      <section className="page-header">
        <div className="container">
          <h1 className="page-header__title">Entrar</h1>
          <p className="page-header__subtitle">Acesse com seu e-mail e senha cadastrados.</p>
        </div>
      </section>

      {/* WRAPPER CENTRAL COM GRID GAP */}
      <div className="container">
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            display: "grid",
            gap: "4px", // espaço consistente entre todos os itens
          }}
        >
          {/* Card: login com senha */}
          <form className="card p-4" onSubmit={handlePasswordSignIn}>
            <div className="field">
              <label htmlFor="email" className="label">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="input"
                autoComplete="email"
                required
              />
            </div>

            <div className="field mt-3">
              <label htmlFor="senha" className="label">Senha</label>
              <input
                id="senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="current-password"
                required
              />
            </div>

            {message && (
              <div className="message message--error mt-3" role="alert">
                <div className="message__content">{message}</div>
              </div>
            )}
            <div className="flex justify-center mt-4">
              <button disabled={loading} className="btn btn--primary min-w-[200px]">
                {loading ? "Entrando…" : "Entrar com senha"}
              </button>
            </div>
          </form>

          {/* Separador */}
          <div className="text-center text-muted small flex justify-center">ou</div>

          {/* Card: link mágico */}
          <form className="card p-4" onSubmit={handleMagicLink}>
            <div className="flex justify-center">
              <button disabled={loading || !email} className="btn btn--muted min-w-[200px]">
                Enviar link mágico
              </button>
            </div>
            <p className="small text-muted mt-2 flex justify-center">
              Enviaremos um e-mail com o link para entrar.
            </p>
          </form>

          {/* Separador */}
          <div className="text-center text-muted small flex justify-center">ou</div>

          {/* Card: cadastro */}
          <div className="card p-4">
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn--primary min-w-[200px]"
                onClick={() => navigate("/signup")}
              >
                Cadastre-se
              </button>
            </div>
            <p className="small text-muted mt-2 flex justify-center">
              Crie sua conta para começar a usar a plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
