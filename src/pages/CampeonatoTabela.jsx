// v1.1.0 — Classificação do Campeonato — Autenticação Supabase + RLS (ownerId)
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";         // <- named export
import TeamIcon from "../components/TeamIcon";
import { useAuth } from "@/auth/AuthProvider"; // altere para "../auth/AuthProvider" se não usar alias "@"

// Componente visual para "Últimas 5" (V/E/D)
function Ultimos5({ seq }) {
  let arr = [];
  if (Array.isArray(seq)) arr = seq;
  else if (typeof seq === "string") arr = seq.includes(",") ? seq.split(",") : seq.split("");
  arr = arr.slice(-5);
  const color = (r) => (r === "V" ? "#16a34a" : r === "D" ? "#dc2626" : "#6b7280");
  return (
    <div className="row" style={{ gap: 6, justifyContent: "center" }}>
      {arr.map((r, i) => (
        <span
          key={i}
          title={r}
          style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: color(r) }}
        />
      ))}
    </div>
  );
}

export default function CampeonatoTabela() {
  const { id: campeonatoId } = useParams();
  const { ownerId, loading: authLoading } = useAuth(); // <<< novo: id do dono autenticado

  const [camp, setCamp] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;            // espera resolver autenticação
    if (!ownerId) {                      // sem usuário => limpa e encerra
      setCamp(null);
      setRows([]);
      setLoading(false);
      return;
    }

    async function carregar() {
      setLoading(true);
      setErrorMsg("");
      try {
        // 1) Dados do campeonato — garante propriedade pelo ownerId
        const { data: c, error: eCamp } = await supabase
          .from("campeonatos")
          .select("*")
          .eq("id", campeonatoId)
          .eq("usuario_id", ownerId) // <<< checagem de dono
          .single();
        if (eCamp) throw eCamp;
        setCamp(c || null);

        // 2) Classificação via VIEW (filtrada por campeonato_id)
        const { data: cls, error: eCls } = await supabase
          .from("vw_classificacao")
          .select(`
            campeonato_id,
            grupo,
            posicao,
            time_id,
            nome,
            escudo_url,
            cor1,
            cor2,
            cor_detalhe,
            jogos,
            vitorias,
            empates,
            derrotas,
            gols_pro,
            gols_contra,
            saldo,
            pontos,
            percentual,
            ultimos5
          `)
          .eq("campeonato_id", campeonatoId)
          .order("grupo", { ascending: true })
          .order("posicao", { ascending: true });
        if (eCls) throw eCls;

        setRows(cls || []);
      } catch (err) {
        console.error("Erro ao carregar classificação:", err);
        setErrorMsg(err?.message || "Falha ao carregar classificação");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [authLoading, ownerId, campeonatoId]);

  // Agrupamento por grupo quando formato = "grupos"
  const grupos = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const isGrupos = (camp?.formato || "").toLowerCase() === "grupos";
    if (!isGrupos) return [["Classificação Geral", rows]];
    const m = new Map();
    for (const r of rows) {
      const g = r?.grupo ?? "—";
      if (!m.has(g)) m.set(g, []);
      m.get(g).push(r);
    }
    return Array.from(m.entries());
  }, [rows, camp?.formato]);

  // ===== Estados de carregamento/erro =====
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
        <div className="card">Carregando…</div>
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 14 }}>
          <div style={{ color: "#b91c1c", marginBottom: 8 }}>❌ {errorMsg}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Verifique se a view <code>vw_classificacao</code> existe com as colunas esperadas e se as policies permitem <em>select</em>.
          </div>
        </div>
      </div>
    );
  }
  if (!camp) {
    return (
      <div className="container">
        <div className="card">Campeonato não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header com destaque */}
      <div className="card" style={{ padding: 16, marginBottom: 12, background: "#f9fafb" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Classificação — {camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {camp.categoria} · {(camp.formato === "grupos") ? "Fase de Grupos" : "Pontos Corridos"}
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to={`/campeonatos/${camp.id}/partidas`} className="btn btn--muted">Partidas</Link>
            <Link to={`/campeonatos`} className="btn btn--muted">Voltar</Link>
          </div>
        </div>
      </div>

      {/* Tabelas (zebradas) */}
      {grupos.map(([grupo, lista]) => (
        <div key={String(grupo)} className="card" style={{ padding: 0, marginBottom: 12 }}>
          {camp.formato === "grupos" && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>
              Grupo {grupo}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table className="table tabela-zebrada" style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={{ width: 52, textAlign: "center" }}>Pos</th>
                  <th style={{ width: 40 }}></th>
                  <th style={{ minWidth: 220 }}>Time</th>
                  <th style={{ width: 60, textAlign: "center" }}>Pts</th>
                  <th style={{ width: 44, textAlign: "center" }}>J</th>
                  <th style={{ width: 44, textAlign: "center" }}>V</th>
                  <th style={{ width: 44, textAlign: "center" }}>E</th>
                  <th style={{ width: 44, textAlign: "center" }}>D</th>
                  <th style={{ width: 52, textAlign: "center" }}>GP</th>
                  <th style={{ width: 52, textAlign: "center" }}>GC</th>
                  <th style={{ width: 52, textAlign: "center" }}>SG</th>
                  <th style={{ width: 70, textAlign: "center" }}>%</th>
                  <th style={{ width: 110, textAlign: "center" }}>Últ. 5</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={`${String(grupo)}-${r.time_id}`}>
                    <td style={{ textAlign: "center" }}>{r.posicao}</td>
                    <td>
                      <TeamIcon
                        team={{ cor1: r.cor1, cor2: r.cor2, cor_detalhe: r.cor_detalhe }}
                        size={22}
                        title={r.nome}
                      />
                    </td>
                    <td>
                      <div className="list__title" style={{ lineHeight: 1.1 }}>{r.nome}</div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{r.pontos}</td>
                    <td style={{ textAlign: "center" }}>{r.jogos}</td>
                    <td style={{ textAlign: "center" }}>{r.vitorias}</td>
                    <td style={{ textAlign: "center" }}>{r.empates}</td>
                    <td style={{ textAlign: "center" }}>{r.derrotas}</td>
                    <td style={{ textAlign: "center" }}>{r.gols_pro}</td>
                    <td style={{ textAlign: "center" }}>{r.gols_contra}</td>
                    <td style={{ textAlign: "center" }}>{r.saldo}</td>
                    <td style={{ textAlign: "center" }}>{r.percentual != null ? `${r.percentual}%` : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <Ultimos5 seq={r.ultimos5} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
