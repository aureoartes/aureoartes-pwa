// Signup.jsx — usando theme.css (cards/inputs/botões padrão)
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function Signup() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [session, setSession] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const disabled = useMemo(() => loading, [loading]);

  async function handleSignup(e) {
    e.preventDefault();
    setMessage(null);

    const eNorm = email.trim().toLowerCase();
    if (!nome.trim()) return setMessage("Informe seu nome.");
    if (!eNorm) return setMessage("Informe um e-mail válido.");
    if (!password) return setMessage("Crie uma senha.");
    if (password.length < 6) return setMessage("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return setMessage("As senhas não coincidem.");

    setLoading(true);
    try {
      // 1) Cria a conta no Auth
      const { data: signData, error: signErr } = await supabase.auth.signUp({
        email: eNorm,
        password,
        options: {
          data: { nome },
          emailRedirectTo: window.location.origin + "/login",
        },
      });
      if (signErr) throw signErr;

      const user = signData?.user || session?.user || null;

      // 2) Registra/atualiza na tabela usuarios (ajuste colunas conforme seu schema)
      if (user) {
        try {
          const payload = { id: user.id, email: eNorm, nome };
          const { error: upsertErr } = await supabase
            .from("public.usuarios")
            .upsert(payload, { onConflict: "id" });
          if (upsertErr) throw upsertErr;
        } catch (tblErr) {
          console.warn("[usuarios upsert]", tblErr?.message || tblErr);
        }
      }

      // 3) Mensagem conforme política de confirmação
      if (!signData?.session) {
        setMessage("Quase lá! Enviamos um e-mail para confirmação. Verifique sua caixa de entrada para ativar a conta.");
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("[signUp error]", err);
      if (err?.status === 500) {
        setMessage("Falha ao criar conta: verifique URLs de redirecionamento (Auth > URL Configuration) e SMTP se confirmação de e-mail estiver ativa.");
      } else if (err?.message?.includes("redirect")) {
        setMessage("URL de redirecionamento não permitida. Adicione no Auth > URL Configuration.");
      } else if (err?.message?.includes("email")) {
        setMessage("Não foi possível enviar e-mail. Configure SMTP ou desative a confirmação para testes.");
      } else {
        setMessage(err?.message || "Não foi possível concluir o cadastro.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* HERO */}
      <section className="page-header">
        <div className="container">
          <h1 className="page-header__title">Criar conta</h1>
          <p className="page-header__subtitle">
            Preencha seus dados para começar a usar a plataforma.
          </p>
        </div>
      </section>

      {/* WRAPPER CENTRAL — largura máx. 520 e respiro confiável */}
      <div className="container">
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <form className="card p-4" onSubmit={handleSignup}>

            {/* Nome */}
            <div className="field">
              <label htmlFor="nome" className="label">Nome</label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="input"
                required
              />
            </div>

            {/* E-mail */}
            <div className="field mt-3">
              <label htmlFor="email" className="label">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="input"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            {/* Senhas (duas colunas no desktop) */}
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label htmlFor="senha" className="label">Senha</label>
                <input
                  id="senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirm" className="label">Confirmar senha</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* Mensagem */}
            {message && (
              <div className="message message--error mt-3" role="alert">
                <div className="message__content">{message}</div>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                disabled={disabled}
                className="btn btn--primary"
                style={{ minWidth: 200 }}
              >
                {loading ? "Criando conta…" : "Criar conta"}
              </button>
              <button
                type="button"
                className="btn btn--muted"
                style={{ minWidth: 200 }}
                onClick={() => navigate("/login")}
              >
                Já tenho conta
              </button>
            </div>

            <p className="small text-muted mt-3" style={{ textAlign: "center" }}>
              Ao continuar, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
