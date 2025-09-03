// src/pages/Times.jsx (corrigido com seção de cadastro)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { getContrastShadow } from "../utils/colors";

const COLOR_OPTIONS = [
  { key: "branco", value: "#FFFFFF" },
  { key: "preto", value: "#000000" },
  { key: "vermelho", value: "#E53935" },
  { key: "verde", value: "#43A047" },
  { key: "verde-escuro", value: "#1B5E20" },
  { key: "azul", value: "#1E88E5" },
  { key: "azul-escuro", value: "#0D47A1" },
  { key: "grena", value: "#7B1E3C" },
  { key: "amarelo", value: "#FBC02D" },
  { key: "laranja", value: "#FB8C00" },
  { key: "roxo", value: "#8E24AA" },
  { key: "rosa", value: "#EC407A" },
  { key: "marrom", value: "#6D4C41" },
  { key: "cinza", value: "#9E9E9E" },
];

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function Times() {
  const [times, setTimes] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [ordenacao, setOrdenacao] = useState("alfabetica");
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [escudoUrl, setEscudoUrl] = useState("");
  const [cor1, setCor1] = useState("#FFFFFF");
  const [cor2, setCor2] = useState("#000000");
  const [corDetalhe, setCorDetalhe] = useState("#000000");
  const [regiaoId, setRegiaoId] = useState("");

  const [abrirCadastro, setAbrirCadastro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchTimes(), fetchRegioes()]);
      setLoading(false);
    })();
  }, []);

  async function fetchTimes() {
    const { data } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });
    setTimes(data || []);
  }

  async function fetchRegioes() {
    const { data } = await supabase
      .from("regioes")
      .select("id, descricao")
      .eq("usuario_id", USUARIO_ID)
      .order("descricao", { ascending: true });
    setRegioes(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setNome("");
    setAbreviacao("");
    setCategoria("Futebol de Botão");
    setEscudoUrl("");
    setCor1("#FFFFFF");
    setCor2("#000000");
    setCorDetalhe("#000000");
    setRegiaoId(regiaoFiltroId || "");
  }

  function handleEdit(time) {
    setEditandoId(time.id);
    setNome(time.nome);
    setAbreviacao(time.abreviacao || "");
    setCategoria(time.categoria || "Futebol de Botão");
    setEscudoUrl(time.escudo_url || "");
    setCor1(time.cor1 || "#FFFFFF");
    setCor2(time.cor2 || "#000000");
    setCorDetalhe(time.cor_detalhe || "#000000");
    setRegiaoId(time.regiao_id || "");
    setAbrirCadastro(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    const { error } = await supabase.from("times").delete().eq("id", id);
    if (error) {
      alert("❌ Erro ao excluir time.");
      return;
    }
    setTimes((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      usuario_id: USUARIO_ID,
      nome,
      abreviacao,
      categoria,
      escudo_url: escudoUrl || null,
      cor1: cor1 || "#FFFFFF",
      cor2: cor2 || "#000000",
      cor_detalhe: corDetalhe || "#000000",
      regiao_id: regiaoId || null,
    };

    if (editandoId) {
      const { error } = await supabase.from("times").update(payload).eq("id", editandoId);
      if (error) alert("❌ Erro ao atualizar time.");
      else {
        alert("✅ Time atualizado!");
        await fetchTimes();
        resetForm();
        setAbrirCadastro(false);
      }
    } else {
      const { error } = await supabase.from("times").insert([payload]);
      if (error) alert("❌ Erro ao cadastrar time.");
      else {
        alert("✅ Time cadastrado!");
        await fetchTimes();
        resetForm();
        setAbrirCadastro(false);
      }
    }

    setSaving(false);
  }

  const timesFiltrados = useMemo(() => {
    let arr = [...(times || [])];
    if (regiaoFiltroId) arr = arr.filter((t) => t.regiao_id === regiaoFiltroId);
    if (ordenacao === "alfabetica") arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    else if (ordenacao === "mais_recente") arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    else if (ordenacao === "mais_antigo") arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    return arr;
  }, [times, ordenacao, regiaoFiltroId]);

  return (
    <div className="container">
      {/* Header + botão Novo Time */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Times</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Cadastre, edite e gerencie os times da sua competição.</div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="label" style={{ margin: 0 }}>Ordenar:</label>
            <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
              <option value="alfabetica">Ordem alfabética</option>
              <option value="mais_recente">Mais recente</option>
              <option value="mais_antigo">Mais antigo</option>
            </select>
            <label className="label" style={{ margin: "0 0 0 8px" }}>Região:</label>
            <select className="select" value={regiaoFiltroId} onChange={(e) => setRegiaoFiltroId(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">Todas</option>
              {regioes.map((r) => (<option key={r.id} value={r.id}>{r.descricao}</option>))}
            </select>
            <button className="btn btn--orange" onClick={() => { resetForm(); setAbrirCadastro(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>+ Novo Time</button>
          </div>
        </div>
      </div>

      {/* Cadastro oculto/editar */}
      {abrirCadastro && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div className="collapsible__title">{editandoId ? "Editar Time" : "Cadastrar Time"}</div>
            <button className="btn btn--muted" onClick={() => { resetForm(); setAbrirCadastro(false); }}>Fechar</button>
          </div>
          <div style={{ padding: 12 }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Nome</label>
                  <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">Abreviação (sigla)</label>
                  <input className="input" value={abreviacao} onChange={(e) => setAbreviacao(e.target.value)} placeholder="Ex.: ABC" />
                </div>
                <div className="field">
                  <label className="label">Categoria</label>
                  <input className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Região</label>
                  <select className="select" value={regiaoId} onChange={(e) => setRegiaoId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {regioes.map((r) => (
                      <option key={r.id} value={r.id}>{r.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Escudo (URL)</label>
                  <input className="input" value={escudoUrl} onChange={(e) => setEscudoUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="field">
                  <label className="label">Cor Detalhe</label>
                  <select className="select" value={corDetalhe} onChange={(e) => setCorDetalhe(e.target.value)}>
                    {COLOR_OPTIONS.map(opt => (<option key={opt.key} value={opt.value}>{opt.key}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Cor 1</label>
                  <select className="select" value={cor1} onChange={(e) => setCor1(e.target.value)}>
                    {COLOR_OPTIONS.map(opt => (<option key={opt.key} value={opt.value}>{opt.key}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Cor 2</label>
                  <select className="select" value={cor2} onChange={(e) => setCor2(e.target.value)}>
                    {COLOR_OPTIONS.map(opt => (<option key={opt.key} value={opt.value}>{opt.key}</option>))}
                  </select>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn--orange" type="submit" disabled={saving}>{editandoId ? "Salvar Alterações" : "Salvar Time"}</button>
                <button className="btn btn--muted" type="button" onClick={() => { resetForm(); setAbrirCadastro(false); }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de times */}
      <div className="grid grid-3">
        {loading ? (
          <div className="card" style={{ padding: 14 }}>Carregando…</div>
        ) : timesFiltrados.length === 0 ? (
          <div className="card" style={{ padding: 14 }}>Nenhum time encontrado.</div>
        ) : (
          timesFiltrados.map((time) => (
            <TeamCard key={time.id} time={time} onEdit={() => handleEdit(time)} onDelete={() => handleDelete(time.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function TeamCard({ time, onEdit, onDelete }) {
  const c1 = time.cor1 || "#FFFFFF";
  const c2 = time.cor2 || "#000000";
  const cd = time.cor_detalhe || "#000000";

  return (
    <div className="card team-card">
      <div className="team-card__banner" style={{ "--c1": c1, "--c2": c2 }} />
      <div className="team-card__badge" style={{ "--cd": cd, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}>
        {time.escudo_url ? (
          <img src={time.escudo_url} alt={`Escudo ${time.nome}`} />
        ) : (
          <span className="team-card__sigla" style={{ color: cd, textShadow: getContrastShadow(cd) }}>
            {(time.abreviacao || "?").toUpperCase()}
          </span>
        )}
      </div>
      <div className="team-card__info team-card__info--with-badge">
        <div>
          <div className="team-card__title">{time.nome}</div>
          <div className="team-card__subtitle">{time.categoria || "—"}</div>
        </div>
        <div className="team-card__dots">
          <span className="team-card__dot" style={{ background: c1 }} />
          <span className="team-card__dot" style={{ background: c2 }} />
          <span className="team-card__dot" style={{ background: cd }} />
        </div>
      </div>
      <div className="team-card__actions">
        <div className="team-card__actions-row">
          <Link to={`/times/${time.id}`} className="btn btn--orange">Ver detalhes</Link>
        </div>
        <div className="team-card__actions-row">
          <button className="btn btn--orange" onClick={onEdit}>Editar</button>
          <button className="btn btn--red" onClick={onDelete}>Excluir</button>
        </div>
      </div>
    </div>
  );
}
