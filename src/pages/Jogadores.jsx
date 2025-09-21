// v1.2.0.0 Ajustar seção header 
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import ListaCompactaItem from "../components/ListaCompactaItem";
import TeamIcon from "../components/TeamIcon";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";
import { useAuth } from "@/auth/AuthProvider"; // troque para "../auth/AuthProvider" se não usar alias "@"

const SEM_EQUIPE = "__none__";

/* Hook: viewport estreita (mobile) */
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
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(location.search);
  const timeParam = urlParams.get("time") || "";

  const { ownerId, loading: authLoading } = useAuth();

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
    if (authLoading) return;
    if (!ownerId) {
      setTimes([]); setTimesById({}); setJogadores([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await Promise.all([fetchTimes(), fetchJogadores()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, ownerId]);

  // Recarrega lista ao trocar filtro por time
  useEffect(() => {
    if (!ownerId) return;
    fetchJogadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFiltroId, ownerId]);

  async function fetchTimes() {
    const { data, error } = await supabase
      .from("times")
      .select("id, nome, abreviacao, cor1, cor2, cor_detalhe")
      .eq("usuario_id", ownerId)
      .order("nome", { ascending: true });
    if (error) {
      setTimes([]);
      setTimesById({});
      return;
    }
    const arr = data || [];
    setTimes(arr);
    const map = {};
    arr.forEach((t) => (map[t.id] = t));
    setTimesById(map);
  }

  async function fetchJogadores() {
    if (!ownerId) return;
    let query = supabase.from("jogadores").select("*").eq("usuario_id", ownerId);
    if (timeFiltroId === SEM_EQUIPE) {
      query = query.is("time_id", null);
    } else if (timeFiltroId) {
      query = query.eq("time_id", timeFiltroId);
    }
    const { data, error } = await query.order("nome", { ascending: true });
    setJogadores(error ? [] : (data || []));
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

    // Atualiza lista
    setJogadores((prev) => prev.filter((x) => x.id !== id));

    // Fecha form se estiver aberto
    resetForm();
    setAbrirCadastro(false);

    alert("✅ Jogador excluído!");
  }


  async function handleSubmit(e) {
    e.preventDefault();
    if (!ownerId) return;
    setSaving(true);

    const payload = {
      usuario_id: ownerId,
      time_id: timeId || null,         // permite sem equipe
      nome: (nome || "").slice(0, 30).trim(),
      apelido: apelido ? apelido.slice(0, 15).trim() : null,
      numero: numero === "" ? null : Number(numero),
      posicao: posicao ? posicao.slice(0, 10).trim() : null, // pode ficar em branco
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

  // ======= Estados de carregamento =======
  if (authLoading) {
    return (
      <div className="container">
        <div className="card">Carregando autenticação…</div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 14 }}>Carregando…</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header: ESQUERDA = título/subtítulo; DIREITA = filtros/ordenacao + ações (igual Times) */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* ESQUERDA: título/subtítulo */}
          <div style={{ minWidth: 220, flex: "1 1 320px" }}>
            <h1 style={{ margin: 0 }}>Jogadores</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Cadastre, edite e gerencie jogadores.
            </div>
          </div>

          {/* DIREITA: controles empilhados (como em Times.jsx) */}
          <div
            className="col"
            style={{
              minWidth: 260,
              maxWidth: 360,
              flex: "0 1 360px",
              gap: 8,
            }}
          >
            <label className="label" style={{ margin: 0 }}>Ordenar:</label>
            <select
              className="select"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="nome">Nome</option>
              <option value="apelido">Apelido</option>
              <option value="clube">Clube</option>
              <option value="numero">Número</option>
              <option value="posicao">Posição</option>
            </select>

            <label className="label" style={{ marginTop: 8 }}>Time:</label>
            <select
              className="select"
              value={timeFiltroId}
              onChange={(e) => setTimeFiltroId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Todos</option>
              <option value={SEM_EQUIPE}>Sem equipe</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn--orange" onClick={startNovo}>+ Novo Jogador</button>
              <button className="btn btn--muted" onClick={() => navigate(-1)}>← Voltar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Cadastro (sem botão Fechar) */}
      {abrirCadastro && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ padding: 12, paddingBottom: 0 }}>
            <div className="collapsible__title" style={{ marginBottom: 8 }}>
              {editandoId ? "Editar Jogador" : "Cadastrar Jogador"}
            </div>
          </div>

          <div style={{ padding: 12 }}>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Time</label>
                  <select className="select" value={timeId} onChange={(e) => setTimeId(e.target.value)}>
                    <option value="">— Sem equipe —</option>
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
                    onChange={(e) => setNome(e.target.value.slice(0, 30))}
                    maxLength={30}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label">Apelido (opcional)</label>
                  <input
                    className="input"
                    value={apelido}
                    onChange={(e) => setApelido(e.target.value.slice(0, 15))}
                    maxLength={15}
                  />
                </div>

                <div className="field">
                  <label className="label">Número (opcional)</label>
                  <input
                    className="input mono"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{0,2}"
                    value={numero}
                    onChange={(e) => {
                      const onlyDigits = (e.target.value || "").replace(/[^0-9]+/g, "");
                      setNumero(onlyDigits.slice(0, 2));
                    }}
                    placeholder="Ex.: 10"
                    style={{ maxWidth: 100 }}
                  />
                </div>

                <div className="field">
                  <label className="label">Posição (opcional)</label>
                  <input
                    className="input"
                    list="lista-posicoes"
                    value={posicao}
                    onChange={(e) => setPosicao(e.target.value.slice(0, 10))}
                    maxLength={10}
                    placeholder="Ex.: MEI"
                  />
                  <datalist id="lista-posicoes">
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

              <div
                className="row"
                style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}
              >
                {/* Esquerda: Salvar + Cancelar */}
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn--orange" type="submit" disabled={saving}>
                    {editandoId ? "Salvar Alterações" : "Salvar Jogador"}
                  </button>
                  <button
                    className="btn btn--muted"
                    type="button"
                    onClick={() => {
                      resetForm();
                      setAbrirCadastro(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>

                {/* Direita: Excluir (somente ao editar) */}
                {editandoId && (
                  <button
                    className="btn btn--red"
                    type="button"
                    onClick={() => handleDelete(editandoId)}
                  >
                    Excluir
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="card" style={{ padding: 0 }}>
        {jogadoresOrdenados.length === 0 ? (
          <div className="list__item">Nenhum jogador encontrado.</div>
        ) : (
          <ul className="list">
            {jogadoresOrdenados.map((j) => {
              const time = j.time_id ? timesById[j.time_id] : null;
              const title = j.nome || "Jogador";
              const subtitleParts = [
                j.apelido || "—",
                time?.nome || "Sem equipe",
                j.posicao || "—",
                (j.numero != null ? `#${j.numero}` : "—"),
              ];
              return (
                <li key={j.id} className="list__item">
                  <div className="list__left" style={{ gap: 10 }}>
                    <TeamIcon
                      team={time || { cor1: "#e5e7eb", cor2: "#9ca3af", cor_detalhe: "#111827" }}
                      size={22}
                      title={time?.nome || "Sem equipe"}
                    />
                    <div>
                      <div className="list__title">{title}</div>
                      <div className="list__subtitle">
                        {subtitleParts.join(" · ")}
                      </div>
                    </div>
                  </div>

                  <div className="list__right">
                    {/* Ações em menu para telas estreitas */}
                    {isNarrow ? (
                      <MenuAcoesNarrow
                        id={j.id}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        actions={[
                          { label: "Editar", variant: "muted", onClick: () => startEditar(j) },
                        ]}
                      />
                    ) : (
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn--muted" onClick={() => startEditar(j)}>Editar</button>
                      </div>
                    )}
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
