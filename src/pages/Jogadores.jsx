// src/pages/Jogadores.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ListaCompactaItem from "../components/ListaCompactaItem";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function Jogadores() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const timeParam = urlParams.get("time") || "";

  // Dados
  const [jogadores, setJogadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [timesById, setTimesById] = useState({});

  // Filtros
  const [timeFiltroId, setTimeFiltroId] = useState(timeParam);

  // Form (cadastro/edição)
  const [abrirCadastro, setAbrirCadastro] = useState(false); // oculto por padrão
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [numero, setNumero] = useState("");
  const [posicao, setPosicao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [timeId, setTimeId] = useState(timeParam || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carrega dados iniciais
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchTimes(), fetchJogadores()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se o filtro de time mudar, recarrega jogadores
  useEffect(() => {
    fetchJogadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFiltroId]);

  async function fetchTimes() {
    const { data } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });
    const arr = data || [];
    setTimes(arr);
    const map = {};
    arr.forEach((t) => (map[t.id] = t));
    setTimesById(map);
  }

  async function fetchJogadores() {
    let query = supabase
      .from("jogadores")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });

    if (timeFiltroId) query = query.eq("time_id", timeFiltroId);

    const { data } = await query;
    setJogadores(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setNome("");
    setApelido("");
    setNumero("");
    setPosicao("");
    setFotoUrl("");
    setTimeId(timeFiltroId || ""); // se há filtro, usa como default
  }

  function startNovo() {
    resetForm();
    setAbrirCadastro(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditar(j) {
    setEditandoId(j.id);
    setNome(j.nome || "");
    setApelido(j.apelido || "");
    setNumero(j.numero ?? "");
    setPosicao(j.posicao || "");
    setFotoUrl(j.foto_url || "");
    setTimeId(j.time_id || "");
    setAbrirCadastro(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este jogador?")) return;
    const { error } = await supabase.from("jogadores").delete().eq("id", id);
    if (error) {
      alert("❌ Erro ao excluir jogador.");
      return;
    }
    setJogadores((prev) => prev.filter((x) => x.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!timeId) {
      alert("Selecione um time para o jogador.");
      return;
    }
    setSaving(true);
    const payload = {
      usuario_id: USUARIO_ID,
      time_id: timeId,
      nome,
      apelido: apelido || null,
      numero: numero === "" ? null : Number(numero),
      posicao: posicao || null,
      foto_url: fotoUrl || null,
    };

    if (editandoId) {
      const { error } = await supabase.from("jogadores").update(payload).eq("id", editandoId);
      if (error) alert("❌ Erro ao atualizar jogador.");
      else {
        alert("✅ Jogador atualizado!");
        await fetchJogadores();
        resetForm();
        setAbrirCadastro(false); // fecha após salvar
      }
    } else {
      const { error } = await supabase.from("jogadores").insert([payload]);
      if (error) alert("❌ Erro ao cadastrar jogador.");
      else {
        alert("✅ Jogador cadastrado!");
        await fetchJogadores();
        resetForm();
        setAbrirCadastro(false); // fecha após salvar
      }
    }

    setSaving(false);
  }

  const jogadoresFiltrados = useMemo(() => {
    // (já vem filtrado pelo fetch; deixamos aqui caso queira outro filtro futuro)
    return jogadores || [];
  }, [jogadores]);

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Jogadores</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Cadastre, edite e gerencie jogadores. Use o filtro para focar em um time.
            </div>
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <label className="label" style={{ margin: 0 }}>Time:</label>
            <select
              className="select"
              value={timeFiltroId}
              onChange={(e) => setTimeFiltroId(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">Todos</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>

            <button className="btn btn--orange" onClick={startNovo}>
              + Novo Jogador
            </button>
          </div>
        </div>
      </div>

      {/* Cadastro (oculto por padrão) */}
      {abrirCadastro && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div className="collapsible__title">{editandoId ? "Editar Jogador" : "Cadastrar Jogador"}</div>
            <button className="btn btn--muted" onClick={() => { resetForm(); setAbrirCadastro(false); }}>
              Fechar
            </button>
          </div>

          <div style={{ padding: 12 }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Time</label>
                  <select
                    className="select"
                    value={timeId}
                    onChange={(e) => setTimeId(e.target.value)}
                    required
                  >
                    <option value="">Selecione…</option>
                    {times.map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Nome</label>
                  <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>

                <div className="field">
                  <label className="label">Apelido (opcional)</label>
                  <input className="input" value={apelido} onChange={(e) => setApelido(e.target.value)} />
                </div>

                <div className="field">
                  <label className="label">Número (opcional)</label>
                  <input
                    className="input"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.replace(/\D+/g, ""))}
                    inputMode="numeric"
                    placeholder="Ex.: 10"
                  />
                </div>

                <div className="field">
                  <label className="label">Posição (opcional)</label>
                  <input className="input" value={posicao} onChange={(e) => setPosicao(e.target.value)} placeholder="Ex.: Atacante" />
                </div>

                <div className="field">
                  <label className="label">Foto (URL) (opcional)</label>
                  <input className="input" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn--orange" type="submit" disabled={saving}>
                  {editandoId ? "Salvar Alterações" : "Salvar Jogador"}
                </button>
                <button className="btn btn--muted" type="button" onClick={() => { resetForm(); setAbrirCadastro(false); }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista compacta */}
      {loading ? (
        <div className="card" style={{ padding: 14 }}>Carregando…</div>
      ) : jogadoresFiltrados.length === 0 ? (
        <div className="card" style={{ padding: 14 }}>
          Nenhum jogador encontrado{timeFiltroId ? " para o time selecionado." : "."}
        </div>
      ) : (
        <ul className="list card">
          {jogadoresFiltrados.map((j) => {
            const t = timesById[j.time_id];
            const c1 = t?.cor1 || "#FFFFFF";
            const c2 = t?.cor2 || "#000000";
            const cd = t?.cor_detalhe || "#000000";

            const titulo = j.apelido?.trim() ? j.apelido : j.nome;
            const subtitulo = [j.nome, (j.numero || j.numero === 0) && `#${j.numero}`, j.posicao, t?.nome]
              .filter(Boolean)
              .join(" — ");

            const icone = (
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "inline-block",
                  background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                  border: `2px solid ${cd}`
                }}
              />
            );

            const acoes = (
              <>
                <button onClick={() => startEditar(j)} className="btn btn--sm btn--orange">Editar</button>
                <button onClick={() => handleDelete(j.id)} className="btn btn--sm btn--red">Excluir</button>
              </>
            );

            return (
              <ListaCompactaItem
                key={j.id}
                icone={icone}
                titulo={titulo}
                subtitulo={subtitulo}
                acoes={acoes}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
