// src/pages/Times.jsx (atualizado conforme instruções)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { hexToRgb, luminance } from "../utils/colors";

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
  // ---------- Estado: dados ----------
  const [times, setTimes] = useState([]);
  const [regioes, setRegioes] = useState([]);

  // ---------- Estado: filtros / ordenação ----------
  const [ordenacao, setOrdenacao] = useState("alfabetica");
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  // ---------- Estado: formulário time ----------
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [escudoUrl, setEscudoUrl] = useState("");
  const [cor1, setCor1] = useState("#FFFFFF");
  const [cor2, setCor2] = useState("#000000");
  const [corDetalhe, setCorDetalhe] = useState("#000000");
  const [regiaoId, setRegiaoId] = useState("");

  // ---------- Estado: UI ----------
  const [abrirCadastro, setAbrirCadastro] = useState(false); // oculto por padrão
  const [abrirRegioes, setAbrirRegioes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------- Estado: CRUD regiões ----------
  const [regEditId, setRegEditId] = useState(null);
  const [regDescricao, setRegDescricao] = useState("");

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
    setAbrirCadastro(true); // abre somente ao editar
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
      if (error) {
        alert("❌ Erro ao atualizar time.");
      } else {
        alert("✅ Time atualizado!");
        await fetchTimes();
        resetForm();
        setAbrirCadastro(false); // fecha após salvar
      }
    } else {
      const { error } = await supabase.from("times").insert([payload]);
      if (error) {
        alert("❌ Erro ao cadastrar time.");
      } else {
        alert("✅ Time cadastrado!");
        await fetchTimes();
        resetForm();
        setAbrirCadastro(false); // fecha após salvar
      }
    }

    setSaving(false);
  }

  function startNovaRegiao() {
    setRegEditId(null);
    setRegDescricao("");
  }
  function startEditarRegiao(reg) {
    setRegEditId(reg.id);
    setRegDescricao(reg.descricao);
  }

  async function salvarRegiao(e) {
    e.preventDefault();
    if (!regDescricao.trim()) {
      alert("Informe a descrição da região.");
      return;
    }
    if (regEditId) {
      const { error } = await supabase
        .from("regioes")
        .update({ descricao: regDescricao })
        .eq("id", regEditId)
        .eq("usuario_id", USUARIO_ID);
      if (error) {
        alert("❌ Erro ao atualizar região.");
        return;
      }
    } else {
      const { error } = await supabase
        .from("regioes")
        .insert([{ usuario_id: USUARIO_ID, descricao: regDescricao }]);
      if (error) {
        alert("❌ Erro ao cadastrar região (talvez já exista com esse nome).");
        return;
      }
    }
    await fetchRegioes();
    startNovaRegiao();
  }

  async function excluirRegiao(id) {
    if (!confirm("Excluir esta região? Times vinculados ficarão sem região.")) return;
    const { error } = await supabase
      .from("regioes")
      .delete()
      .eq("id", id)
      .eq("usuario_id", USUARIO_ID);
    if (error) {
      alert("❌ Erro ao excluir região.");
      return;
    }
    await fetchRegioes();
    if (regiaoFiltroId === id) setRegiaoFiltroId("");
    if (regiaoId === id) setRegiaoId("");
  }

  const timesFiltrados = useMemo(() => {
    let arr = [...(times || [])];

    if (regiaoFiltroId) {
      arr = arr.filter((t) => t.regiao_id === regiaoFiltroId);
    }

    if (ordenacao === "alfabetica") {
      arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    } else if (ordenacao === "mais_recente") {
      arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    } else if (ordenacao === "mais_antigo") {
      arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    }

    return arr;
  }, [times, ordenacao, regiaoFiltroId]);

  return (
    <div className="container">
      {/* Header da página */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Times</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Cadastre, edite e gerencie os times da sua competição.
            </div>
          </div>

          {/* Filtros + botão Novo Time */}
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 8 }}>
              <label className="label" style={{ margin: 0 }}>Ordenar:</label>
              <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
                <option value="alfabetica">Ordem alfabética</option>
                <option value="mais_recente">Mais recente</option>
                <option value="mais_antigo">Mais antigo</option>
              </select>

              <label className="label" style={{ margin: "0 0 0 8px" }}>Região:</label>
              <select
                className="select"
                value={regiaoFiltroId}
                onChange={(e) => setRegiaoFiltroId(e.target.value)}
                style={{ minWidth: 160 }}
              >
                <option value="">Todas</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>{r.descricao}</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn--orange"
              onClick={() => { resetForm(); setAbrirCadastro(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              + Novo Time
            </button>
          </div>
        </div>
      </div>

      {/* Formulário SEM header colapsável (visível somente quando abrirCadastro=true) */}
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
                  <label className="label">Nome do Time</label>
                  <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">Abreviação (SIGLA)</label>
                  <input className="input" value={abreviacao} onChange={(e) => setAbreviacao(e.target.value.toUpperCase())} required />
                </div>
                <div className="field">
                  <label className="label">Categoria</label>
                  <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                    <option>Futebol de Botão</option>
                    <option>Futebol de Campo</option>
                    <option>Futsal</option>
                    <option>Society</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Escudo (URL)</label>
                  <input className="input" value={escudoUrl} onChange={(e) => setEscudoUrl(e.target.value)} placeholder="https://..." />
                </div>

                {/* Cores */}
                <div className="field">
                  <label className="label">Cor 1</label>
                  <CompactColorSelector value={cor1} onChange={setCor1} />
                </div>
                <div className="field">
                  <label className="label">Cor 2</label>
                  <CompactColorSelector value={cor2} onChange={setCor2} />
                </div>
                <div className="field">
                  <label className="label">Cor detalhe</label>
                  <CompactColorSelector value={corDetalhe} onChange={setCorDetalhe} />
                </div>

                {/* Região (opcional) + botão + */}
                <div className="field">
                  <label className="label">Região (opcional)</label>
                  <div className="row" style={{ gap: 8 }}>
                    <select className="select" value={regiaoId} onChange={(e) => setRegiaoId(e.target.value)} style={{ flex: 1 }}>
                      <option value="">Sem região</option>
                      {regioes.map((r) => (
                        <option key={r.id} value={r.id}>{r.descricao}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn--muted" title="Gerenciar regiões" onClick={() => { setAbrirRegioes(true); startNovaRegiao(); }}>
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn--orange" type="submit" disabled={saving}>
                  {editandoId ? "Salvar Alterações" : "Salvar Time"}
                </button>
                <button className="btn btn--muted" type="button" onClick={() => { resetForm(); setAbrirCadastro(false); }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gerenciador de Regiões (opcional) */}
      {abrirRegioes && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Regiões</h3>
            <button className="btn btn--muted" onClick={() => setAbrirRegioes(false)}>Fechar</button>
          </div>

          <form onSubmit={salvarRegiao} style={{ marginTop: 10 }}>
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Descrição</label>
                <input className="input" value={regDescricao} onChange={(e) => setRegDescricao(e.target.value)} placeholder="Ex.: Zona Sul, Bairro X..." />
              </div>
              <div className="field">
                <label className="label">&nbsp;</label>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--orange" type="submit">{regEditId ? "Salvar Região" : "Adicionar Região"}</button>
                  {regEditId && (
                    <button className="btn btn--muted" type="button" onClick={startNovaRegiao}>Nova</button>
                  )}
                </div>
              </div>
            </div>
          </form>

          <ul className="list" style={{ marginTop: 10 }}>
            {regioes.length === 0 ? (
              <li className="list__item"><div className="text-muted">Nenhuma região cadastrada ainda.</div></li>
            ) : (
              regioes.map((r) => (
                <li key={r.id} className="list__item">
                  <div className="list__left">
                    <div className="list__title">{r.descricao}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn--orange" onClick={() => startEditarRegiao(r)}>Editar</button>
                    <button className="btn btn--red" onClick={() => excluirRegiao(r.id)}>Excluir</button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Lista de times (cards) */}
      <div className="grid grid-3">
        {loading ? (
          <div className="card" style={{ padding: 14 }}>Carregando…</div>
        ) : timesFiltrados.length === 0 ? (
          <div className="card" style={{ padding: 14 }}>
            Nenhum time encontrado {regiaoFiltroId ? "para a região selecionada." : "ainda."}
          </div>
        ) : (
          timesFiltrados.map((time) => (
            <TeamCard
              key={time.id}
              time={time}
              onEdit={() => handleEdit(time)}
              onDelete={() => handleDelete(time.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CompactColorSelector({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {COLOR_OPTIONS.map((c) => {
        const selected = value?.toLowerCase() === c.value.toLowerCase();
        return (
          <button
            key={c.key}
            type="button"
            title={c.key}
            onClick={() => onChange(c.value)}
            style={{
              width: 22, height: 22, borderRadius: 999,
              border: selected ? "3px solid #FB8C00" : "2px solid rgba(0,0,0,.15)",
              background: c.value,
              boxShadow: selected ? "0 0 0 3px rgba(251,140,0,.15)" : "none",
              cursor: "pointer"
            }}
          />
        );
      })}
    </div>
  );
}

function TeamCard({ time, onEdit, onDelete }) {
  const c1 = time.cor1 || "#FFFFFF";
  const c2 = time.cor2 || "#000000";
  const cd = time.cor_detalhe || "#000000";

  const textShadowForBadge = (() => {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    const avgLum = (luminance(rgb1) + luminance(rgb2)) / 2;
    return avgLum > 0.5
      ? "0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.6)"
      : "0 1px 2px rgba(255,255,255,.9), 0 0 1px rgba(255,255,255,.85)";
  })();

  return (
    <div className="card team-card">
      <div className="team-card__banner" style={{ ["--c1"]: c1, ["--c2"]: c2 }} />
      <div className="team-card__badge" style={{ ["--cd"]: cd, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}>
        {time.escudo_url ? (
          <img src={time.escudo_url} alt={`Escudo ${time.nome}`} />
        ) : (
          <span className="team-card__sigla" style={{ color: cd, textShadow: textShadowForBadge }}>
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

      {/* Ações: substituir por Ver detalhes + Editar/Excluir */}
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
