// src/pages/CampeonatoPartidas.jsx (atualizado)
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function CampeonatoPartidas() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [camp, setCamp] = useState(null);
  const [timesMap, setTimesMap] = useState(new Map()); // id -> {nome, abreviacao}
  const [grupoPorTime, setGrupoPorTime] = useState(new Map()); // time_id -> grupo (int) ou null
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [rodadaSel, setRodadaSel] = useState("todas");
  const [statusSel, setStatusSel] = useState("todas"); // todas | pendentes | encerradas

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoId]);

  async function carregarTudo() {
    setLoading(true);
    try {
      // campeonato
      const { data: c } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("id", campeonatoId)
        .single();
      setCamp(c || null);

      // partidas
      const { data: ps } = await supabase
        .from("partidas")
        .select("*")
        .eq("campeonato_id", campeonatoId)
        .order("rodada", { ascending: true });
      setPartidas(ps || []);

      // times do usuário (pode filtrar depois por ids usados nas partidas)
      const { data: ts } = await supabase
        .from("times")
        .select("id, nome, abreviacao")
        .eq("usuario_id", USUARIO_ID);
      const tmap = new Map();
      (ts || []).forEach((t) => tmap.set(t.id, t));
      setTimesMap(tmap);

      // grupos (apenas se formato = grupos)
      if (c?.formato === "grupos") {
        const { data: cts } = await supabase
          .from("campeonato_times")
          .select("time_id, grupo")
          .eq("campeonato_id", campeonatoId);
        const gmap = new Map();
        (cts || []).forEach((row) => gmap.set(row.time_id, row.grupo));
        setGrupoPorTime(gmap);
      } else {
        setGrupoPorTime(new Map());
      }
    } finally {
      setLoading(false);
    }
  }

  function nomeTime(id) {
    return timesMap.get(id)?.nome || "—";
  }
  function abrevTime(id) {
    return timesMap.get(id)?.abreviacao || "";
  }
  function siglaOuTraco(id) {
    const s = abrevTime(id);
    return s && s.trim() ? s : "—";
  }
  function fmtGrupo(g) {
    if (!g) return null;
    // se vier int (1=A, 2=B...), se já for string/char manter
    if (typeof g === "number")
      return String.fromCharCode("A".charCodeAt(0) + g - 1);
    // se vier string tipo "A" manter
    const s = String(g).trim();
    if (s.length === 1 && /[A-Z]/i.test(s)) return s.toUpperCase();
    return s;
  }
  function fmtDataHora(ts) {
    if (!ts) return "Agendar";
    const d = new Date(ts);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes} ${hora}:${min}`;
  }
  function hasTwoTeams(p) {
    return !!(p?.time_a_id && p?.time_b_id);
  }
  function golsOuTraco(v) {
    return typeof v === "number" ? v : "—";
  }

  // montar lista com label de grupo (se formato = grupos)
  const partidasDecoradas = useMemo(() => {
    return (partidas || []).map((p) => {
      const grupoA = fmtGrupo(grupoPorTime.get(p.time_a_id));
      const grupoB = fmtGrupo(grupoPorTime.get(p.time_b_id));
      let grupoLabel = null;
      if (camp?.formato === "grupos") {
        // se ambos grupos existem e iguais → mostra “Grupo X”
        if (grupoA && grupoB && grupoA === grupoB) grupoLabel = `Grupo ${grupoA}`;
        else grupoLabel = "Grupos";
      }
      return { ...p, grupoLabel };
    });
  }, [partidas, grupoPorTime, camp]);

  const rodadasDisponiveis = useMemo(() => {
    const s = new Set(partidasDecoradas.map((p) => p.rodada));
    return Array.from(s).sort((a, b) => a - b);
  }, [partidasDecoradas]);

  const partidasFiltradas = useMemo(() => {
    let arr = [...partidasDecoradas];

    if (rodadaSel !== "todas") {
      const r = parseInt(rodadaSel, 10);
      arr = arr.filter((p) => p.rodada === r);
    }

    if (statusSel === "pendentes") {
      arr = arr.filter((p) => !p.encerrada);
    } else if (statusSel === "encerradas") {
      arr = arr.filter((p) => !!p.encerrada);
    }

    arr.sort(
      (a, b) =>
        a.rodada - b.rodada || nomeTime(a.time_a_id).localeCompare(nomeTime(b.time_a_id))
    );
    return arr;
  }, [partidasDecoradas, rodadaSel, statusSel]);

  // >>> AGRUPAMENTO VISUAL POR RODADA / FASE (grupoLabel quando houver)
  const gruposPorCabecalho = useMemo(() => {
    const map = new Map();
    for (const p of partidasFiltradas) {
      const cabRod = p.rodada != null ? `Rodada ${p.rodada}` : "Sem rodada";
      const cabGrupo = p.grupoLabel ? ` — ${p.grupoLabel}` : "";
      const header = cabRod + cabGrupo;
      if (!map.has(header)) map.set(header, []);
      map.get(header).push(p);
    }
    // retorna lista de [header, partidas[]]
    return Array.from(map.entries());
  }, [partidasFiltradas]);

  if (loading || !camp) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 16 }}>Carregando…</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>{camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {camp.categoria} — {labelFormato(camp.formato)} — {partidas.length} partidas
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Link to={`/campeonatos/${camp.id}/equipes`} className="btn btn--muted">Equipes</Link>
            <Link to="/campeonatos" className="btn btn--muted">Voltar</Link>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <label className="label">Rodada</label>
            <select className="select" value={rodadaSel} onChange={(e) => setRodadaSel(e.target.value)}>
              <option value="todas">Todas</option>
              {rodadasDisponiveis.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="select" value={statusSel} onChange={(e) => setStatusSel(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="pendentes">Pendentes</option>
              <option value="encerradas">Encerradas</option>
            </select>
          </div>

          <button className="btn btn--orange" onClick={carregarTudo}>Atualizar</button>
        </div>
      </div>

      {/* LISTA AGRUPADA */}
      {gruposPorCabecalho.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>Nenhuma partida encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {gruposPorCabecalho.map(([header, items]) => (
            <section key={header} style={{ borderTop: "1px solid var(--border)", padding: 12 }}>
              <div style={{
                fontWeight: 700,
                fontSize: 14,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "var(--muted)"
              }}>{header}</div>

              <ul className="list" style={{ margin: 0 }}>
                {items.map((p) => {
                  const timeA = nomeTime(p.time_a_id);
                  const timeB = nomeTime(p.time_b_id);
                  const infos = [
                    fmtDataHora(p.data_hora),
                    p.local || "Local a definir",
                  ].filter(Boolean).join(" — ");

                  return (
                    <li key={p.id} className="list__item">
                      <div className="list__left" style={{ minWidth: 0 }}>
                        {/* LINHA DE PLACAR NO NOVO PADRÃO */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <TeamIcon enabled={!!p.time_a_id} />
                          <span className="mono" style={{ minWidth: 28, textAlign: "right" }}>
                            {siglaOuTraco(p.time_a_id)}
                          </span>
                          <span style={{ fontWeight: 700 }}>{golsOuTraco(p.gols_time_a)}</span>
                          <span style={{ opacity: 0.7 }}>x</span>
                          <span style={{ fontWeight: 700 }}>{golsOuTraco(p.gols_time_b)}</span>
                          <span className="mono" style={{ minWidth: 28, textAlign: "left" }}>
                            {siglaOuTraco(p.time_b_id)}
                          </span>
                          <TeamIcon enabled={!!p.time_b_id} />
                        </div>
                        {/* SUBINFORMAÇÕES */}
                        <div className="list__subtitle" title={infos}>{infos}</div>
                      </div>

                      <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                        <button
                          className="btn btn--primary"
                          onClick={() => navigate(`/partidas/${p.id}/placar`)}
                          disabled={!hasTwoTeams(p)}
                          title={hasTwoTeams(p) ? "Abrir placar" : "Defina os dois times para habilitar"}
                        >
                          Abrir Placar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ESTILOS LOCAIS PARA O ÍCONE PADRÃO */}
      <style>{`
        .team-icon {
          width: 22px; height: 22px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,.9), rgba(220,220,220,.9) 40%, rgba(0,0,0,.08) 41%);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.08);
        }
        .team-icon--empty { background: transparent; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      `}</style>
    </div>
  );

  function labelFormato(v) {
    if (v === "pontos_corridos") return "Pontos Corridos";
    if (v === "grupos") return "Grupos";
    if (v === "mata_mata") return "Mata-mata";
    return v;
  }
}

// Componente simples para ícone padrão do time
function TeamIcon({ enabled }) {
  return <span className={`team-icon${enabled ? "" : " team-icon--empty"}`} aria-hidden />;
}
