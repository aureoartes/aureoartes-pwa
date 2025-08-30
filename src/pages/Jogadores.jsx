import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import PageHeader from "../components/PageHeader";

// Helpers (mantidos caso precise de contraste/sombra no futuro)
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

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function Jogadores() {
  const [searchParams] = useSearchParams();
  const preTimeId = searchParams.get("time") || null;
  const preTimeName = searchParams.get("name") || null;

  // Form
  const [timeId, setTimeId] = useState(preTimeId || "");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [numero, setNumero] = useState("");
  const [posicao, setPosicao] = useState(""); // <- sem "-vazio-"
  const [fotoUrl, setFotoUrl] = useState("");

  const [editandoId, setEditandoId] = useState(null);

  // Dados
  const [times, setTimes] = useState([]);
  const [timesById, setTimesById] = useState({});
  const [jogadores, setJogadores] = useState([]);

  // Ordenação e filtro
  const [sortBy, setSortBy] = useState("alpha"); // 'alpha' | 'numero_asc' | 'numero_desc' | 'recent'
  const [filtroTime, setFiltroTime] = useState(preTimeId || "todos");

  useEffect(() => {
    fetchTimes().then(() => {
      fetchJogadores();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTimes() {
    const { data, error } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });

    if (!error) {
      setTimes(data || []);
      const map = {};
      (data || []).forEach((t) => (map[t.id] = t));
      setTimesById(map);

      if (preTimeId) {
        const existe = (data || []).some((t) => t.id === preTimeId);
        if (existe) {
          setTimeId(preTimeId);
          setFiltroTime(preTimeId);
        }
      }
    }
  }

  async function fetchJogadores() {
    const { data, error } = await supabase
      .from("jogadores")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("criado_em", { ascending: false });

    if (!error) setJogadores(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setTimeId(preTimeId || "");
    setNome("");
    setApelido("");
    setNumero("");
    setPosicao(""); // <- volta a vazio
    setFotoUrl("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!timeId) {
      alert("Selecione um time.");
      return;
    }

    const payload = {
      usuario_id: USUARIO_ID,
      time_id: timeId,
      nome,
      apelido: apelido || null,
      numero: numero ? Number(numero) : null,
      posicao: posicao || null, // <- envia NULL quando vazio
      foto_url: fotoUrl || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("jogadores")
        .update(payload)
        .eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar jogador");
      alert("✅ Jogador atualizado!");
    } else {
      const { error } = await supabase.from("jogadores").insert([payload]);
      if (error) return alert("❌ Erro ao cadastrar jogador");
      alert("✅ Jogador cadastrado!");
    }

    resetForm();
    fetchJogadores();
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este jogador?")) return;
    const { error } = await supabase.from("jogadores").delete().eq("id", id);
    if (!error) setJogadores((prev) => prev.filter((j) => j.id !== id));
  }

  function handleEdit(j) {
    setEditandoId(j.id);
    setTimeId(j.time_id || "");
    setNome(j.nome || "");
    setApelido(j.apelido || "");
    setNumero(j.numero || "");
    setPosicao(j.posicao || ""); // <- carrega vazio se NULL
    setFotoUrl(j.foto_url || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const jogadoresFiltrados = useMemo(() => {
    let arr = [...jogadores];
    if (filtroTime !== "todos") {
      arr = arr.filter((j) => j.time_id === filtroTime);
    }
    if (sortBy === "alpha") {
      arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    } else if (sortBy === "numero_asc") {
      arr.sort(
        (a, b) => (a.numero ?? Number.MAX_SAFE_INTEGER) - (b.numero ?? Number.MAX_SAFE_INTEGER)
      );
    } else if (sortBy === "numero_desc") {
      arr.sort(
        (a, b) => (b.numero ?? Number.MIN_SAFE_INTEGER) - (a.numero ?? Number.MIN_SAFE_INTEGER)
      );
    } else if (sortBy === "recent") {
      arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    }
    return arr;
  }, [jogadores, filtroTime, sortBy]);

  return (
    <div>
      <PageHeader
        title={`Jogadores${preTimeName ? ` — ${preTimeName}` : ""}`}
        subtitle="Cadastre atletas, números, posições e associe ao time."
      />

      <div className="container" style={{ padding: 20 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          {/* FORM */}
          <form onSubmit={handleSubmit} className="card p-6 sticky" style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{editandoId ? "Editar Jogador" : "Novo Jogador"}</h2>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Time</label>
              <select
                className="select"
                value={timeId}
                onChange={(e) => setTimeId(e.target.value)}
                required
              >
                {!preTimeId && <option value="">Selecione um time...</option>}
                {times.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Nome</label>
              <input
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Apelido (opcional)</label>
              <input
                className="input"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex.: Nené, Zico…"
              />
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label className="label">Número</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={999}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex.: 10"
                />
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label className="label">Posição</label>
                <select
                  className="select"
                  value={posicao}
                  onChange={(e) => setPosicao(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="GOL">GOL</option>
                  <option value="DEF">DEF</option>
                  <option value="MEI">MEI</option>
                  <option value="ATA">ATA</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label className="label">Foto (URL)</label>
              <input
                className="input"
                value={fotoUrl}
                onChange={(e) => setFotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="row mt-3" style={{ gap: 8 }}>
              <button className="btn btn--primary" type="submit">
                {editandoId ? "Atualizar Jogador" : "Salvar Jogador"}
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
              className="card card--soft p-6"
              style={{
                padding: 16,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0 }}>Jogadores</h2>
                <span className="badge">{jogadoresFiltrados.length}</span>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {/* Filtro por time */}
                <div className="row" style={{ gap: 6 }}>
                  <label className="label" htmlFor="f-time" style={{ margin: 0 }}>
                    Time:
                  </label>
                  <select
                    id="f-time"
                    className="select"
                    value={filtroTime}
                    onChange={(e) => setFiltroTime(e.target.value)}
                    style={{ padding: "8px 10px" }}
                  >
                    <option value="todos">Todos</option>
                    {times.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ordenação */}
                <div className="row" style={{ gap: 6 }}>
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
                    <option value="numero_asc">Número (cresc.)</option>
                    <option value="numero_desc">Número (decresc.)</option>
                    <option value="recent">Mais recente</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LISTA EM LINHA DUPLA */}
            {jogadoresFiltrados.length === 0 ? (
              <div className="card p-6" style={{ padding: 16 }}>
                <p>Nenhum jogador cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="card p-6" style={{ padding: 0 }}>
                {jogadoresFiltrados.map((j) => {
                  const t = timesById[j.time_id] || {};
                  const c1 = t.cor1 || "#FFFFFF";
                  const c2 = t.cor2 || "#000000";
                  const cd = t.cor_detalhe || "#000000";
                  const clube = t.nome || "—";

                  const icon = (
                    <span
                      aria-hidden
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "inline-block",
                        background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                        border: `2px solid ${cd}`,
                        boxSizing: "border-box",
                      }}
                    />
                  );

                  const linha1 =
                    j.apelido && j.apelido.trim().length > 0 ? j.apelido : j.nome;

                  const partes = [];
                  if (j.nome) partes.push(j.nome);
                  if (j.numero !== null && j.numero !== undefined && j.numero !== "")
                    partes.push(`#${j.numero}`);
                  if (j.posicao) partes.push(j.posicao);
                  if (clube) partes.push(clube);
                  const linha2 = partes.join(" — ");

                  return (
                    <li
                      key={j.id}
                      style={{
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "#fff",
                      }}
                    >
                      {/* Esquerda: ícone + textos */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        {icon}
                        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              maxWidth: "50vw",
                            }}
                            title={linha1}
                          >
                            {linha1}
                          </div>
                          <div
                            style={{
                              color: "var(--muted)",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              maxWidth: "60vw",
                            }}
                            title={linha2}
                          >
                            {linha2}
                          </div>
                        </div>
                      </div>

                      {/* Direita: botões compactos */}
                      <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleEdit(j)}
                          className="btn btn--orange"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(j.id)}
                          className="btn btn--red"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                          title="Excluir"
                        >
                          Excluir
                        </button>
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
