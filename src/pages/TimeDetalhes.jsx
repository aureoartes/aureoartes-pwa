// src/pages/TimeDetalhes.jsx (versão refinada com btn--sm)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import ListaCompactaItem from "../components/ListaCompactaItem";
import TeamIcon from "../components/TeamIcon";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function TimeDetalhes() {
  const navigate = useNavigate();
  const { id: timeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(null);
  const [regiao, setRegiao] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [campeonatos, setCampeonatos] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [classificacao, setClassificacao] = useState([]);
  const [tab, setTab] = useState("estatisticas");

  useEffect(() => {
    if (!timeId) return;
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchTime(),
        fetchJogadores(),
        fetchCampeonatosDoTime(),
        fetchPartidasDoTime(),
        fetchClassificacaoDoTime(),
      ]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeId]);

  async function fetchTime() {
    const { data } = await supabase
      .from("times")
      .select("*, regioes:regiao_id ( id, descricao )")
      .eq("usuario_id", USUARIO_ID)
      .eq("id", timeId)
      .single();
    setTime(data);
    setRegiao(data?.regioes || null);
  }

  async function fetchJogadores() {
    const { data } = await supabase
      .from("jogadores")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .eq("time_id", timeId)
      .order("nome", { ascending: true });
    setJogadores(data || []);
  }

  async function fetchCampeonatosDoTime() {
    const { data: vincs } = await supabase
      .from("campeonato_times")
      .select("campeonato_id")
      .eq("time_id", timeId);

    const ids = (vincs || []).map((v) => v.campeonato_id);
    if (ids.length === 0) { setCampeonatos([]); return; }

    const { data } = await supabase
      .from("campeonatos")
      .select("id, nome, categoria, formato, numero_equipes")
      .in("id", ids)
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });

    setCampeonatos(data || []);
  }

  async function fetchPartidasDoTime() {
    const { data } = await supabase
      .from("partidas")
      .select("id, campeonato_id, time_a_id, time_b_id, gols_time_a, gols_time_b, encerrada")
      .or(`time_a_id.eq.${timeId},time_b_id.eq.${timeId}`);
    setPartidas(data || []);
  }

  async function fetchClassificacaoDoTime() {
    const { data } = await supabase
      .from("classificacao")
      .select("*")
      .eq("time_id", timeId);
    setClassificacao(data || []);
  }

  const stats = useMemo(() => {
    let jogos = 0, v = 0, e = 0, d = 0, gp = 0, gc = 0;
    for (const p of (partidas || [])) {
      if (p.encerrada === false) continue;
      jogos++;
      const souA = p.time_a_id === timeId;
      const meusGols = souA ? (p.gols_time_a ?? 0) : (p.gols_time_b ?? 0);
      const golsOponente = souA ? (p.gols_time_b ?? 0) : (p.gols_time_a ?? 0);
      gp += meusGols;
      gc += golsOponente;
      if (meusGols > golsOponente) v++;
      else if (meusGols < golsOponente) d++;
      else e++;
    }
    return { partidas: jogos, vitorias: v, empates: e, derrotas: d, golsPro: gp, golsContra: gc, saldo: gp - gc };
  }, [partidas, timeId]);

  if (loading) return <div className="container"><div className="card" style={{ padding: 14 }}>Carregando…</div></div>;

  if (!time) return <div className="container"><div className="card" style={{ padding: 14 }}>Time não encontrado. <button className="btn btn--muted" onClick={() => navigate(-1)}>Voltar</button></div></div>;

  const c1 = time.cor1 || "#FFFFFF";
  const c2 = time.cor2 || "#000000";
  const cd = time.cor_detalhe || "#000000";

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <Link to="/times" className="btn btn--muted">← Voltar</Link>
      </div>

      <div className="card team-card">
        <div className="team-card__banner" style={{ ["--c1"]: c1, ["--c2"]: c2 }} />
        <div className="team-card__badge" style={{ ["--cd"]: cd, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}>
          {time.escudo_url ? <img src={time.escudo_url} alt={`Escudo ${time.nome}`} /> : <span className="team-card__sigla" style={{ color: cd }}>{(time.abreviacao || "?").toUpperCase()}</span>}
        </div>
        <div className="team-card__info team-card__info--with-badge">
          <div>
            <div className="team-card__title">{time.nome}</div>
            <div className="team-card__subtitle">{time.categoria || "—"}</div>
            {regiao?.descricao && (<div className="text-muted" style={{ marginTop: 4 }}>Região: {regiao.descricao}</div>)}
          </div>
          <div className="team-card__dots">
            <span className="team-card__dot" style={{ background: c1 }} />
            <span className="team-card__dot" style={{ background: c2 }} />
            <span className="team-card__dot" style={{ background: cd }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
        <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "#fffdfa" }}>
          <TabButton active={tab === "estatisticas"} onClick={() => setTab("estatisticas")}>Estatísticas</TabButton>
          <TabButton active={tab === "campeonatos"} onClick={() => setTab("campeonatos")}>Campeonatos</TabButton>
          <TabButton active={tab === "jogadores"} onClick={() => setTab("jogadores")}>Jogadores</TabButton>
        </div>

        <div style={{ padding: 14 }}>
          {tab === "estatisticas" && <EstatisticasBlock stats={stats} totalCampeonatos={campeonatos?.length || 0} totalJogadores={jogadores?.length || 0} />}
          {tab === "campeonatos" && <CampeonatosBlock campeonatos={campeonatos} partidas={partidas} classificacao={classificacao} />}
          {tab === "jogadores" && <JogadoresBlock jogadores={jogadores} time={time} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick}
      style={{ flex: 1, border: 0, padding: "12px 14px", cursor: "pointer", fontWeight: 900, letterSpacing: ".3px", background: active ? "#fff3e6" : "transparent", color: active ? "#a65300" : "var(--muted)", borderBottom: active ? "3px solid var(--brand-600)" : "3px solid transparent" }}>{children}</button>
  );
}

function EstatisticasBlock({ stats, totalCampeonatos, totalJogadores }) {
  const items = [
    { k: "Partidas", v: stats.partidas },
    { k: "Vitórias", v: stats.vitorias },
    { k: "Empates", v: stats.empates },
    { k: "Derrotas", v: stats.derrotas },
    { k: "Gols pró", v: stats.golsPro },
    { k: "Gols contra", v: stats.golsContra },
    { k: "Saldo", v: stats.saldo },
    { k: "Campeonatos", v: totalCampeonatos },
    { k: "Jogadores", v: totalJogadores },
  ];
  return <div className="grid grid-3">{items.map((it) => (<div key={it.k} className="card" style={{ padding: 12 }}><div className="text-muted" style={{ fontSize: 12 }}>{it.k}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{it.v}</div></div>))}</div>;
}

function CampeonatosBlock({ campeonatos, partidas, classificacao }) {
  const guard = (enabled) => (e) => { if (!enabled) e.preventDefault(); };
  if (!campeonatos || campeonatos.length === 0) {
    return <div><div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span className="badge">0 campeonato(s)</span><Link className="btn btn--orange" to="/campeonatos">Gerenciar campeonatos</Link></div><div className="text-muted">Este time ainda não está em nenhum campeonato.</div></div>;
  }
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="badge">{campeonatos.length} campeonato(s)</span>
        <Link className="btn btn--orange" to="/campeonatos">Gerenciar campeonatos</Link>
      </div>
      <ul className="list">
        {campeonatos.map((c) => {
          const temPartidas = partidas.some((p) => p.campeonato_id === c.id);
          const temClassificacao = classificacao.some((cl) => cl.campeonato_id === c.id);
          return (
            <li key={c.id} className="list__item">
              <div className="list__left">
                <div className="list__title">{c.nome}</div>
                <div className="list__subtitle">{c.categoria || "—"} • {c.formato || "—"} • {c.numero_equipes ? `${c.numero_equipes} equipes` : ""}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <Link className="btn btn--sm btn--orange" to={`/campeonatos/${c.id}/partidas`} aria-disabled={!temPartidas} onClick={guard(temPartidas)}>Ver partidas</Link>
                <Link className="btn btn--sm btn--muted" to={`/campeonatos/${c.id}/tabela`} aria-disabled={!temClassificacao} onClick={guard(temClassificacao)}>Ver tabela</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function JogadoresBlock({ jogadores, time }) {
  const total = jogadores?.length || 0;

  const header = (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div className="text-muted">{total} jogador(es)</div>
      <Link to={`/jogadores?time=${time.id}`} className="btn btn--orange">Gerenciar jogadores</Link>
    </div>
  );

  if (!jogadores || total === 0) {
    return (
      <div>
        {header}
        <div className="text-muted">Nenhum jogador cadastrado para este time.</div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <ul className="list card">
        {jogadores.map((j) => {
          const titulo = j.apelido?.trim() ? j.apelido : j.nome;
          const subtitulo = [j.nome, (j.numero || j.numero === 0) && `#${j.numero}`, j.posicao]
            .filter(Boolean)
            .join(" — ");

          // Passa múltiplos aliases de props para garantir compatibilidade com TeamIcon
          const icone = (<TeamIcon team={time} size={24} />);

          return (
            <ListaCompactaItem
              key={j.id}
              icone={icone}
              titulo={titulo}
              subtitulo={subtitulo}
            />
          );
        })}
      </ul>
    </div>
  );
}
