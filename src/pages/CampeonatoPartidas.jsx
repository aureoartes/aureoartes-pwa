// v1.1.0 — Partidas do Campeonato — Autenticação Supabase + RLS (ownerId)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";         // <- named export
import TeamIcon from "../components/TeamIcon";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";
import { useAuth } from "@/auth/AuthProvider"; // se não usar alias "@", troque para "../auth/AuthProvider"

// ===== Helpers de UI já existentes =====
function useIsNarrow(maxWidth = 640) {
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${maxWidth}px)`).matches
      : false
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
function timeLabel(p, side, isNarrow) {
  const t = side === "a" ? p.time_a : p.time_b;
  return isNarrow ? (t?.abreviacao || "—") : (t?.nome || "—");
}
function toLocalDateTimeLabel(ts, fallback = "Data a definir") {
  if (!ts) return fallback;
  try {
    const d = new Date(ts);
    const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${d.toLocaleDateString()} ${hm}`;
  } catch {
    return fallback;
  }
}

export default function CampeonatoPartidas() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();
  const isNarrow = useIsNarrow(640);
  const { ownerId, loading: authLoading } = useAuth(); // <<< novo

  // dados
  const [camp, setCamp] = useState(null);
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // filtros
  const [fStatus, setFStatus] = useState("todas"); // todas | nao_iniciadas | encerradas
  const [fRodadaFase, setFRodadaFase] = useState(""); // "rodada:N" | "fase:Nome"
  const [fGrupo, setFGrupo] = useState(""); // apenas formato=grupos

  // edição
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    gols_time_a: "",
    gols_time_b: "",
    penaltis_time_a: "",
    penaltis_time_b: "",
    local: "",
    dataHora: "", // YYYY-MM-DDTHH:mm
  });
  const [erroForm, setErroForm] = useState("");

  // mobile menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // carregar dados iniciais com ownerId
  useEffect(() => {
    if (authLoading) return;            // espera auth resolver
    if (!ownerId) {                     // sem usuário => limpa e finaliza
      setCamp(null);
      setPartidas([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        // Segurança: garante que o campeonato é do dono atual
        const { data: c, error: e1 } = await supabase
          .from("campeonatos")
          .select("*")
          .eq("id", campeonatoId)
          .eq("usuario_id", ownerId)
          .single();
        if (e1) throw e1;
        setCamp(c || null);
        await recarregarPartidas();
      } catch (err) {
        setErrorMsg(err?.message || "Falha ao carregar partidas");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, ownerId, campeonatoId]);

  async function recarregarPartidas() {
    const { data: ps, error } = await supabase
      .from("partidas")
      .select(`id,campeonato_id,rodada,grupo,is_mata_mata,etapa,perna,chave_id,data_hora,"local",encerrada,time_a_id,time_b_id,gols_time_a,gols_time_b,penaltis_time_a,penaltis_time_b,
               time_a:time_a_id(id,nome,abreviacao,cor1,cor2,cor_detalhe),
               time_b:time_b_id(id,nome,abreviacao,cor1,cor2,cor_detalhe)`)
      .eq("campeonato_id", campeonatoId)
      .order("rodada", { ascending: true, nullsFirst: false })
      .order("data_hora", { ascending: true })
      .order("id", { ascending: true });
    if (!error) setPartidas(ps || []);
  }

  // opções de filtro
  const rodadasFases = useMemo(() => {
    const set = new Set();
    for (const p of partidas) {
      if (p.is_mata_mata) {
        if (p.etapa) set.add(`fase:${p.etapa}`);
      } else {
        if (p.rodada != null) set.add(`rodada:${p.rodada}`);
      }
    }
    return Array.from(set.values()).sort((a, b) => {
      const [ka, va] = a.split(":");
      const [kb, vb] = b.split(":");
      if (ka === "rodada" && kb === "rodada") return Number(va) - Number(vb);
      if (ka === "rodada") return -1;
      if (kb === "rodada") return 1;
      return va.localeCompare(vb);
    });
  }, [partidas]);

  const gruposDisponiveis = useMemo(() => {
    if (!partidas?.length) return [];
    const s = new Set(partidas.map((p) => p.grupo).filter(Boolean));
    return Array.from(s.values()).sort((a, b) => a - b);
  }, [partidas]);

  const hasMataMata = useMemo(
    () => Array.isArray(partidas) && partidas.some((p) => !!p.is_mata_mata),
    [partidas]
  );

  // aplicar filtros
  const partidasFiltradas = useMemo(() => {
    let arr = [...(partidas || [])];
    if (fStatus === "nao_iniciadas") arr = arr.filter((p) => !p.encerrada);
    if (fStatus === "encerradas") arr = arr.filter((p) => p.encerrada);

    if (fRodadaFase) {
      const [k, v] = fRodadaFase.split(":");
      if (k === "rodada") arr = arr.filter((p) => String(p.rodada) === v);
      if (k === "fase") arr = arr.filter((p) => (p.etapa || "") === v);
    }

    if (fGrupo) arr = arr.filter((p) => String(p.grupo) === String(fGrupo));
    return arr;
  }, [partidas, fStatus, fRodadaFase, fGrupo]);

  // agrupamento visual (inalterado)
  const gruposDeExibicao = useMemo(() => {
    const map = new Map();
    for (const p of partidasFiltradas) {
      const isMM = !!p.is_mata_mata;
      const key = isMM
        ? `FASE:${(p.etapa || "Fase").trim()}${p.perna ? ` · Jogo ${p.perna}` : ""}`
        : `RODADA:${p.rodada != null ? p.rodada : "-"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }

    const fasePeso = (etapaRaw) => {
      if (!etapaRaw) return 99;
      let e = String(etapaRaw)
        .toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (/\b(3o|3°|3º)\s+lugar\b/.test(e) || /\bterceiro\s+lugar\b/.test(e)) e = "terceiro_lugar";
      const aliases = {
        preliminar: "preliminar",
        "64-avos": "64-avos",
        "64avos": "64-avos",
        "32-avos": "32-avos",
        "32avos": "32-avos",
        "16-avos": "16-avos",
        "16avos": "16-avos",
        oitavas: "oitavas",
        quartas: "quartas",
        semifinal: "semifinal",
        "semi final": "semifinal",
        "terceiro lugar": "terceiro_lugar",
        final: "final",
      };
      const norm = aliases[e] || e;
      const pesos = {
        preliminar: 1,
        "64-avos": 2,
        "32-avos": 3,
        "16-avos": 4,
        oitavas: 5,
        quartas: 6,
        semifinal: 7,
        terceiro_lugar: 8,
        final: 9,
      };
      return pesos[norm] ?? 99;
    };

    const parseFaseKey = (key) => {
      const rest = key.replace(/^FASE:/, "");
      const [etapa, jogoStr] = rest.split(" · ").map((s) => s?.trim());
      const jogoN = (jogoStr && jogoStr.startsWith("Jogo"))
        ? Number(jogoStr.replace(/[^\d]/g, "")) || 0
        : 0;
      return { etapa, jogoN };
    };

    const entries = Array.from(map.entries()).sort((a, b) => {
      const [ka] = a;
      const [kb] = b;
      const aRod = ka.startsWith("RODADA:");
      const bRod = kb.startsWith("RODADA:");
      if (aRod && bRod) return Number(ka.split(":")[1]) - Number(kb.split(":")[1]);
      if (aRod) return -1;
      if (bRod) return 1;
      const { etapa: ea, jogoN: ja } = parseFaseKey(ka);
      const { etapa: eb, jogoN: jb } = parseFaseKey(kb);
      const pa = fasePeso(ea);
      const pb = fasePeso(eb);
      if (pa !== pb) return pa - pb;
      if (ja !== jb) return ja - jb;
      return ka.localeCompare(kb);
    });

    return entries.map(([k, items]) => ({
      header: k.startsWith("RODADA:")
        ? `Rodada ${k.split(":")[1]}`
        : k.replace("FASE:", "Fase "),
      items,
    }));
  }, [partidasFiltradas]);

  // edição helpers (inalterados, com validações de ida/volta e pênaltis)
  function abrirEdicao(p) {
    setErroForm("");
    setEditandoId(p.id);
    setFormEdicao({
      gols_time_a: p.gols_time_a ?? "",
      gols_time_b: p.gols_time_b ?? "",
      penaltis_time_a: p.penaltis_time_a ?? "",
      penaltis_time_b: p.penaltis_time_b ?? "",
      local: p["local"] || "",
      dataHora: p.data_hora ? new Date(p.data_hora).toISOString().slice(0, 16) : "",
    });
  }
  function validar(payload) {
    const ga = payload.gols_time_a;
    const gb = payload.gols_time_b;
    if (ga === "" || ga === null || gb === "" || gb === null)
      return "Informe os gols dos dois times para salvar.";
    return null;
  }
  async function cancelarEdicao() {
    setEditandoId(null);
    setErroForm("");
    await recarregarPartidas();
  }
  async function salvarEdicao() {
    if (!editandoId) return;

    const payload = {
      gols_time_a: isNaN(parseInt(formEdicao.gols_time_a, 10)) ? 0 : parseInt(formEdicao.gols_time_a, 10),
      gols_time_b: isNaN(parseInt(formEdicao.gols_time_b, 10)) ? 0 : parseInt(formEdicao.gols_time_b, 10),
      penaltis_time_a:
        formEdicao.penaltis_time_a === "" ? null : Math.max(0, parseInt(formEdicao.penaltis_time_a, 10) || 0),
      penaltis_time_b:
        formEdicao.penaltis_time_b === "" ? null : Math.max(0, parseInt(formEdicao.penaltis_time_b, 10) || 0),
      encerrada: true,
      data_hora: formEdicao.dataHora ? new Date(formEdicao.dataHora).toISOString() : null,
      local: formEdicao.local?.trim() || null,
    };

    const msg = validar(payload);
    if (msg) { setErroForm(msg); return; }

    const partidaAtual = partidas.find((x) => x.id === editandoId);
    if (!partidaAtual) { setErroForm("Partida não encontrada na lista para validar."); return; }

    const empateNoTempo = payload.gols_time_a === payload.gols_time_b;

    if (partidaAtual.is_mata_mata) {
      if (camp?.ida_volta === true && partidaAtual.perna === 2 && partidaAtual.chave_id) {
        const { data: jogos } = await supabase
          .from("partidas")
          .select("id, perna, gols_time_a, gols_time_b, encerrada, time_a_id, time_b_id")
          .eq("chave_id", partidaAtual.chave_id);
        const ida = (jogos || []).find((j) => j.perna === 1);
        if (ida && ida.encerrada) {
          const idaAId = ida.time_a_id;
          const idaBId = ida.time_b_id;
          const voltaAId = partidaAtual.time_a_id;
          const voltaBId = partidaAtual.time_b_id;

          const voltaGolsParaIdaA = voltaAId === idaAId ? (payload.gols_time_a || 0) : (voltaBId === idaAId ? (payload.gols_time_b || 0) : 0);
          const voltaGolsParaIdaB = voltaAId === idaBId ? (payload.gols_time_a || 0) : (voltaBId === idaBId ? (payload.gols_time_b || 0) : 0);

          const somaA = (ida.gols_time_a || 0) + voltaGolsParaIdaA;
          const somaB = (ida.gols_time_b || 0) + voltaGolsParaIdaB;

          if (somaA === somaB) {
            if (payload.penaltis_time_a == null || payload.penaltis_time_b == null) {
              setErroForm("Ida+volta empatadas no agregado — informe os pênaltis.");
              return;
            }
            if (payload.penaltis_time_a === payload.penaltis_time_b) {
              setErroForm("Nos pênaltis precisa haver vencedor — os valores não podem ser iguais.");
              return;
            }
          } else {
            payload.penaltis_time_a = null;
            payload.penaltis_time_b = null;
          }
        } else {
          payload.penaltis_time_a = null;
          payload.penaltis_time_b = null;
        }
      } else if (camp?.ida_volta === true && (partidaAtual.perna === 1 || !partidaAtual.perna)) {
        payload.penaltis_time_a = null;
        payload.penaltis_time_b = null;
      } else {
        if (camp?.ida_volta === false || camp?.ida_volta == null) {
          if (empateNoTempo) {
            if (payload.penaltis_time_a == null || payload.penaltis_time_b == null) {
              setErroForm("Mata-mata de jogo único empatado — informe os pênaltis.");
              return;
            }
            if (payload.penaltis_time_a === payload.penaltis_time_b) {
              setErroForm("Nos pênaltis precisa haver vencedor — os valores não podem ser iguais.");
              return;
            }
          } else {
            payload.penaltis_time_a = null;
            payload.penaltis_time_b = null;
          }
        } else {
          payload.penaltis_time_a = null;
          payload.penaltis_time_b = null;
        }
      }
    } else {
      payload.penaltis_time_a = null;
      payload.penaltis_time_b = null;
    }

    const { error } = await supabase.from("partidas").update(payload).eq("id", editandoId);
    if (error) { setErroForm("❌ Erro ao salvar edição da partida"); return; }
    setEditandoId(null);
    setErroForm("");
    await recarregarPartidas();
  }

  async function reiniciarPartida(id) {
    if (!window.confirm("Reiniciar partida? Isso vai zerar gols e pênaltis.")) return;
    const { error } = await supabase
      .from("partidas")
      .update({ gols_time_a: 0, gols_time_b: 0, penaltis_time_a: null, penaltis_time_b: null, encerrada: false })
      .eq("id", id);
    if (error) {
      alert("❌ Erro ao reiniciar: " + error.message);
      return;
    }
    setEditandoId(null);
    await recarregarPartidas();
  }

  function limparFiltros() {
    setFStatus("todas");
    setFRodadaFase("");
    setFGrupo("");
  }

  // ====== Estados de carregamento/erro ======
  if (authLoading)
    return (
      <div className="container">
        <div className="card">Carregando autenticação…</div>
      </div>
    );
  if (loading)
    return (
      <div className="container">
        <div className="card">Carregando…</div>
      </div>
    );
  if (errorMsg)
    return (
      <div className="container">
        <div className="card">❌ {errorMsg}</div>
      </div>
    );
  if (!camp)
    return (
      <div className="container">
        <div className="card">Campeonato não encontrado</div>
      </div>
    );

  const showTabelaBtn = ["pontos_corridos", "grupos"].includes((camp?.formato || "").toLowerCase());

  return (
    <div className="container">
      {/* Cabeçalho */}
      <div className="card" style={{ padding: 16, marginBottom: 12, background: "#f9fafb" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Partidas — {camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{camp.categoria}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {hasMataMata && (
              <Link to={`/campeonatos/${camp.id}/chaveamento`} className="btn btn--muted">
                Chaveamento
              </Link>
            )}
            {showTabelaBtn && (
              <Link to={`/campeonatos/${camp.id}/classificacao`} className="btn btn--muted">
                Tabela
              </Link>
            )}
            <Link to={`/campeonatos`} className="btn btn--muted">Voltar</Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <div className="field">
            <label className="label">Estado</label>
            <select className="select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="nao_iniciadas">Não iniciadas</option>
              <option value="encerradas">Encerradas</option>
            </select>
          </div>

          {rodadasFases.length > 0 && (
            <div className="field">
              <label className="label">Rodada/Fase</label>
              <select className="select" value={fRodadaFase} onChange={(e) => setFRodadaFase(e.target.value)}>
                <option value="">Todas</option>
                {rodadasFases.map((rf) => {
                  const [k, v] = rf.split(":");
                  const label = k === "rodada" ? `Rodada ${v}` : `Fase ${v}`;
                  return <option key={rf} value={rf}>{label}</option>;
                })}
              </select>
            </div>
          )}

          {(camp?.formato || "").toLowerCase() === "grupos" && gruposDisponiveis.length > 0 && (
            <div className="field">
              <label className="label">Grupo</label>
              <select className="select" value={fGrupo} onChange={(e) => setFGrupo(e.target.value)}>
                <option value="">Todos</option>
                {gruposDisponiveis.map((g) => (
                  <option key={g} value={g}>Grupo {g}</option>
                ))}
              </select>
            </div>
          )}

          <div className="field" style={{ alignSelf: "flex-end" }}>
            <button className="btn btn--muted" onClick={limparFiltros}>Limpar filtros</button>
          </div>
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="card" style={{ padding: 0 }}>
        {gruposDeExibicao.length === 0 ? (
          <div className="list__item">Nenhuma partida encontrada.</div>
        ) : (
          gruposDeExibicao.map((grupo) => (
            <div key={grupo.header}>
              <div
                className="list__section"
                style={{ padding: "8px 12px", fontWeight: 600, background: "#f3f4f6", borderTop: "1px solid #e5e7eb" }}
              >
                {grupo.header}
              </div>

              <ul className="list">
                {grupo.items.map((p) => {
                  const canOpenPlacar = !!p.time_a_id && !!p.time_b_id;
                  const idaPendente =
                    p.is_mata_mata &&
                    camp?.ida_volta === true &&
                    p.perna === 2 &&
                    (() => {
                      const ida = partidas.find((j) => j.chave_id === p.chave_id && j.perna === 1);
                      return ida && !ida.encerrada;
                    })();

                  return (
                    <li key={p.id} className="list__item">
                      {/* Esquerda: times/placar e sub-infos */}
                      <div className="list__left" style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <TeamIcon team={p.time_a} size={20} />
                          <span className="mono">{timeLabel(p, "a", isNarrow)}</span>
                          <strong className="mono">{p.encerrada ? (p.gols_time_a ?? 0) : "—"}</strong>
                          <span className="mono">x</span>
                          <strong className="mono">{p.encerrada ? (p.gols_time_b ?? 0) : "—"}</strong>
                          <span className="mono">{timeLabel(p, "b", isNarrow)}</span>
                          <TeamIcon team={p.time_b} size={20} />
                        </div>

                        <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                          <div className="list__subtitle" style={{ marginTop: 4 }}>
                            {!isNarrow && (
                              <>
                                {p.data_hora ? toLocalDateTimeLabel(p.data_hora) : "Data a definir"}
                                {p.local ? ` · ${p.local}` : ""}
                              </>
                            )}
                          </div>

                          {p.is_mata_mata && (
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {camp?.ida_volta === true && p.perna === 2 && (() => {
                                const ida = partidas.find((j) => j.chave_id === p.chave_id && j.perna === 1);
                                if (!ida) return null;
                                // agregado respeitando a ordem visual (A à esquerda, B à direita)
                                const idaLeft  = ida.time_a_id === p.time_a_id ? (ida.gols_time_a || 0) : (ida.gols_time_b || 0);
                                const idaRight = ida.time_b_id === p.time_b_id ? (ida.gols_time_b || 0) : (ida.gols_time_a || 0);
                                const somaLeft  = idaLeft  + (p.gols_time_a || 0);
                                const somaRight = idaRight + (p.gols_time_b || 0);
                                return <>Agregado: {somaLeft}-{somaRight}</>;
                              })()}
                              {(((camp?.ida_volta === true && p.perna === 2) || camp?.ida_volta === false) &&
                                (p.penaltis_time_a != null && p.penaltis_time_b != null)) && (
                                <> {" · "}Pênaltis: {p.penaltis_time_a}-{p.penaltis_time_b}</>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Edição inline */}
                        {editandoId === p.id && (
                          <div className="card" style={{ marginTop: 10 }}>
                            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                              <div className="collapsible__title">Editar Partida</div>
                            </div>
                            <div style={{ padding: 12 }}>
                              <div className="grid grid-2">
                                <div className="field">
                                  <label className="label">Local</label>
                                  <input
                                    className="input"
                                    type="text"
                                    value={formEdicao.local}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, local: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label className="label">Data e Hora</label>
                                  <input
                                    className="input"
                                    type="datetime-local"
                                    value={formEdicao.dataHora}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, dataHora: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label className="label">Gols (Time A)</label>
                                  <input
                                    className="input mono"
                                    type="number"
                                    min="0"
                                    value={formEdicao.gols_time_a}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, gols_time_a: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label className="label">Gols (Time B)</label>
                                  <input
                                    className="input mono"
                                    type="number"
                                    min="0"
                                    value={formEdicao.gols_time_b}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, gols_time_b: e.target.value }))}
                                  />
                                </div>

                                {/* Pênaltis (habilita conforme regras) */}
                                <div className="field">
                                  <label className="label">Pênaltis (Time A)</label>
                                  <input
                                    className="input mono"
                                    type="number"
                                    min="0"
                                    value={formEdicao.penaltis_time_a}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, penaltis_time_a: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label className="label">Pênaltis (Time B)</label>
                                  <input
                                    className="input mono"
                                    type="number"
                                    min="0"
                                    value={formEdicao.penaltis_time_b}
                                    onChange={(e) => setFormEdicao((f) => ({ ...f, penaltis_time_b: e.target.value }))}
                                  />
                                </div>
                              </div>

                              {erroForm && <div className="text-danger" style={{ marginTop: 8 }}>{erroForm}</div>}

                              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                                <button className="btn btn--orange" onClick={salvarEdicao}>Salvar</button>
                                <button className="btn btn--muted" onClick={cancelarEdicao}>Cancelar</button>
                                <button
                                  className="btn btn--red"
                                  onClick={() => reiniciarPartida(p.id)}
                                  title="Zerar gols e pênaltis desta partida"
                                  style={{ marginLeft: "auto" }}
                                >
                                  Reiniciar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="row hide-sm" style={{ gap: 8, display: editandoId === p.id ? "none" : undefined }}>
                        <button
                          className="btn btn--sm btn--orange"
                          disabled={!canOpenPlacar || idaPendente}
                          onClick={() => navigate(`/partidas/${p.id}/placar`)}
                        >
                          Abrir placar
                        </button>
                        <button className="btn btn--sm btn--muted" disabled={idaPendente} onClick={() => abrirEdicao(p)}>
                          Editar
                        </button>
                      </div>

                      <div className="show-sm" style={{ display: editandoId === p.id ? "none" : undefined }}>
                        <MenuAcoesNarrow
                          id={p.id}
                          openMenuId={openMenuId}
                          setOpenMenuId={setOpenMenuId}
                          actions={[
                            {
                              label: "Abrir placar",
                              variant: "orange",
                              disabled: !canOpenPlacar || idaPendente,
                              onClick: () => navigate(`/partidas/${p.id}/placar`),
                            },
                            { label: "Editar", variant: "muted", disabled: idaPendente, onClick: () => abrirEdicao(p) },
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
