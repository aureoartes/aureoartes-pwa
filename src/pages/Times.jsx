import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import CollapsibleSection from "../components/CollapsibleSection.jsx";
import ColorPickerCompact from "../components/ColorPickerCompact";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";
const CATEGORIAS = ["Futebol de Botão", "Futebol de Campo", "Futsal", "Society"];

export default function Times() {
  // form states
  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [nome, setNome] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [escudoUrl, setEscudoUrl] = useState("");
  const [cor1, setCor1] = useState("#ffffff");
  const [cor2, setCor2] = useState("#000000");
  const [corDetalhe, setCorDetalhe] = useState("#000000");

  // data
  const [times, setTimes] = useState([]);
  const [ordem, setOrdem] = useState("alpha"); // alpha | recent | oldest

  useEffect(() => { fetchTimes(); }, []);

  async function fetchTimes() {
    const { data } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });
    setTimes(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setNome("");
    setAbreviacao("");
    setCategoria("Futebol de Botão");
    setEscudoUrl("");
    setCor1("#ffffff");
    setCor2("#000000");
    setCorDetalhe("#000000");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (corDetalhe.toLowerCase() === cor1.toLowerCase()) {
      alert("A cor detalhe não pode ser igual à cor 1.");
      return;
    }
    const payload = {
      usuario_id: USUARIO_ID,
      nome,
      abreviacao: abreviacao.toUpperCase(),
      categoria,
      escudo_url: escudoUrl || null,
      cor1, cor2, cor_detalhe: corDetalhe,
    };
    if (editandoId) {
      const { error } = await supabase.from("times").update(payload).eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar time");
      alert("✅ Time atualizado!");
    } else {
      const { error } = await supabase.from("times").insert([payload]);
      if (error) return alert("❌ Erro ao cadastrar time");
      alert("✅ Time cadastrado!");
    }
    resetForm();
    await fetchTimes();
    setFormOpen(false); // fecha após salvar
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    const { error } = await supabase.from("times").delete().eq("id", id);
    if (!error) setTimes((prev) => prev.filter((t) => t.id !== id));
  }

  function handleEdit(t) {
    setEditandoId(t.id);
    setNome(t.nome);
    setAbreviacao(t.abreviacao);
    setCategoria(t.categoria);
    setEscudoUrl(t.escudo_url || "");
    setCor1(t.cor1 || "#ffffff");
    setCor2(t.cor2 || "#000000");
    setCorDetalhe(t.cor_detalhe || "#000000");
    setFormOpen(true); // abre ao editar
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const timesOrdenados = useMemo(() => {
    const arr = [...times];
    if (ordem === "alpha") arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (ordem === "recent") arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    if (ordem === "oldest") arr.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    return arr;
  }, [times, ordem]);

  // util p/ sombra dinâmica da sigla
  const isHexLight = (hex) => {
    const h = (hex || "#000").replace("#","").padStart(6,"0");
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    const L = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return L > 0.6;
  };

  return (
    <div className="container">
      <div className="grid">
        {/* HEADER BOX (título + subtítulo + ordenação) */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0 }}>Times</h1>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                Crie, edite e gerencie os times da sua competição.
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="label" htmlFor="ordem" style={{ margin: 0 }}>Ordenar:</label>
              <select id="ordem" className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                <option value="alpha">Ordem alfabética</option>
                <option value="recent">Mais recente</option>
                <option value="oldest">Mais antigo</option>
              </select>
            </div>
          </div>
        </div>

        {/* FORM COLLAPSADO CONTROLADO */}
        <CollapsibleSection
          title={editandoId ? "Editar Time" : "Novo Time"}
          subtitle="Toque para abrir e cadastrar"
          open={formOpen}
          onToggle={setFormOpen}
        >
          <form onSubmit={handleSubmit} className="grid">
            <div className="field">
              <label className="label">Nome do Time</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Abreviação</label>
                <input
                  className="input"
                  value={abreviacao}
                  onChange={(e) => setAbreviacao(e.target.value.toUpperCase())}
                  maxLength={5}
                  required
                />
              </div>
              <div className="field">
                <label className="label">Categoria</label>
                <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="label">Escudo (URL)</label>
              <input className="input" value={escudoUrl} onChange={(e) => setEscudoUrl(e.target.value)} placeholder="https://..." />
            </div>

            {/* CORES */}
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Cor 1</label>
                <ColorPickerCompact value={cor1} onChange={setCor1} />
              </div>
              <div className="field">
                <label className="label">Cor 2</label>
                <ColorPickerCompact value={cor2} onChange={setCor2} />
              </div>
            </div>
            <div className="field">
              <label className="label">Cor Detalhe</label>
              <ColorPickerCompact value={corDetalhe} onChange={setCorDetalhe} />
            </div>

            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn--primary">
                {editandoId ? "Atualizar Time" : "Salvar Time"}
              </button>
              {editandoId && (
                <button
                  type="button"
                  onClick={() => { resetForm(); setFormOpen(false); }}
                  className="btn btn--muted"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </CollapsibleSection>

        {/* LISTA DE CARDS (auto 2–3 colunas conforme largura) */}
        <div className="card" style={{ padding: 12 }}>
          {timesOrdenados.length === 0 ? (
            <p style={{ margin: 8 }}>Nenhum time cadastrado ainda.</p>
          ) : (
            <ul className="grid grid-2" style={{ gap: 12, padding: 0, listStyle: "none" }}>
              {timesOrdenados.map((time) => {
                const c1 = time.cor1 || "#ffffff";
                const c2 = time.cor2 || "#000000";
                const cd = time.cor_detalhe || "#000000";
                const sigla = (time.abreviacao || "").toUpperCase();

                const siglaShadow = isHexLight(cd)
                  ? "0 1px 2px rgba(0,0,0,.65), 0 0 2px rgba(0,0,0,.85)"
                  : "0 1px 2px rgba(255,255,255,.65), 0 0 2px rgba(255,255,255,.95)";

                return (
                  <li key={time.id} className="team-card card" style={{ padding: 0 }}>
                    {/* Banner com diagonal */}
                    <div className="team-card__banner" style={{ "--c1": c1, "--c2": c2, "--cd": cd }} />

                    {/* Badge (sigla/escudo) sobreposto */}
                    <div className="team-card__badge" style={{ "--c1": c1, "--c2": c2, "--cd": cd }}>
                      {time.escudo_url ? (
                        <img src={time.escudo_url} alt={`Escudo ${time.nome}`} />
                      ) : (
                        <div className="team-card__sigla" style={{ color: cd, textShadow: siglaShadow }}>
                          {sigla}
                        </div>
                      )}
                    </div>

                    {/* Nome + paleta alinhados com o badge */}
                    <div className="team-card__info team-card__info--with-badge">
                      <div style={{ minWidth: 0 }}>
                        <div className="team-card__title">{time.nome}</div>
                        <div className="team-card__subtitle">{time.categoria}</div>
                      </div>
                      <div className="team-card__dots" aria-label="Paleta do time">
                        <span className="team-card__dot" style={{ background: c1 }} />
                        <span className="team-card__dot" style={{ background: c2 }} />
                        <span className="team-card__dot" style={{ background: cd }} />
                      </div>
                    </div>

                    {/* AÇÕES: 1ª linha (ver...), 2ª linha (editar/excluir) */}
                    <div className="team-card__actions">
                      <div className="team-card__actions-row">
                        <Link
                          to={`/jogadores?time=${time.id}&name=${encodeURIComponent(time.nome)}`}
                          className="btn btn--orange"
                        >
                          Ver jogadores
                        </Link>
                        <Link
                          to={`/campeonatos?time=${time.id}&name=${encodeURIComponent(time.nome)}`}
                          className="btn btn--orange"
                        >
                          Ver campeonatos
                        </Link>
                      </div>
                      <div className="team-card__actions-row">
                        <button onClick={() => handleEdit(time)} className="btn btn--orange">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(time.id)} className="btn btn--red">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
