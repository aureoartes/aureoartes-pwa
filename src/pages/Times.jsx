// v1.2.0.10 — Ajuste nos cards da lista: badge mais próximo ao nome (reduzir espaçamento) — 2025-09-22

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { getContrastShadow } from "../utils/colors";
import ColorSwatchSelect from "../components/ColorSwatchSelect";
import QuickAddInline from "../components/QuickAddInline";

export default function Times() {
  function TeamPreview({ nome, abreviacao, escudoUrl, c1, c2, cd, categoriaDesc }) {
    return (
      <div className="card team-card team-preview">
        <div className="team-card__banner" style={{ "--c1": c1, "--c2": c2 }} />
        <div
          className="team-card__badge"
          style={{ border: `3px solid ${cd}`, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}
        >
          {escudoUrl ? (
            <img src={escudoUrl} alt="Escudo preview" />
          ) : (
            <span
              className="team-card__sigla"
              style={{ color: cd, textShadow: getContrastShadow(cd) }}
            >
              {(abreviacao || "?").toUpperCase()}
            </span>
          )}
        </div>
        <div className="team-card__info team-card__info--with-badge">
          <div>
            <div className="team-card__title">{nome || "Seu Time"}</div>
            <div className="team-card__subtitle">{categoriaDesc || "Categoria"}</div>
          </div>
          <div className="team-card__dots">
            <span className="team-card__dot" style={{ background: c1 }} />
            <span className="team-card__dot" style={{ background: c2 }} />
            <span className="team-card__dot" style={{ background: cd }} />
          </div>
        </div>
      </div>
    );
  }

  const { ownerId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Listas
  const [times, setTimes] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Filtros/ordenação
  const [ordenacao, setOrdenacao] = useState("alfabetica");
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  // Cadastro/edição
  const [abrirCadastro, setAbrirCadastro] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [categoriaId, setCategoriaId] = useState(null);
  const [escudoUrl, setEscudoUrl] = useState("");
  const [cor1, setCor1] = useState("#FB8C00");
  const [cor2, setCor2] = useState("#FFFFFF");
  const [corDetalhe, setCorDetalhe] = useState("#000000");
  const [regiaoId, setRegiaoId] = useState("");

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!ownerId) {
      setTimes([]); setRegioes([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await Promise.all([fetchTimes(ownerId), fetchRegioes(ownerId), fetchCategorias()]);
      setLoading(false);
    })();
  }, [ownerId, authLoading]);

  async function fetchTimes(owner) {
    const { data, error } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", owner)
      .order("nome", { ascending: true });
    if (error) {
      console.error("fetchTimes", error);
      setTimes([]);
      return;
    }
    setTimes(data || []);
  }

  async function fetchRegioes(owner) {
    const { data, error } = await supabase
      .from("regioes")
      .select("id, descricao")
      .eq("usuario_id", owner)
      .order("descricao", { ascending: true });
    if (error) {
      console.error("fetchRegioes", error);
      setRegioes([]);
      return;
    }
    setRegioes(data || []);
  }

  async function fetchCategorias() {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, descricao")
      .order("descricao", { ascending: true });
    if (error) {
      console.error("fetchCategorias", error);
      setCategorias([]);
      return;
    }
    setCategorias(data || []);
  }

  function getCategoriaPadraoId() {
    return categorias.find((c) => (c.descricao || "").toLowerCase() === "futebol de botão")?.id ?? null;
  }

  function resetForm() {
    setEditandoId(null);
    setNome("");
    setAbreviacao("");
    setCategoriaId(getCategoriaPadraoId());
    setEscudoUrl("");
    setCor1("#FB8C00");
    setCor2("#FFFFFF");
    setCorDetalhe("#000000");
    setRegiaoId(regiaoFiltroId || "");
  }

  function handleEdit(t) {
    setEditandoId(t.id);
    setNome(t.nome || "");
    setAbreviacao(t.abreviacao || "");
    setCategoriaId(t.categoria_id ?? getCategoriaPadraoId());
    setEscudoUrl(t.escudo_url || "");
    setCor1(t.cor1 || "#FB8C00");
    setCor2(t.cor2 || "#FFFFFF");
    setCorDetalhe(t.cor_detalhe || "#000000");
    setRegiaoId(t.regiao_id || "");
    setAbrirCadastro(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    const { error } = await supabase.from("times").delete().eq("id", id);
    if (error) {
      console.error("handleDelete", error);
      alert("❌ Erro ao excluir time.");
      return;
    }
    setTimes((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ownerId) return;
    setSaving(true);

    const payload = {
      usuario_id: ownerId,
      nome,
      abreviacao,
      categoria_id: categoriaId || null,
      escudo_url: escudoUrl || null,
      cor1: cor1 || "#FFFFFF",
      cor2: cor2 || "#000000",
      cor_detalhe: corDetalhe || "#000000",
      regiao_id: regiaoId || null,
    };

    try {
      if (editandoId) {
        const { error } = await supabase.from("times").update(payload).eq("id", editandoId);
        if (error) {
          console.error("update time error", error);
          alert("❌ Erro ao atualizar time: " + error.message);
        } else {
          alert("✅ Time atualizado!");
          await fetchTimes(ownerId);
          resetForm();
          setAbrirCadastro(false);
        }
      } else {
        const { error } = await supabase.from("times").insert([payload]);
        if (error) {
          console.error("insert time error", error);
          alert("❌ Erro ao cadastrar time: " + error.message);
        } else {
          alert("✅ Time cadastrado!");
          await fetchTimes(ownerId);
          resetForm();
          setAbrirCadastro(false);
        }
      }
    } catch (err) {
      console.error("handleSubmit exception", err);
      alert("❌ Falha inesperada: " + err.message);
    }

    setSaving(false);
  }

  async function createRegiao(descricao) {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from("regioes")
      .insert([{ usuario_id: ownerId, descricao }])
      .select()
      .single();
    if (error) {
      console.error("createRegiao error", error);
      alert("❌ Erro ao cadastrar região: " + error.message);
      return;
    }
    await fetchRegioes(ownerId);
    setRegiaoId(data.id);
  }

  const timesFiltrados = useMemo(() => {
    let arr = [...(times || [])];
    if (regiaoFiltroId) arr = arr.filter((t) => t.regiao_id === regiaoFiltroId);

    if (ordenacao === "alfabetica") {
      arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    } else if (ordenacao === "mais_recente") {
      arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    } else if (ordenacao === "mais_antigo") {
      arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    }
    return arr;
  }, [times, ordenacao, regiaoFiltroId]);

  const carregando = authLoading || loading;

  return (
    <div className="container">
      {/* Header com botão Novo Time + Voltar */}
      <div className="card p-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 220, flex: "1 1 320px" }}>
            <h1 className="m-0">Times</h1>
            <div className="text-muted">Cadastre, edite e gerencie os times da sua competição.</div>
          </div>

          <div className="col" style={{ minWidth: 260, maxWidth: 360, flex: "0 1 360px", gap: 8 }}>
            <label className="label">Ordenar:</label>
            <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
              <option value="alfabetica">Ordem alfabética</option>
              <option value="mais_recente">Mais recente</option>
              <option value="mais_antigo">Mais antigo</option>
            </select>

            <label className="label">Região:</label>
            <select className="select" value={regiaoFiltroId} onChange={(e) => setRegiaoFiltroId(e.target.value)}>
              <option value="">Todas</option>
              {regioes.map((r) => (
                <option key={r.id} value={r.id}>{r.descricao}</option>
              ))}
            </select>

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn--orange" onClick={() => { resetForm(); setAbrirCadastro(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Novo Time</button>
              <button className="btn btn--muted" onClick={() => navigate(-1)}>← Voltar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cadastro/edição (oculto por padrão) */}
      {abrirCadastro && (
        <div className="card p-4">
          <div className="row p-4">
            <div className="collapsible__title">{editandoId ? "Editar Time" : "Cadastrar Time"}</div>
          </div>

          <div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Nome</label>
                  <input
                    className="input"
                    value={nome}
                    onChange={(e) => setNome(e.target.value.slice(0, 30))}
                    maxLength={30}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label">Abreviação (sigla)</label>
                  <input
                    className="input"
                    value={abreviacao}
                    onChange={(e) => setAbreviacao(e.target.value.slice(0, 5).toUpperCase())}
                    maxLength={5}
                    placeholder="Ex.: ABC"
                  />
                </div>

                <div className="field">
                  <label className="label">Categoria</label>
                  <select
                    className="select"
                    value={categoriaId || ""}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    required
                  >
                    <option value="">Selecione…</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.descricao}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Região</label>
                  <div>
                    <div className="row">
                      <select
                        className="select"
                        value={regiaoId}
                        onChange={(e) => setRegiaoId(e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {regioes.map((r) => (
                          <option key={r.id} value={r.id}>{r.descricao}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn--sm btn--orange"
                        title="Nova região"
                        onClick={() => setQuickAddOpen((v) => !v)}
                        disabled={!ownerId}
                      >
                        +
                      </button>
                    </div>

                    {quickAddOpen && (
                      <QuickAddInline
                        label="Nova região"
                        placeholder="Ex.: Sudeste"
                        align="left"
                        onCreate={(descricao) => createRegiao(descricao)}
                        onClose={() => setQuickAddOpen(false)}
                      />
                    )}
                  </div>
                </div>

                <div className="field">
                  <label className="label">Escudo (URL) (opcional)</label>
                  <input
                    className="input"
                    value={escudoUrl}
                    onChange={(e) => setEscudoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <ColorSwatchSelect label="Cor 1" value={cor1} onChange={setCor1} />
                <ColorSwatchSelect label="Cor 2" value={cor2} onChange={setCor2} />
                <ColorSwatchSelect label="Cor Detalhe" value={corDetalhe} onChange={setCorDetalhe} />
                {/* Preview ao vivo */}
                <TeamPreview
                  nome={nome}
                  abreviacao={abreviacao}
                  escudoUrl={escudoUrl}
                  c1={cor1}
                  c2={cor2}
                  cd={corDetalhe}
                  categoriaDesc={(categorias.find(c => c.id === (categoriaId || ""))?.descricao) || "Categoria"}
                />
              </div>

              <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--orange" type="submit" disabled={saving || !ownerId}>
                    {editandoId ? "Salvar Alterações" : "Salvar Time"}
                  </button>
                  <button className="btn btn--muted" type="button" onClick={() => { resetForm(); setAbrirCadastro(false); }}>
                    Cancelar
                  </button>
                </div>
                {editandoId && (
                  <button className="btn btn--red" type="button" onClick={() => handleDelete(editandoId)}>Excluir</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de times em cards detalhados */}
      {carregando ? (
        <div className="card p-4">Carregando…</div>
      ) : timesFiltrados.length === 0 ? (
        <div className="card p-4">Nenhum time encontrado.</div>
      ) : (
        <div className="grid grid-3 cards-equal">
          {timesFiltrados.map((t) => {
            const c1 = t.cor1 || "#FFFFFF";
            const c2 = t.cor2 || "#000000";
            const cd = t.cor_detalhe || "#000000";
            const categoriaDesc = categorias.find((c) => c.id === t.categoria_id)?.descricao || "—";

            return (
              <div key={t.id} className="card team-card no-mb">
                <div className="team-card__banner" style={{ "--c1": c1, "--c2": c2 }} />
                <div
                  className="team-card__badge"
                  style={{ "--cd": cd, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}
                >
                  {t.escudo_url ? (
                    <img src={t.escudo_url} alt={`Escudo ${t.nome}`} />
                  ) : (
                    <span
                      className="team-card__sigla"
                      style={{ color: cd, textShadow: getContrastShadow(cd) }}
                    >
                      {(t.abreviacao || "?").toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="team-card__info team-card__info--with-badge">
                  <div>
                    <div className="team-card__title">{t.nome}</div>
                    <div className="team-card__subtitle">{categoriaDesc}</div>
                    {t.regiao_id && (
                      <div className="text-muted">
                        Região: {regioes.find((r) => r.id === t.regiao_id)?.descricao || "—"}
                      </div>
                    )}
                  </div>

                  <div className="team-card__dots">
                    <span className="team-card__dot" style={{ background: c1 }} />
                    <span className="team-card__dot" style={{ background: c2 }} />
                    <span className="team-card__dot" style={{ background: cd }} />
                  </div>
                </div>

                <div className="row team-card__footer">
                  <Link className="btn btn--sm btn--orange" to={`/times/${t.id}`}>Ver detalhes</Link>
                  <button className="btn btn--sm btn--muted" onClick={() => handleEdit(t)}>Editar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
