import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setUsuarioId } from "../config/appUser";
import supabase from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(""); // ainda não validamos senha
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const raw = email.trim().toLowerCase();
      if (!raw) throw new Error("Informe um e-mail válido");

      // DEBUG: listar alguns registros (remover depois)
      const probe = await supabase.from("usuarios").select("id, email").limit(10);
      console.log("[DEBUG] Amostra de usuarios:", probe.data || [], probe.error || null);

      // Busca com wildcard para tolerar espaços escondidos e variações
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, email")
        .ilike("email", `%${raw}%`)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Usuário não encontrado");

      setUsuarioId(String(data.id));
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Falha no login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: "24px 16px" }}>
      <div className="page-header" style={{ background: "linear-gradient(135deg,#FF8A3D,#FF6A00)", color: "#fff" }}>
        <div className="container">
          <h1 className="page-header__title" style={{ color: "#fff" }}>Entrar</h1>
          <p className="page-header__subtitle" style={{ color: "#fff" }}>
            Informe seu e-mail para identificarmos seu usuário.
          </p>
        </div>
      </div>

      <form className="card" style={{ maxWidth: 520, margin: "16px auto", padding: 16 }} onSubmit={onSubmit}>
        <label htmlFor="email" style={{ fontWeight: 700 }}>E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@exemplo.com"
          className="input"
          required
          style={{ marginTop: 8 }}
        />

        <label htmlFor="senha" style={{ fontWeight: 700, marginTop: 12 }}>Senha</label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
          className="input"
          style={{ marginTop: 8 }}
        />

        {error && (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: "#ffd6ad", background: "#fff7ef", color: "#7a3f00" }}>
            {error}
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
          <button type="button" className="btn btn--muted" onClick={() => navigate("/")}>Cancelar</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
          * Nesta etapa o login não valida senha; usamos apenas o e-mail para localizar seu ID.
        </p>
      </form>
    </div>
  );
}
