import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import PageHeader from "../components/PageHeader";
import ColorPickerCompact from "../components/ColorPickerCompact";

// Helpers para contraste/sombra adaptativa
function hexToRgb(hex) {
  const s = (hex || "#000000").replace("#", "");
  const n = parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
function shadowForText(textHex) {
  const L = luminance(textHex || "#000000");
  const shadow = L < 0.5 ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)";
  // duas camadas para dar leve contorno e profundidade
  return `0 1px 2px ${shadow}, 0 0 2px ${shadow}`;
}

export default function Times() {
  const usuario_id = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

  // Form
  const [nome, setNome] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [escudoUrl, setEscudoUrl] = useState("");
  const [cor1, setCor1] = useState("#FFFFFF");
  const [cor2, setCor2] = useState("#000000");
  const [corDetalhe, setCorDetalhe] = useState("#000000");

  // Listagem
  const [times, setTimes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  // Ordenação (padrão: alfabética)
  const [sortBy, setSortBy] = useState("alpha"); // 'alpha' | 'recent' | 'oldest'

  useEffect(() => {
    fetchTimes();
  }, []);

  async function fetchTimes() {
    const { data, error } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", usuario_id)
      .order("criado_em", { ascending: false });

    if (!error) setTimes(data || []);
  }

  function resetForm() {
    setNome("");
    setAbreviacao("");
    setCategoria("Futebol de Botão");
    setEscudoUrl("");
    setCor1("#FFFFFF");
    setCor2("#000000");
    setCorDetalhe("#000000");
    setEditandoId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (corDetalhe.toUpperCase() === cor1.toUpperCase()) {
      return alert("A cor de detalhe não pode ser igual à COR 1.");
    }
    const payload = {
      nome,
      abreviacao,
      categoria,
      escudo_url: escudoUrl || null,
      cor1,
      cor2,
      cor_detalhe: corDetalhe,
    };

    if (editandoId) {
      const { error } = await supabase.from("times").update(payload).eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar time");
      alert("✅ Time atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("times").insert([{ usuario_id, ...payload }]);
      if (error) return alert("❌ Erro ao cadastrar time");
      alert("✅ Time cadastrado!");
    }
    resetForm();
    fetchTimes();
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    const { error } = await supabase.from("times").delete().eq("id", id);
    if (!error) setTimes((prev) => prev.filter((t) => t.id !== id));
  }

  function handleEdit(t) {
    setEditandoId(t.id);
    setNome(t.nome);
    setAbreviacao((t.abreviacao || "").toUpperCase());
    setCategoria(t.categoria);
    setEscudoUrl(t.escudo_url || "");
    setCor1(t.cor1 || "#FFFFFF");
    setCor2(t.cor2 || "#000000");
    setCorDetalhe(t.cor_detalhe || "#000000");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const timesOrdenados = useMemo(() => {
    const arr = [...times];
    if (sortBy === "alpha") {
      arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    } else if (sortBy === "recent") {
      arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    } else if (sortBy === "oldest") {
      arr.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    }
    return arr;
  }, [times, sortBy]);

  return (
    <div>
      <PageHeader title="Times" subtitle="Cadastre, edite e gerencie os times da sua competição." />

      <div className="container" style={{ padding: 20 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          {/* FORM */}
          <form onSubmit={handleSubmit} className="card p-6 sticky" style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{editandoId ? "Editar Time" : "Novo Time"}</h2>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Nome do Time</label>
              <input
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Abreviação</label>
              <input
                className="input"
                value={abreviacao}
                onChange={(e) => setAbreviacao(e.target.value.toUpperCase())}
                placeholder="Ex: FLA"
                maxLength={5}
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Categoria</label>
              <select
                className="select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option>Futebol de Botão</option>
                <option>Futebol de Campo</option>
                <option>Futsal</option>
                <option>Society</option>
              </select>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Escudo (URL)</label>
              <input
                className="input"
                value={escudoUrl}
                onChange={(e) => setEscudoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Seletor compacto de cores (padrão do projeto) */}
            <ColorPickerCompact label="Cor 1" value={cor1} onChange={setCor1} />
            <ColorPickerCompact label="Cor 2" value={cor2} onChange={setCor2} />
            <ColorPickerCompact
              label="Cor detalhe"
              value={corDetalhe}
              onChange={setCorDetalhe}
              disableHex={cor1}
            />

            <div className="row mt-3" style={{ gap: 8 }}>
              <button className="btn btn--primary" type="submit">
                {editandoId ? "Atualizar Time" : "Salvar Time"}
              </button>
              {editandoId && (
                <button type="button" onClick={resetForm} className="btn btn--muted">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* LISTA / CONTROLES */}
          <div className="grid" style={{ gap: 16 }}>
            <div
              className="card card--soft p-6 row"
              style={{ justifyContent: "space-between", padding: 16 }}
            >
              <div className="row" style={{ gap: 10 }}>
                <h2 style={{ margin: 0 }}>Times</h2>
                <span className="badge">{times.length}</span>
              </div>
              {/* Ordenação (padrão: alfabética) */}
              <div className="row">
                <label className="label" htmlFor="ordem" style={{ margin: 0 }}>
                  Ordenar:
                </label>
                <select
                  id="ordem"
                  className="select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: "8px 10px" }}
                >
                  <option value="alpha">Ordem alfabética</option>
                  <option value="recent">Mais recente</option>
                  <option value="oldest">Mais antigo</option>
                </select>
              </div>
            </div>

            {timesOrdenados.length === 0 ? (
              <div className="card p-6" style={{ padding: 16 }}>
                <p>Nenhum time cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="grid grid-2" style={{ gap: 16 }}>
                {timesOrdenados.map((time) => {
                  const c1 = time.cor1 || "#FFFFFF";
                  const c2 = time.cor2 || "#000000";
                  const cd = time.cor_detalhe || "#000000";

                  return (
                    <li key={time.id} className="card" style={{ overflow: "hidden" }}>
                      {/* Banner com duas cores */}
                      <div
                        style={{
                          height: 96,
                          background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                          borderBottom: `4px solid ${cd}`,
                          position: "relative",
                        }}
                      >
                        {/* Escudo ou Sigla */}
                        <div style={{ position: "absolute", left: 16, bottom: -24 }}>
                          {time.escudo_url ? (
                            <img
                              src={time.escudo_url}
                              alt={time.nome}
                              style={{
                                width: 72,
                                height: 72,
                                objectFit: "contain",
                                borderRadius: 14,
                                background: "#fff",
                                border: `2px solid ${cd}`, // borda do escudo = cor detalhe
                                boxShadow: "var(--shadow-sm)",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 14,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: 18,
                                color: cd, // texto na cor detalhe
                                background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                                border: `2px solid ${cd}`, // borda da caixinha = cor detalhe
                                boxShadow: "var(--shadow-sm)",
                                textTransform: "uppercase",
                                textShadow: shadowForText(cd), // sombra adaptativa
                              }}
                            >
                              {(time.abreviacao || "")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Corpo do card */}
                      <div style={{ padding: "24px 16px 16px" }}>
                        <div
                          className="row"
                          style={{ justifyContent: "space-between", marginBottom: 8 }}
                        >
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{time.nome}</div>
                            <div style={{ fontSize: 13, color: "var(--muted)" }}>
                              {time.categoria}
                            </div>
                          </div>
                          {/* Mini paleta */}
                          <div className="row" style={{ gap: 6 }}>
                            <span
                              className="palette-dot"
                              title="Cor 1"
                              style={{ background: c1, borderColor: cd }}
                            />
                            <span
                              className="palette-dot"
                              title="Cor 2"
                              style={{ background: c2, borderColor: cd }}
                            />
                            <span
                              className="palette-dot"
                              title="Detalhe"
                              style={{ background: cd, borderColor: cd }}
                            />
                          </div>
                        </div>

                        {/* Ações: laranja, exceto excluir vermelho */}
                          <div className="grid grid-2" style={{ gap: 8, marginTop: 10 }}>
                            <Link
                              to={`/jogadores?time=${time.id}&name=${encodeURIComponent(time.nome)}`}
                              className="btn btn--orange"
                              style={{ textAlign: "center", padding: "10px 12px" }}
                            >
                              Ver jogadores
                            </Link>
                            <Link
                              to={`/campeonatos?time=${time.id}&name=${encodeURIComponent(time.nome)}`}
                              className="btn btn--orange"
                              style={{ textAlign: "center", padding: "10px 12px" }}
                            >
                              Ver campeonatos
                            </Link>
                            <button
                              onClick={() => handleEdit(time)}
                              className="btn btn--orange"
                              style={{ padding: "10px 12px" }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(time.id)}
                              className="btn btn--red"
                              style={{ padding: "10px 12px" }}
                            >
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
    </div>
  );
}
