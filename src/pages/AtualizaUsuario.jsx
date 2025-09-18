// src/pages/AtualizaUsuario.jsx v1.1.1
// Corrige ordem de hooks (move useEnumValues para o topo, antes de qualquer return)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient"; // client central
import { useEnumValues } from "../utils/useEnumValues";

export default function AtualizaUsuario() {
  const navigate = useNavigate();

  // states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    data_nasc: "",
    origem_aquisicao: "organico", // enum: public.usuario_origem_aquisicao
    time_coracao: "",
    telefone_celular: "",
    cep: "",
    pais: "",
    estado: "",
    cidade: "",
  });

  // ✅ HOOK DE ENUM SEMPRE NO TOPO (SEM CONDIÇÕES)
  const { values: ORIGENS, labels: ORIGEM_LABELS } = useEnumValues(
    "public.usuario_origem_aquisicao"
  );

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) { navigate("/"); return; }

      const { data, error } = await supabase
        .from("usuarios")
        .select("id, status, nome, data_nasc, origem_aquisicao, time_coracao, telefone_celular, cep, pais, estado, cidade")
        .eq("auth_uid", session.user.id)
        .single();

      if (error) { setError("Não foi possível carregar seus dados. Tente novamente."); setLoading(false); return; }

      if (data?.status && String(data.status).toLowerCase() !== "atualizar") { navigate("/perfil"); return; }

      setForm((prev) => ({
        ...prev,
        nome: data?.nome ?? "",
        data_nasc: data?.data_nasc || "",
        origem_aquisicao: data?.origem_aquisicao ?? "organico",
        time_coracao: data?.time_coracao ?? "",
        telefone_celular: data?.telefone_celular ?? "",
        cep: data?.cep ?? "",
        pais: data?.pais ?? "",
        estado: data?.estado ?? "",
        cidade: data?.cidade ?? "",
      }));

      setLoading(false);
    })();
  }, [navigate]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function validate() {
    if (!form.nome?.trim()) return "Informe seu nome.";
    if (!form.pais?.trim()) return "Informe o país."; // NOT NULL
    if (!form.estado?.trim()) return "Informe o estado.";
    if (!form.cidade?.trim()) return "Informe a cidade.";
    return "";
  }

  async function onConfirmar(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) { setError(v); return; }
    if (!session?.user) { setError("Sessão expirada."); return; }

    setSaving(true);
    const payload = {
      nome: form.nome?.trim() || null,
      data_nasc: form.data_nasc || null,
      origem_aquisicao: form.origem_aquisicao || "organico",
      time_coracao: form.time_coracao?.trim() || null,
      telefone_celular: form.telefone_celular?.trim() || null,
      cep: form.cep?.trim() || null,
      pais: form.pais?.trim() || null,
      estado: form.estado?.trim() || null,
      cidade: form.cidade?.trim() || null,
      status: "ativo",
    };

    const { error: upErr } = await supabase
      .from("usuarios")
      .update(payload)
      .eq("auth_uid", session.user.id);

    if (upErr) { setSaving(false); setError("Não foi possível salvar. Verifique os dados e tente novamente."); return; }

    setSaving(false);
    navigate("/perfil");
  }

  async function onCancelar() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // ✅ o return condicional vem DEPOIS de todos os hooks
  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="container">
            <div className="page-header__title">Atualizar cadastro</div>
            <div className="page-header__subtitle">Carregando…</div>
          </div>
        </div>
        <div className="container">
          <div className="card" style={{padding:16}}>
            <p>Preparando o formulário…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="container">
          <div className="page-header__title">Atualizar cadastro</div>
          <div className="page-header__subtitle">Complete seus dados para continuar usando a plataforma.</div>
        </div>
      </div>

      <div className="container">
        {error ? (
          <div className="card" style={{padding:12, marginBottom:12, borderColor:'#fecaca'}}>
            <p className="help-text help-text--error"><strong>Erro:</strong> {error}</p>
          </div>
        ) : null}

        <div className="card p-4">
          <form onSubmit={onConfirmar}>
            <div className="field">
              <label className="label" htmlFor="nome">Nome *</label>
              <input id="nome" name="nome" type="text" className="input" maxLength={40} value={form.nome} onChange={onChange} placeholder="Seu nome completo" />
            </div>

            <div className="field">
              <label className="label" htmlFor="data_nasc">Data de nascimento</label>
              <input id="data_nasc" name="data_nasc" type="date" className="input" value={form.data_nasc} onChange={onChange} />
            </div>

            <div className="field">
              <label className="label" htmlFor="origem_aquisicao">Como ficou sabendo?</label>
              <select id="origem_aquisicao" name="origem_aquisicao" className="select" value={form.origem_aquisicao} onChange={onChange}>
                {ORIGENS.map((opt) => (
                  <option key={opt} value={opt}>{ORIGEM_LABELS?.[opt] ?? opt}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="time_coracao">Time de coração</label>
              <input id="time_coracao" name="time_coracao" type="text" className="input" maxLength={30} value={form.time_coracao} onChange={onChange} placeholder="Ex.: Flamengo, Corinthians…" />
            </div>

            <div className="field">
              <label className="label" htmlFor="telefone_celular">Telefone</label>
              <input id="telefone_celular" name="telefone_celular" type="tel" className="input" maxLength={20} value={form.telefone_celular} onChange={onChange} placeholder="(DDD) 9 9999-9999" />
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label" htmlFor="cep">CEP</label>
                <input id="cep" name="cep" type="text" className="input" maxLength={10} value={form.cep} onChange={onChange} placeholder="00000-000" />
              </div>
              <div className="field">
                <label className="label" htmlFor="pais">País *</label>
                <input id="pais" name="pais" type="text" className="input" maxLength={40} value={form.pais} onChange={onChange} placeholder="Ex: Brasil" />
              </div>
              <div className="field">
                <label className="label" htmlFor="estado">Estado *</label>
                <input id="estado" name="estado" type="text" className="input" maxLength={30} value={form.estado} onChange={onChange} placeholder="Ex: SP" />
              </div>
              <div className="field">
                <label className="label" htmlFor="cidade">Cidade *</label>
                <input id="cidade" name="cidade" type="text" className="input" maxLength={60} value={form.cidade} onChange={onChange} placeholder="Ex: São Paulo" />
              </div>
            </div>

            <div className="row" style={{marginTop:16}}>
              <button type="submit" className={`btn btn--primary ${saving ? 'is-loading' : ''}`} disabled={saving}>
                <span>{saving ? "Salvando…" : "Confirmar"}</span>
              </button>
              <button type="button" onClick={onCancelar} className="btn btn--muted">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
