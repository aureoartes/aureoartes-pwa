// src/pages/CampeonatoPartidas.jsx
// + Filtros: Rodada/Fase, Status (todas/encerradas/não iniciadas) e Grupo (se formato = grupos)
// + Mobile: MenuAcoesNarrow controlado; oculta data/local; abre placar na rota /partidas/:id/placar
// + Editar inline com validações leves; após salvar, recarrega lista

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import TeamIcon from "../components/TeamIcon";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";

function useIsNarrow(maxWidth = 640) {
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

function toDateStr(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeStr(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function toLocalDateTimeLabel(ts, fallback = "Data a definir") {
  if (!ts) return fallback;
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return fallback;
  }
}

export default function CampeonatoPartidas() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow();

  const [camp, setCamp] = useState(null);
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({ gols_time_a: "", gols_time_b: "", local: "", data: "", hora: "", encerrada: false });
  const [erroForm, setErroForm] = useState("");

  // Mobile menu controlado
  const [openMenuId, setOpenMenuId] = useState(null);

  // Filtros
  const [fStatus, setFStatus] = useState("todas"); // todas | encerradas | nao
  const [fRodadaFase, setFRodadaFase] = useState(""); // "" = todas; valor depende do formato
  const [fGrupo, setFGrupo] = useState(""); // grupos (""=todos)

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const { data: c } = await supabase.from("campeonatos").select("*").eq("id", campeonatoId).single();
        setCamp(c || null);
        const { data: ps } = await supabase
          .from("partidas")
          .select(`id,campeonato_id,rodada,grupo,is_mata_mata,etapa,perna,data_hora,"local",encerrada,time_a_id,time_b_id,gols_time_a,gols_time_b,
                   time_a:time_a_id(id,nome,abreviacao,cor1,cor2,cor_detalhe),
                   time_b:time_b_id(id,nome,abreviacao,cor1,cor2,cor_detalhe)`) 
          .eq("campeonato_id", campeonatoId)
          .order("rodada", { ascending: true, nullsFirst: false })
          .order("data_hora", { ascending: true })
          .order("id", { ascending: true });
        setPartidas(ps || []);
      } catch (err) {
        setErrorMsg(err?.message || "Falha ao carregar partidas");
      } finally {
        setLoading(false);
      }
    })();
  }, [campeonatoId]);

  // Opções de filtros (derivadas dos dados)
  const isFormatoGrupos = (camp?.formato || "").toLowerCase() === "grupos";
  const isFormatoPC = (camp?.formato || "").toLowerCase() === "pontos_corridos";
  const isFormatoMM = (camp?.formato || "").toLowerCase() === "mata_mata";

  const opcoesRodadaFase = useMemo(() => {
    const set = new Set();
    for (const p of partidas) {
      if (isFormatoMM) {
        const fase = `${p.etapa || "Mata-mata"}${p.perna ? ` · Jogo ${p.perna}` : ""}`;
        set.add(fase);
      } else {
        if (p.rodada != null) set.add(`Rodada ${p.rodada}`);
      }
    }
    return Array.from(set);
  }, [partidas, isFormatoMM]);

  const opcoesGrupo = useMemo(() => {
    if (!isFormatoGrupos) return [];
    const set = new Set();
    for (const p of partidas) if (p.grupo != null) set.add(String(p.grupo));
    return Array.from(set).sort((a,b)=>Number(a)-Number(b));
  }, [partidas, isFormatoGrupos]);

  // Aplicar filtros
  const partidasFiltradas = useMemo(() => {
    let arr = [...partidas];
    // Status
    if (fStatus === "encerradas") arr = arr.filter((p) => !!p.encerrada);
    else if (fStatus === "nao") arr = arr.filter((p) => !p.encerrada);

    // Grupo (quando formato = grupos)
    if (isFormatoGrupos && fGrupo) arr = arr.filter((p) => String(p.grupo || "") === String(fGrupo));

    // Rodada ou Fase
    if (fRodadaFase) {
      if (isFormatoMM) {
        arr = arr.filter((p) => {
          const fase = `${p.etapa || "Mata-mata"}${p.perna ? ` · Jogo ${p.perna}` : ""}`;
          return fase === fRodadaFase;
        });
      } else {
        arr = arr.filter((p) => `Rodada ${p.rodada}` === fRodadaFase);
      }
    }
    return arr;
  }, [partidas, fStatus, fGrupo, fRodadaFase, isFormatoGrupos, isFormatoMM]);

  // Agrupar visualmente (mantém regra antiga) SOBRE as partidas filtradas
  const grupos = useMemo(() => {
    const map = new Map();
    for (const p of partidasFiltradas || []) {
      let chave;
      if (p.rodada != null) chave = `Rodada ${p.rodada}`;
      else if (p.is_mata_mata) chave = `${p.etapa || "Mata-mata"}${p.perna ? ` · Jogo ${p.perna}` : ""}`;
      else if (p.grupo != null) chave = `Grupo ${p.grupo}`;
      else chave = "Partidas";
      if (!map.has(chave)) map.set(chave, []);
      map.get(chave).push(p);
    }
    return Array.from(map.entries());
  }, [partidasFiltradas]);

  function abrirEdicao(p) {
    setErroForm("");
    setEditandoId(p.id);
    setFormEdicao({
      gols_time_a: p.gols_time_a ?? "",
      gols_time_b: p.gols_time_b ?? "",
      local: p["local"] || "",
      data: toDateStr(p.data_hora),
      hora: toTimeStr(p.data_hora),
      encerrada: !!p.encerrada,
    });
  }
  function cancelarEdicao() { setEditandoId(null); setErroForm(""); }
  function clampInt(v) { if (v === "") return ""; const n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; }
  function validar(payload) {
    if (payload.encerrada) {
      const ga = payload.gols_time_a; const gb = payload.gols_time_b;
      if (ga === "" || ga === null || gb === "" || gb === null) return "Informe os gols dos dois times para encerrar a partida.";
    }
    return null;
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    let data_hora = null;
    if (formEdicao.data && formEdicao.hora) data_hora = `${formEdicao.data}T${formEdicao.hora}:00`;

    let encerrada = formEdicao.encerrada;
    if (!encerrada && (formEdicao.gols_time_a !== "" || formEdicao.gols_time_b !== "")) {
      if (window.confirm("Deseja encerrar a partida com os gols informados?")) encerrada = true;
    }

    const payload = {
      gols_time_a: clampInt(formEdicao.gols_time_a),
      gols_time_b: clampInt(formEdicao.gols_time_b),
      encerrada,
      data_hora,
      local: formEdicao.local?.trim() || null,
    };

    const msg = validar(payload);
    if (msg) { setErroForm(msg); return; }

    const { error } = await supabase.from("partidas").update(payload).eq("id", editandoId);
    if (error) { setErroForm("❌ Erro ao salvar edição da partida"); return; }

    // refresh após salvar (mantém filtros)
    const { data: ps } = await supabase
      .from("partidas")
      .select(`id,campeonato_id,rodada,grupo,is_mata_mata,etapa,perna,data_hora,"local",encerrada,time_a_id,time_b_id,gols_time_a,gols_time_b,
               time_a:time_a_id(id,nome,abreviacao,cor1,cor2,cor_detalhe),
               time_b:time_b_id(id,nome,abreviacao,cor1,cor2,cor_detalhe)`) 
      .eq("campeonato_id", campeonatoId)
      .order("rodada", { ascending: true, nullsFirst: false })
      .order("data_hora", { ascending: true })
      .order("id", { ascending: true });
    setPartidas(ps || []);
    setEditandoId(null); setErroForm("");
  }

  async function reiniciarPartida(id) {
    if (!window.confirm("Reiniciar?")) return;
    await supabase.from("partidas").update({ gols_time_a: 0, gols_time_b: 0, encerrada: false }).eq("id", id);
    // recarregar dados
    const { data: ps } = await supabase
      .from("partidas")
      .select(`id,campeonato_id,rodada,grupo,is_mata_mata,etapa,perna,data_hora,"local",encerrada,time_a_id,time_b_id,gols_time_a,gols_time_b,
               time_a:time_a_id(id,nome,abreviacao,cor1,cor2,cor_detalhe),
               time_b:time_b_id(id,nome,abreviacao,cor1,cor2,cor_detalhe)`) 
      .eq("campeonato_id", campeonatoId)
      .order("rodada", { ascending: true, nullsFirst: false })
      .order("data_hora", { ascending: true })
      .order("id", { ascending: true });
    setPartidas(ps || []);
  }

  if (loading) return <div className="container"><div className="card">Carregando…</div></div>;
  if (errorMsg) return <div className="container"><div className="card">❌ {errorMsg}</div></div>;
  if (!camp) return <div className="container"><div className="card">Campeonato não encontrado</div></div>;

  const showTabelaBtn = ["pontos_corridos", "grupos"].includes((camp?.formato || "").toLowerCase());

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ padding: 16, marginBottom: 12, background: "#f9fafb" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Partidas — {camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{camp.categoria}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {showTabelaBtn && <Link to={`/campeonatos/${camp.id}/classificacao`} className="btn btn--muted">Tabela</Link>}
            <Link to={`/campeonatos`} className="btn btn--muted">Voltar</Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 200 }}>
            <label className="label">Status</label>
            <select className="select" value={fStatus} onChange={(e)=>setFStatus(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="nao">Não iniciadas</option>
              <option value="encerradas">Encerradas</option>
            </select>
          </div>

          <div className="field" style={{ minWidth: 240 }}>
            <label className="label">{isFormatoMM ? "Fase" : "Rodada"}</label>
            <select className="select" value={fRodadaFase} onChange={(e)=>setFRodadaFase(e.target.value)}>
              <option value="">Todas</option>
              {opcoesRodadaFase.map((v)=> <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {isFormatoGrupos && (
            <div className="field" style={{ minWidth: 160 }}>
              <label className="label">Grupo</label>
              <select className="select" value={fGrupo} onChange={(e)=>setFGrupo(e.target.value)}>
                <option value="">Todos</option>
                {opcoesGrupo.map((g)=> <option key={g} value={g}>{`Grupo ${g}`}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Listas agrupadas */}
      {grupos.map(([titulo, lista]) => (
        <div key={titulo} className="card" style={{ padding: 0, marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>{titulo}</div>
          <ul className="list">
            {lista.map((p) => {
              const podeAbrirPlacar = !!(p.time_a_id && p.time_b_id);
              const labelA = isNarrow ? (p.time_a?.abreviacao || "—") : (p.time_a?.nome || "—");
              const labelB = isNarrow ? (p.time_b?.abreviacao || "—") : (p.time_b?.nome || "—");

              const acoesWide = (
                <div className="row hide-sm" style={{ gap: 8 }}>
                  <button className="btn btn--sm btn--muted" disabled={!podeAbrirPlacar} onClick={() => navigate(`/partidas/${p.id}/placar`)}>Abrir placar</button>
                  <button className="btn btn--sm btn--orange" onClick={() => abrirEdicao(p)}>Editar</button>
                </div>
              );

              const acoesNarrow = (
                <div className="show-sm">
                  <MenuAcoesNarrow
                    id={p.id}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    actions={[
                      { label: "Abrir placar", variant: "muted", disabled: !podeAbrirPlacar, onClick: () => navigate(`/partidas/${p.id}/placar`) },
                      { label: "Editar", variant: "orange", onClick: () => abrirEdicao(p) }
                    ]}
                  />
                </div>
              );

              return (
                <li key={p.id} className="list__item">
                  <div className="list__left" style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <TeamIcon team={{ cor1: p.time_a?.cor1, cor2: p.time_a?.cor2, cor_detalhe: p.time_a?.cor_detalhe }} size={20} />
                      <span className="mono">{labelA}</span>
                      <strong className="mono">{p.encerrada ? (p.gols_time_a ?? 0) : "—"}</strong>
                      <span className="mono">x</span>
                      <strong className="mono">{p.encerrada ? (p.gols_time_b ?? 0) : "—"}</strong>
                      <span className="mono">{labelB}</span>
                      <TeamIcon team={{ cor1: p.time_b?.cor1, cor2: p.time_b?.cor2, cor_detalhe: p.time_b?.cor_detalhe }} size={20} />
                    </div>

                    {/* Subtítulo: no celular, ocultar data/hora e local */}
                    {!isNarrow && (
                      <div className="list__subtitle" style={{ marginTop: 4 }}>
                        {toLocalDateTimeLabel(p.data_hora)}{p["local"] ? ` · ${p["local"]}` : ""}
                      </div>
                    )}
                  </div>

                  {acoesWide}
                  {acoesNarrow}

                  {editandoId === p.id && (
                    <div className="card" style={{ marginTop: 10, width: "100%" }}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                        <div className="collapsible__title">Editar Partida</div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div className="grid grid-2">
                          <div className="field">
                            <label className="label">Gols {p.time_a?.abreviacao || p.time_a?.nome || "Time A"}</label>
                            <input className="input" type="number" min={0} value={formEdicao.gols_time_a} onChange={(e) => setFormEdicao((f) => ({ ...f, gols_time_a: clampInt(e.target.value) }))} />
                          </div>
                          <div className="field">
                            <label className="label">Gols {p.time_b?.abreviacao || p.time_b?.nome || "Time B"}</label>
                            <input className="input" type="number" min={0} value={formEdicao.gols_time_b} onChange={(e) => setFormEdicao((f) => ({ ...f, gols_time_b: clampInt(e.target.value) }))} />
                          </div>
                          <div className="field">
                            <label className="label">Local</label>
                            <input className="input" type="text" value={formEdicao.local} onChange={(e) => setFormEdicao((f) => ({ ...f, local: e.target.value }))} />
                          </div>
                          <div className="field">
                            <label className="label">Data</label>
                            <input className="input" type="date" value={formEdicao.data} onChange={(e) => setFormEdicao((f) => ({ ...f, data: e.target.value }))} />
                          </div>
                          <div className="field">
                            <label className="label">Hora</label>
                            <input className="input" type="time" value={formEdicao.hora} onChange={(e) => setFormEdicao((f) => ({ ...f, hora: e.target.value }))} />
                          </div>
                          <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input id={`enc-${p.id}`} type="checkbox" checked={!!formEdicao.encerrada} onChange={(e) => setFormEdicao((f) => ({ ...f, encerrada: e.target.checked }))} />
                            <label htmlFor={`enc-${p.id}`}>Encerrada</label>
                          </div>
                        </div>
                        {erroForm && <div style={{ color: "#b91c1c", marginTop: 8 }}>{erroForm}</div>}
                        <div className="row" style={{ gap: 8, marginTop: 10 }}>
                          <button className="btn btn--primary" onClick={salvarEdicao}>Salvar</button>
                          <button className="btn btn--muted" onClick={cancelarEdicao}>Cancelar</button>
                          <button className="btn btn--red" disabled={!partidas.find(x => x.id === p.id)?.encerrada} onClick={() => reiniciarPartida(p.id)}>Reiniciar</button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
            {lista.length === 0 && <li className="list__item"><div className="text-muted">Sem partidas nesta seleção de filtros.</div></li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
