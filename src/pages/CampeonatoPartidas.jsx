// src/pages/CampeonatoPartidas.jsx
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
  function fmtGrupo(g) {
    if (!g) return null;
    // se vier int (1=A, 2=B...), se já for string/char manter
    if (typeof g === "number") return String.fromCharCode("A".charCodeAt(0) + g - 1);
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

    arr.sort((a, b) => a.rodada - b.rodada || nomeTime(a.time_a_id).localeCompare(nomeTime(b.time_a_id)));
    return arr;
  }, [partidasDecoradas, rodadaSel, statusSel]);

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

      {/* LISTA */}
      {partidasFiltradas.length === 0 ? (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>Nenhuma partida encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <ul className="list card">
          {partidasFiltradas.map((p) => {
            const timeA = nomeTime(p.time_a_id);
            const timeB = nomeTime(p.time_b_id);
            const placar = p.encerrada
              ? `${p.gols_time_a ?? 0} x ${p.gols_time_b ?? 0}`
              : "— x —";
            const infos = [
              `Rodada ${p.rodada}`,
              p.grupoLabel || null,
              fmtDataHora(p.data_hora),
              p.local || "Local a definir",
            ].filter(Boolean).join(" — ");

            return (
              <li key={p.id} className="list__item">
                <div className="list__left" style={{ minWidth: 0 }}>
                  <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <div className="list__title" title={`${timeA} vs ${timeB}`}>
                      <strong>{abrevTime(p.time_a_id) || timeA}</strong> vs <strong>{abrevTime(p.time_b_id) || timeB}</strong> — {placar}
                    </div>
                    <div className="list__subtitle" title={infos}>{infos}</div>
                  </div>
                </div>

                <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                <button
                    className="btn btn--primary"
                    onClick={() => navigate(`/partidas/${p.id}/placar`)}
                >
                    Abrir Placar
                </button>
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  function labelFormato(v) {
    if (v === "pontos_corridos") return "Pontos Corridos";
    if (v === "grupos") return "Grupos";
    if (v === "mata_mata") return "Mata-mata";
    return v;
  }
}
