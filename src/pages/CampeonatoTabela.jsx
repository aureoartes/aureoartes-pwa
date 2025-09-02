// src/pages/CampeonatoTabela.jsx
// Tela de classificação para campeonatos em Pontos Corridos e Fase de Grupos
// - Agrupa por grupo quando formato = "grupos" (usa campeonato_times.grupo)
// - Exibe tabela com: #, Time, J, V, E, D, GP, GC, SG, % (aproveitamento), Pts, Forma (últimos 5)
// - Critérios de desempate: Pts > SG > GP > Vitórias > Confronto direto (opcional/futuro)
// - Considera partidas encerradas (ou com gols numéricos) para cálculo

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function CampeonatoTabela() {
  const { id: campeonatoId } = useParams();

  const [camp, setCamp] = useState(null);
  const [times, setTimes] = useState([]); // [{id,nome,abreviacao}]
  const [grupoPorTime, setGrupoPorTime] = useState(new Map()); // time_id -> grupo
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [mostrarForma, setMostrarForma] = useState(true);
  const [somenteEncerradas, setSomenteEncerradas] = useState(true);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campeonatoId]);

  async function carregar() {
    setLoading(true);
    try {
      const { data: c } = await supabase.from("campeonatos").select("*").eq("id", campeonatoId).single();
      setCamp(c || null);

      const { data: ts } = await supabase
        .from("times")
        .select("id, nome, abreviacao")
        .eq("usuario_id", USUARIO_ID);
      setTimes(ts || []);

      const { data: ps } = await supabase
        .from("partidas")
        .select("id, time_a_id, time_b_id, gols_time_a, gols_time_b, encerrada")
        .eq("campeonato_id", campeonatoId);
      setPartidas(ps || []);

      if ((c?.formato || "").toLowerCase() === "grupos") {
        const { data: cts } = await supabase
          .from("campeonato_times")
          .select("time_id, grupo")
          .eq("campeonato_id", campeonatoId);
        const g = new Map();
        (cts || []).forEach((row) => g.set(row.time_id, normalizaGrupo(row.grupo)));
        setGrupoPorTime(g);
      } else {
        setGrupoPorTime(new Map());
      }
    } finally {
      setLoading(false);
    }
  }

  const timesMap = useMemo(() => new Map(times.map((t) => [t.id, t])), [times]);

  const estatisticas = useMemo(() => {
    // estrutura base
    const base = new Map(); // teamId -> stats
    function ensure(teamId) {
      if (!teamId) return null;
      if (!base.has(teamId)) {
        base.set(teamId, {
          teamId,
          j: 0, v: 0, e: 0, d: 0,
          gp: 0, gc: 0, sg: 0,
          pts: 0,
          forma: [], // últimos 5 (W,D,L)
        });
      }
      return base.get(teamId);
    }

    const jogosValidos = partidas.filter((p) => {
      if (!p.time_a_id || !p.time_b_id) return false;
      const temGols = isNum(p.gols_time_a) && isNum(p.gols_time_b);
      return somenteEncerradas ? !!p.encerrada || temGols : true;
    });

    for (const p of jogosValidos) {
      const a = ensure(p.time_a_id);
      const b = ensure(p.time_b_id);
      if (!a || !b) continue;

      a.j++; b.j++;

      const ga = isNum(p.gols_time_a) ? p.gols_time_a : 0;
      const gb = isNum(p.gols_time_b) ? p.gols_time_b : 0;

      a.gp += ga; a.gc += gb; a.sg = a.gp - a.gc;
      b.gp += gb; b.gc += ga; b.sg = b.gp - b.gc;

      if (ga > gb) {
        a.v++; b.d++;
        a.pts += 3; a.forma.push("V"); b.forma.push("D");
      } else if (ga < gb) {
        b.v++; a.d++;
        b.pts += 3; b.forma.push("V"); a.forma.push("D");
      } else {
        a.e++; b.e++;
        a.pts += 1; b.pts += 1;
        a.forma.push("E"); b.forma.push("E");
      }
    }

    // calcula aproveitamento e corta forma em 5
    for (const s of base.values()) {
      s.apr = s.j ? Math.round((s.pts / (s.j * 3)) * 100) : 0;
      if (s.forma.length > 5) s.forma = s.forma.slice(-5);
    }

    return base; // Map
  }, [partidas, somenteEncerradas]);

  const grupos = useMemo(() => {
    const map = new Map(); // header -> stats[]

    function headerFor(teamId) {
      if ((camp?.formato || "").toLowerCase() === "grupos") {
        const g = grupoPorTime.get(teamId) || "?";
        return `Grupo ${g}`;
      }
      return "Classificação Geral";
    }

    // incluir times que ainda não jogaram
    for (const t of times) {
      const h = headerFor(t.id);
      if (!map.has(h)) map.set(h, []);
      const s = estatisticas.get(t.id) || { teamId: t.id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0, apr: 0, forma: [] };
      map.get(h).push(s);
    }

    // ordenação por critérios
    function sortStats(a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.sg !== a.sg) return b.sg - a.sg;
      if (b.gp !== a.gp) return b.gp - a.gp;
      if (b.v !== a.v) return b.v - a.v;
      // futuro: confronto direto
      const nomeA = (timesMap.get(a.teamId)?.nome || "").toUpperCase();
      const nomeB = (timesMap.get(b.teamId)?.nome || "").toUpperCase();
      return nomeA.localeCompare(nomeB);
    }

    for (const [h, arr] of map.entries()) {
      arr.sort(sortStats);
      map.set(h, arr);
    }

    return Array.from(map.entries()); // [[header, stats[]]]
  }, [camp, times, estatisticas, grupoPorTime, timesMap]);

  const avancamPorGrupo = camp?.avancam_por_grupo || 0;

  if (loading || !camp) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 16 }}>Carregando classificação…</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Classificação — {camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {camp.categoria} — {labelFormato(camp.formato)}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to={`/campeonatos/${camp.id}/partidas`} className="btn btn--muted">Partidas</Link>
            <Link to={`/campeonatos`} className="btn btn--muted">Voltar</Link>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="checkbox">
            <input type="checkbox" checked={somenteEncerradas} onChange={(e) => setSomenteEncerradas(e.target.checked)} />
            <span>Usar somente partidas encerradas</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={mostrarForma} onChange={(e) => setMostrarForma(e.target.checked)} />
            <span>Mostrar forma (últimos 5)</span>
          </label>
        </div>
      </div>

      {/* TABELAS */}
      {grupos.map(([header, arr]) => (
        <div key={header} className="card" style={{ padding: 0, marginBottom: 12 }}>
          <div style={{
            padding: "10px 12px",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            color: "var(--muted)",
            borderBottom: "1px solid var(--border)",
          }}>{header}</div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: "right" }}>#</th>
                  <th style={{ textAlign: "left" }}>Time</th>
                  <th>J</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>GP</th>
                  <th>GC</th>
                  <th>SG</th>
                  <th>%</th>
                  <th>Pts</th>
                  {mostrarForma && <th>Forma</th>}
                </tr>
              </thead>
              <tbody>
                {arr.map((s, idx) => (
                  <tr key={s.teamId}>
                    <td style={{ textAlign: "right" }}>{idx + 1}</td>
                    <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <TeamBadge time={timesMap.get(s.teamId)} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{timesMap.get(s.teamId)?.nome || "—"}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{timesMap.get(s.teamId)?.abreviacao || "—"}</div>
                      </div>
                    </td>
                    <td>{s.j}</td>
                    <td>{s.v}</td>
                    <td>{s.e}</td>
                    <td>{s.d}</td>
                    <td>{s.gp}</td>
                    <td>{s.gc}</td>
                    <td>{fmtSg(s.sg)}</td>
                    <td>{s.apr}%</td>
                    <td style={{ fontWeight: 700 }}>{s.pts}</td>
                    {mostrarForma && (
                      <td>
                        <Forma form={s.forma} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Faixas de classificação quando houver avançam_por_grupo */}
          {header !== "Classificação Geral" && avancamPorGrupo > 0 && (
            <div style={{ padding: 10, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted)" }}>
              Os <strong>{avancamPorGrupo}</strong> primeiros avançam para a próxima fase.
            </div>
          )}
        </div>
      ))}

      <style>{`
        .badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px;
          border-radius: 999px; border: 1px solid var(--border);
          background: var(--surface);
        }
        .forma {
          display: inline-flex; gap: 4px;
        }
        .forma__item { width: 18px; height: 18px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
        .forma__item--V { background: rgba(0, 200, 83, .15); border: 1px solid rgba(0, 200, 83, .45); }
        .forma__item--E { background: rgba(255, 193, 7, .15); border: 1px solid rgba(255, 193, 7, .45); }
        .forma__item--D { background: rgba(244, 67, 54, .15); border: 1px solid rgba(244, 67, 54, .45); }
      `}</style>
    </div>
  );
}

function TeamBadge({ time }) {
  const sigla = time?.abreviacao || "—";
  return (
    <span className="badge">
      <i aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "var(--muted)" }} />
      <span className="mono" style={{ minWidth: 24, textAlign: "center" }}>{sigla}</span>
    </span>
  );
}

function Forma({ form }) {
  if (!form || form.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="forma" title={form.join(" ")}> {form.map((f, i) => (
      <span key={i} className={`forma__item forma__item--${f}`}>{f}</span>
    ))}</div>
  );
}

function fmtSg(v) {
  if (!isNum(v)) return "—";
  if (v > 0) return "+" + v;
  return String(v);
}

function isNum(n) {
  return typeof n === "number" && !isNaN(n);
}

function normalizaGrupo(g) {
  if (!g && g !== 0) return null;
  if (typeof g === "number") return String.fromCharCode("A".charCodeAt(0) + g - 1);
  const s = String(g).trim();
  if (s.length === 1 && /[A-Za-z]/.test(s)) return s.toUpperCase();
  return s;
}

function labelFormato(v) {
  if (!v) return "";
  const s = v.toLowerCase();
  if (s === "pontos_corridos") return "Pontos Corridos";
  if (s === "grupos") return "Fase de Grupos";
  if (s === "mata_mata") return "Mata-mata";
  return v;
}
