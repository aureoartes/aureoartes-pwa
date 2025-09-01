// src/pages/Jogadores.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import CollapsibleSection from "../components/CollapsibleSection.jsx";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function Jogadores() {
  const [searchParams] = useSearchParams();
  const preTimeId = searchParams.get("time") || null;

  // Form
  const [timeId, setTimeId] = useState(preTimeId || "");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [numero, setNumero] = useState("");
  const [posicao, setPosicao] = useState(""); // salva como NULL quando vazio
  const [fotoUrl, setFotoUrl] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  // Dados
  const [times, setTimes] = useState([]);
  const [timesById, setTimesById] = useState({});
  const [jogadores, setJogadores] = useState([]);

  // Ordenação e filtro
  const [sortBy, setSortBy] = useState("alpha");
  const [filtroTime, setFiltroTime] = useState(preTimeId || "todos"); // "todos" | "sem_time" | <time_id>

  useEffect(() => {
    (async () => {
      await fetchTimes();
      await fetchJogadores();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTimes() {
    const { data } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });

    setTimes(data || []);
    const map = {};
    (data || []).forEach((t) => (map[t.id] = t));
    setTimesById(map);

    // se veio com time pré-selecionado na URL e existe, trave o filtro nele
    if (preTimeId && (data || []).some((t) => t.id === preTimeId)) {
      setTimeId(preTimeId);
      setFiltroTime(preTimeId);
    }
  }

  async function fetchJogadores() {
    const { data } = await supabase
      .from("jogadores")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("criado_em", { ascending: false });

    setJogadores(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    // aplica o filtro atual como padrão de time ao abrir o form
    if (filtroTime !== "todos" && filtroTime !== "sem_time") {
      setTimeId(filtroTime);
    } else {
      setTimeId("");
    }
    setNome("");
    setApelido("");
    setNumero("");
    setPosicao("");
    setFotoUrl("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (filtroTime !== "sem_time" && !timeId) {
      return alert("Selecione um time ou use a opção 'Sem time'.");
    }

    const payload = {
      usuario_id: USUARIO_ID,
      time_id: timeId || null,                    // null quando vazio
      nome,
      apelido: apelido || null,
      numero: numero ? Number(numero) : null,
      posicao: posicao || null,                   // null quando vazio
      foto_url: fotoUrl || null,
    };

    if (editandoId) {
      const { error } = await supabase.from("jogadores").update(payload).eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar jogador");
      alert("✅ Jogador atualizado!");
    } else {
      const { error } = await supabase.from("jogadores").insert([payload]);
      if (error) return alert("❌ Erro ao cadastrar jogador");
      alert("✅ Jogador cadastrado!");
    }
    resetForm();
    fetchJogadores();
    setFormOpen(false);
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
    setNumero(j.numero ?? "");
    setPosicao(j.posicao || "");
    setFotoUrl(j.foto_url || "");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const jogadoresFiltrados = useMemo(() => {
    let arr = [...jogadores];

    if (filtroTime !== "todos") {
      if (filtroTime === "sem_time") {
        arr = arr.filter((j) => j.time_id == null);
      } else {
        arr = arr.filter((j) => j.time_id === filtroTime);
      }
    }

    if (sortBy === "alpha") arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    else if (sortBy === "numero_asc") arr.sort((a, b) => (a.numero ?? 9999) - (b.numero ?? 9999));
    else if (sortBy === "numero_desc") arr.sort((a, b) => (b.numero ?? -1) - (a.numero ?? -1));
    else if (sortBy === "recent") arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));

    return arr;
  }, [jogadores, filtroTime, sortBy]);

  return (
    <div className="container">
      <div className="grid">
        {/* HEADER BOX (título + filtros + ordenar + botão novo) */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0 }}>Jogadores</h1>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                Crie, edite e gerencie seus atletas.
              </div>
            </div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 6 }}>
                <label className="label" htmlFor="f-time" style={{ margin: 0 }}>Time:</label>
                <select
                  id="f-time"
                  className="select"
                  value={filtroTime}
                  onChange={(e) => setFiltroTime(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="sem_time">Sem time</option>
                  {times.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="row" style={{ gap: 6 }}>
                <label className="label" htmlFor="ordem" style={{ margin: 0 }}>Ordenar:</label>
                <select
                  id="ordem"
                  className="select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="alpha">Alfabética</option>
                  <option value="numero_asc">Número (cresc.)</option>
                  <option value="numero_desc">Número (decresc.)</option>
                  <option value="recent">Mais recente</option>
                </select>
              </div>

              <button
                className="btn btn--orange"
                onClick={() => {
                  resetForm();                  // já seta time conforme filtro
                  setFormOpen(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                + Novo Jogador
              </button>
            </div>
          </div>
        </div>

        {/* FORM COLLAPSÁVEL */}
        <CollapsibleSection
          title={editandoId ? "Editar Jogador" : "Novo Jogador"}
          subtitle="Toque para abrir e cadastrar"
          open={formOpen}
          onToggle={(nextOpen) => {
            setFormOpen(nextOpen);
            if (nextOpen && !editandoId) {
              // ao abrir manualmente, mantemos o padrão do filtro
              if (filtroTime !== "todos" && filtroTime !== "sem_time") {
                setTimeId(filtroTime);
              } else {
                setTimeId("");
              }
            }
          }}
        >
          <form onSubmit={handleSubmit} className="grid">
            <div className="field">
              <label className="label">Time</label>
              <select
                className="select"
                value={timeId}
                onChange={(e) => setTimeId(e.target.value)}
                // se quiser permitir criar jogador "sem time", deixe sem required
              >
                <option value="">Sem time</option>
                {times.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="label">Nome</label>
              <input
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Apelido (opcional)</label>
                <input
                  className="input"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                />
              </div>
              <div className="field">
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
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Posição</label>
                <select
                  className="select"
                  value={posicao}
                  onChange={(e) => setPosicao(e.target.value)}
                >
                  <option value="">(em branco)</option>
                  <option value="GOL">GOL</option>
                  <option value="DEF">DEF</option>
                  <option value="MEI">MEI</option>
                  <option value="ATA">ATA</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Foto (URL)</label>
                <input
                  className="input"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn btn--primary" type="submit">
                {editandoId ? "Atualizar Jogador" : "Salvar Jogador"}
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

        {/* LISTA (compacta) */}
        {jogadoresFiltrados.length === 0 ? (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: 0 }}>Nenhum jogador cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="list card">
            {jogadoresFiltrados.map((j) => {
              const t = timesById[j.time_id] || {};
              const c1 = t.cor1 || "#FFFFFF";
              const c2 = t.cor2 || "#000000";
              const cd = t.cor_detalhe || "#000000";
              const clube = t.nome || "—";

              const linha1 = j.apelido?.trim() ? j.apelido : j.nome;
              const partes = [];
              if (j.nome) partes.push(j.nome);
              if (j.numero || j.numero === 0) partes.push(`#${j.numero}`);
              if (j.posicao) partes.push(j.posicao);
              if (clube) partes.push(clube);
              const linha2 = partes.join(" — ");

              return (
                <li key={j.id} className="list__item" style={{ padding: "8px 10px" }}>
                  <div className="list__left">
                    <span
                      aria-hidden
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        display: "inline-block",
                        background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                        border: `2px solid ${cd}`
                      }}
                    />
                    <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <div className="list__title" title={linha1}>{linha1}</div>
                      <div className="list__subtitle" title={linha2}>{linha2}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(j)} className="btn btn--orange">Editar</button>
                    <button onClick={() => handleDelete(j.id)} className="btn btn--red">Excluir</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
