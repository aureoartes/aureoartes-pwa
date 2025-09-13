// src/pages/Jogadores.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ListaCompactaItem from "../components/ListaCompactaItem";
import TeamIcon from "../components/TeamIcon";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";
import { getUsuarioId } from "../config/appUser";

const USUARIO_ID = getUsuarioId();
const SEM_EQUIPE = "__none__";

/* Hook para detectar viewport estreita (mobile vertical) */
function useIsNarrow(maxWidth = 520) {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.matchMedia(`(max-width:${maxWidth}px)`).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${maxWidth}px)`);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, [maxWidth]);
  return narrow;
}

export default function Jogadores() {
  const isNarrow = useIsNarrow(520);
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const timeParam = urlParams.get("time") || "";

  // Dados
  const [jogadores, setJogadores] = useState([]);
  const [times, setTimes] = useState([]);
  const [timesById, setTimesById] = useState({});

  // Filtros e ordenação
  const [timeFiltroId, setTimeFiltroId] = useState(timeParam);
  const [ordenacao, setOrdenacao] = useState("nome"); // nome | apelido | clube | numero | posicao
  const [openMenuId, setOpenMenuId] = useState(null);

  // Form cadastro/edição
  const [abrirCadastro, setAbrirCadastro] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [timeId, setTimeId] = useState(timeParam || "");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [numero, setNumero] = useState("");
  const [posicao, setPosicao] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchTimes(), fetchJogadores()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega lista no filtro por time
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
    let query = supabase.from("jogadores").select("*").eq("usuario_id", USUARIO_ID);
    if (timeFiltroId === SEM_EQUIPE) {
      query = query.is("time_id", null);
    } else if (timeFiltroId) {
      query = query.eq("time_id", timeFiltroId);
    }
    const { data } = await query.order("nome", { ascending: true });
    setJogadores(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setTimeId(timeFiltroId && timeFiltroId !== SEM_EQUIPE ? timeFiltroId : "");
    setNome("");
    setApelido("");
    setNumero("");
    setPosicao("");
    setFotoUrl("");
  }

  function startNovo() {
    resetForm();
    setAbrirCadastro(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditar(j) {
    setEditandoId(j.id);
    setTimeId(j.time_id || "");
    setNome(j.nome || "");
    setApelido(j.apelido || "");
    setNumero(j.numero ?? "");
    setPosicao(j.posicao || "");
    setFotoUrl(j.foto_url || "");
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
    setSaving(true);

    const payload = {
      usuario_id: USUARIO_ID,
      time_id: timeId || null,         // permite sem equipe
      nome,
      apelido: apelido || null,
      numero: numero === "" ? null : Number(numero),
      posicao: posicao || null,        // pode ficar em branco
      foto_url: fotoUrl || null,
    };

    if (editandoId) {
      const { error } = await supabase.from("jogadores").update(payload).eq("id", editandoId);
      if (error) alert("❌ Erro ao atualizar jogador.");
      else {
        alert("✅ Jogador atualizado!");
        await fetchJogadores();
        resetForm();
        setAbrirCadastro(false);
      }
    } else {
      const { error } = await supabase.from("jogadores").insert([payload]);
      if (error) alert("❌ Erro ao cadastrar jogador.");
      else {
        alert("✅ Jogador cadastrado!");
        await fetchJogadores();
        resetForm();
        setAbrirCadastro(false);
      }
    }

    setSaving(false);
  }

  // Ordenação local (após buscar)
  const jogadoresOrdenados = useMemo(() => {
    const arr = [...(jogadores || [])];
    const byStr = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base" });
    const byNum = (a, b) => (a ?? Infinity) - (b ?? Infinity);

    switch (ordenacao) {
      case "apelido": arr.sort((a, b) => byStr(a.apelido, b.apelido)); break;
      case "clube":   arr.sort((a, b) => byStr(timesById[a.time_id]?.nome, timesById[b.time_id]?.nome)); break;
      case "numero":  arr.sort((a, b) => byNum(a.numero, b.numero)); break;
      case "posicao": arr.sort((a, b) => byStr(a.posicao, b.posicao)); break;
      case "nome":
      default:        arr.sort((a, b) => byStr(a.nome, b.nome));
    }
    return arr;
  }, [jogadores, ordenacao, timesById]);

  return (
    <div className="container">
      {/* Header/Filtros */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Jogadores</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Cadastre, edite e gerencie jogadores. Use os filtros para focar em um time.
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
              <option value={SEM_EQUIPE}>Sem equipe</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>

            <label className="label" style={{ marginLeft: 8 }}>Ordenar por:</label>
            <select
              className="select"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="nome">Nome</option>
              <option value="apelido">Apelido</option>
              <option value="clube">Clube</option>
              <option value="numero">Número</option>
              <option value="posicao">Posição</option>
            </select>

            <button className="btn btn--orange" onClick={startNovo}>
              + Novo Jogador
            </button>
          </div>
        </div>
      </div>

      {/* Cadastro (oculto) */}
      {abrirCadastro && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div className="collapsible__title">{editandoId ? "Editar Jogador" : "Cadastrar Jogador"}</div>
          </div>

          <div style={{ padding: 12 }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Time (opcional)</label>
                  <select className="select" value={timeId} onChange={(e) => setTimeId(e.target.value)}>
                    <option value="">Sem equipe</option>
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
                  <input
                    className="input"
                    value={posicao}
                    onChange={(e) => setPosicao(e.target.value)}
                    list="posicoes-sugeridas"
                    placeholder="Ex.: DEF (ou deixe em branco)"
                  />
                  <datalist id="posicoes-sugeridas">
                    <option value="GOL" />
                    <option value="DEF" />
                    <option value="MEI" />
                    <option value="ATA" />
                  </datalist>
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
      ) : jogadoresOrdenados.length === 0 ? (
        <div className="card" style={{ padding: 14 }}>
          Nenhum jogador encontrado
          {timeFiltroId === SEM_EQUIPE ? " (sem equipe)." : timeFiltroId ? " para o time selecionado." : "."}
        </div>
      ) : (
        <ul className="list card">
          {jogadoresOrdenados.map((j) => {
            const t = timesById[j.time_id];
            const titulo = j.apelido?.trim() ? j.apelido : j.nome;

            const partes = [];
            if (j.nome) partes.push(j.nome);
            if (j.numero || j.numero === 0) partes.push(`#${j.numero}`);
            if (j.posicao) partes.push(j.posicao);
            if (t?.nome) partes.push(t.nome);
            const subtitulo = partes.join(" — ");

            const icone = (
              <TeamIcon
                team={t || { cor1: "#FFFFFF", cor2: "#000000", cor_detalhe: "#999999" }}
                size={24}
              />
            );

            const acoesWide = (
              <>
                <button onClick={() => startEditar(j)} className="btn btn--sm btn--orange">Editar</button>
                <button onClick={() => handleDelete(j.id)} className="btn btn--sm btn--red">Excluir</button>
              </>
            );

            const acoesNarrow = (
              <MenuAcoesNarrow
                id={j.id}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
                actions={[
                  { label: "Editar",  variant: "orange", onClick: () => startEditar(j) },
                  { label: "Excluir", variant: "red",    onClick: () => handleDelete(j.id) },
                ]}
              />
            );

            return (
              <ListaCompactaItem
                key={j.id}
                icone={icone}
                titulo={titulo}
                subtitulo={subtitulo}
                acoes={isNarrow ? acoesNarrow : acoesWide}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
