// src/pages/TimeDetalhes.jsx
// v1.2.0.2 — Guia “Partidas” (Últimas 5 + Próximas 5) + Voltar com navigate(-1)
import { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
import { getContrastShadow } from "../utils/colors";
import ListaCompactaItem from "../components/ListaCompactaItem";
import TeamIcon from "../components/TeamIcon";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";

// ==== Helpers reaproveitados (baseados em CampeonatoPartidas) ====
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

function TabsHeader({ active, onChange, items }) {
  const containerRef = useRef(null);
  const scrollerRef = useRef(null);

  const update = useCallback(() => {
    const wrap = containerRef.current;
    const el = scrollerRef.current;
    if (!wrap || !el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const canLeft  = scrollLeft > 2;
    const canRight = scrollLeft + clientWidth < scrollWidth - 2;
    if (canLeft)  wrap.setAttribute("data-can-left", "true"); else wrap.removeAttribute("data-can-left");
    if (canRight) wrap.setAttribute("data-can-right","true"); else wrap.removeAttribute("data-can-right");
  }, []);

  useLayoutEffect(() => {
    // cálculo inicial (antes de qualquer clique)
    update();
    const raf = requestAnimationFrame(update);
    const t   = setTimeout(update, 0);

    const el = scrollerRef.current;
    if (!el) return () => { cancelAnimationFrame(raf); clearTimeout(t); };

    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [update, items.length]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current; if (!el) return;
    const dx = Math.round((el.clientWidth || 320) * 0.8) * dir;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div ref={containerRef} className="tabs tabs--scroll tabs--soft">
      {/* setas ficam sempre no DOM; CSS mostra/esconde via [data-can-*] */}
      <button
        type="button"
        className="btn btn--muted tabs__chevron tabs__chevron--left"
        style={{ zIndex: 2 }}  
        aria-label="Rolar abas para a esquerda"
        onClick={() => scrollByDir(-1)}
      >‹</button>

      <div
        ref={scrollerRef}
        className="tabs__scroller"
        role="tablist"
        aria-label="Seções"
        onWheel={(e) => { // rolagem vertical => horizontal
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            className={`tabs__item ${active === it.key ? "is-active" : ""}`}
            aria-selected={active === it.key}
            onClick={() => { onChange(it.key); update(); }}
          >
            {it.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--muted tabs__chevron tabs__chevron--right"
        style={{ zIndex: 2 }}  
        aria-label="Rolar abas para a direita"
        onClick={() => scrollByDir(+1)}
      >›</button>
    </div>
  );
}

export default function TimeDetalhes() {
  const navigate = useNavigate();
  const { id: timeId } = useParams();
  const { ownerId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(null);
  const [regiao, setRegiao] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [campeonatos, setCampeonatos] = useState([]);
  const [partidas, setPartidas] = useState([]);
  const [classificacao, setClassificacao] = useState([]);
  const [tab, setTab] = useState("estatisticas");
  const TAB_ITEMS = [
    { key: "estatisticas", label: "Estatísticas" },
    { key: "campeonatos", label: "Campeonatos" },
    { key: "partidas",     label: "Partidas" },
    { key: "jogadores",    label: "Jogadores" },
  ];

  // Carrega tudo quando tiver timeId e ownerId
  useEffect(() => {
    if (authLoading) return;
    if (!timeId || !ownerId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchTime(ownerId, timeId),
          fetchJogadores(ownerId, timeId),
          fetchCampeonatosDoTime(ownerId, timeId),
          fetchPartidasDoTime(ownerId, timeId),
          fetchClassificacaoDoTime(ownerId, timeId),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [timeId, ownerId, authLoading]);

  async function fetchTime(owner, id) {
    const { data, error } = await supabase
      .from("times")
      .select("*, regioes:regiao_id ( id, descricao ), categorias:categoria_id ( id, descricao )")
      .eq("usuario_id", owner)
      .eq("id", id)
      .single();
    if (error) {
      console.error("fetchTime error", error);
      setTime(null);
      setRegiao(null);
      return;
    }
    setTime(data);
    setRegiao(data?.regioes || null);
  }

  async function fetchJogadores(owner, id) {
    const { data, error } = await supabase
      .from("jogadores")
      .select("*")
      .eq("usuario_id", owner)
      .eq("time_id", id)
      .order("nome", { ascending: true });
    if (error) {
      console.error("fetchJogadores error", error);
      setJogadores([]);
      return;
    }
    setJogadores(data || []);
  }

  async function fetchCampeonatosDoTime(owner, id) {
    // 1) vínculos pelo time (sem filtrar por usuario_id aqui)
    const { data: vincs, error: ev } = await supabase
      .from("campeonato_times")
      .select("campeonato_id")
      .eq("time_id", id);
    if (ev) {
      console.error("fetchCampeonatosDoTime vincs error", ev);
      setCampeonatos([]);
      return;
    }

    const ids = (vincs || []).map((v) => v.campeonato_id).filter(Boolean);
    if (!ids.length) { setCampeonatos([]); return; }

    // 2) campeonatos do owner
    const { data, error } = await supabase
      .from("campeonatos")
      .select("id, nome, formato, numero_equipes, categorias:categoria_id ( id, descricao )")
      .in("id", ids)
      .eq("usuario_id", owner)
      .order("nome", { ascending: true });

    if (error) { console.error("fetchCampeonatosDoTime error", error); setCampeonatos([]); return; }
    setCampeonatos(data || []);
  }

  async function fetchPartidasDoTime(owner, id) {
    const { data, error } = await supabase
      .from("partidas")
      .select(`
        id, campeonato_id, time_a_id, time_b_id,
        gols_time_a, gols_time_b,
        penaltis_time_a, penaltis_time_b,
        is_mata_mata,
        encerrada, data_hora, "local",
        campeonato:campeonato_id ( id, nome ),
        time_a:time_a_id ( id, nome, abreviacao, cor1, cor2, cor_detalhe ),
        time_b:time_b_id ( id, nome, abreviacao, cor1, cor2, cor_detalhe )
      `)
      .eq("usuario_id", owner)
      .or(`time_a_id.eq.${id},time_b_id.eq.${id}`)
      .order("data_hora", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("fetchPartidasDoTime error", error);
      setPartidas([]);
      return;
    }
    setPartidas(data || []);
  }

  async function fetchClassificacaoDoTime(owner, id) {
    const { data, error } = await supabase
      .from("classificacao")
      .select("*")
      .eq("usuario_id", owner)
      .eq("time_id", id);
    if (error) {
      console.error("fetchClassificacaoDoTime error", error);
      setClassificacao([]);
      return;
    }
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
      gp += meusGols; gc += golsOponente;
      if (meusGols > golsOponente) v++;
      else if (meusGols < golsOponente) d++;
      else e++;
    }
    return { partidas: jogos, vitorias: v, empates: e, derrotas: d, golsPro: gp, golsContra: gc, saldo: gp - gc };
  }, [partidas, timeId]);

  if (authLoading) {
    return <div className="container"><div className="card" style={{ padding: 14 }}>Carregando usuário…</div></div>;
  }
  if (!ownerId) {
    return <div className="container"><div className="card" style={{ padding: 14 }}>Faça login para ver os detalhes do time.</div></div>;
  }
  if (loading) {
    return <div className="container"><div className="card" style={{ padding: 14 }}>Carregando…</div></div>;
  }
  if (!time) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 14 }}>
          Time não encontrado. <button className="btn btn--muted" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>
    );
  }

  const c1 = time.cor1 || "#FFFFFF";
  const c2 = time.cor2 || "#000000";
  const cd = time.cor_detalhe || "#000000";

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" className="btn btn--muted" onClick={() => navigate(-1)}>← Voltar</button>
      </div>

      <div className="card team-card">
        <div className="team-card__banner" style={{ "--c1": c1, "--c2": c2 }} />
        <div className="team-card__badge" style={{ "--cd": cd, background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }}>
          {time.escudo_url
            ? <img src={time.escudo_url} alt={`Escudo ${time.nome}`} />
            : <span className="team-card__sigla" style={{ color: cd, textShadow: getContrastShadow(cd) }}>
                {(time.abreviacao || "?").toUpperCase()}
              </span>}
        </div>
        <div className="team-card__info team-card__info--with-badge">
          <div>
            <div className="team-card__title">{time.nome}</div>
            {/* categoria via relação categorias:categoria_id */}
            <div className="team-card__subtitle">{time.categorias?.descricao || "—"}</div>
            {regiao?.descricao && (<div className="text-muted" style={{ marginTop: 4 }}>Região: {regiao.descricao}</div>)}
          </div>
          <div className="team-card__dots">
            <span className="team-card__dot" style={{ background: c1 }} />
            <span className="team-card__dot" style={{ background: c2 }} />
            <span className="team-card__dot" style={{ background: cd }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "visible", marginTop: 12 }}>
        <TabsHeader active={tab} onChange={setTab} items={TAB_ITEMS} />

        <div className="tabs__panel">
          {tab === "estatisticas" && (
            <EstatisticasBlock
              stats={stats}
              totalCampeonatos={campeonatos?.length || 0}
              totalJogadores={jogadores?.length || 0}
            />
          )}

          {tab === "campeonatos" && (
            <CampeonatosBlock
              campeonatos={campeonatos}
              partidas={partidas}
              classificacao={classificacao}
            />
          )}

          {tab === "partidas" && (
            <PartidasBlock partidas={partidas} isOwnerTeamId={timeId} />
          )}

          {tab === "jogadores" && <JogadoresBlock jogadores={jogadores} time={time} />}
        </div>
      </div>
 
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        flex: 1,
        border: 0,
        padding: "12px 14px",
        cursor: "pointer",
        fontWeight: 900,
        letterSpacing: ".3px",
        background: active ? "#fff3e6" : "transparent",
        color: active ? "#a65300" : "var(--muted)",
        borderBottom: active ? "3px solid var(--brand-600)" : "3px solid transparent",
      }}
    >
      {children}
    </button>
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
  return (
    <div className="grid grid-3">
      {items.map((it) => (
        <div key={it.k} className="card" style={{ padding: 12 }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{it.k}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{it.v}</div>
        </div>
      ))}
    </div>
  );
}

function CampeonatosBlock({ campeonatos, partidas, classificacao }) {
  const isNarrow = useIsNarrow(520);
  const [openMenuId, setOpenMenuId] = useState(null);

  const header = (
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span className="badge">{campeonatos?.length || 0} campeonato(s)</span>
      <Link className="btn btn--orange" to="/campeonatos">Gerenciar campeonatos</Link>
    </div>
  );

  if (!campeonatos || campeonatos.length === 0) {
    return (
      <div>
        {header}
        <div className="text-muted">Este time ainda não está em nenhum campeonato.</div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <ul className="list card">
        {campeonatos.map((c) => {
          const partidasDoCamp = (partidas || []).filter((p) => p.campeonato_id === c.id);
          const temPartidas = partidasDoCamp.length > 0;
          const temKnockout = partidasDoCamp.some((p) => p.is_mata_mata === true);
          const temNaoKnockout = partidasDoCamp.some((p) => p.is_mata_mata === false);

          const titulo = c.nome;
          const subtitulo = [
            c.categorias?.descricao || "—",
            c.formato || "—",
            c.numero_equipes ? `${c.numero_equipes} equipes` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          // Wide: renderiza somente os botões aplicáveis
          const linksWide = (
            <>
              {temPartidas && (
                <Link className="btn btn--sm btn--orange" to={`/campeonatos/${c.id}/partidas`}>Partidas</Link>
              )}
              {temKnockout && (
                <Link className="btn btn--sm btn--orange" to={`/campeonatos/${c.id}/chaveamento`}>Chaves</Link>
              )}
              {temNaoKnockout && (
                <Link className="btn btn--sm btn--orange" to={`/campeonatos/${c.id}/classificacao`}>Tabela</Link>
              )}
            </>
          );

          // Narrow: monta o array dinamicamente (só o que existir)
          const actions = [];
          if (temPartidas) actions.push({ label: "Partidas", variant: "orange", to: `/campeonatos/${c.id}/partidas` });
          if (temKnockout) actions.push({ label: "Chaves", variant: "orange", to: `/campeonatos/${c.id}/chaveamento` });
          if (temNaoKnockout) actions.push({ label: "Tabela", variant: "orange", to: `/campeonatos/${c.id}/classificacao` });

          const acoesNarrow = (
            <MenuAcoesNarrow
              id={c.id}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              actions={actions}
            />
          );

          return (
            <ListaCompactaItem
              key={c.id}
              icone={null}
              titulo={titulo}
              subtitulo={subtitulo}
              acoes={isNarrow ? acoesNarrow : linksWide}
            />
          );
        })}
      </ul>
    </div>
  );
}

function PartidasBlock({ partidas, isOwnerTeamId }) {
  const isNarrow = useIsNarrow(520);

  // separa encerradas/próximas
  const encerradas = (partidas || [])
    .filter((p) => !!p.encerrada)
    .sort((a, b) => {
      const da = a.data_hora ? new Date(a.data_hora).getTime() : 0;
      const db = b.data_hora ? new Date(b.data_hora).getTime() : 0;
      return db - da; // mais recentes primeiro
    })
    .slice(0, 5);

  const proximas = (partidas || [])
    .filter((p) => !p.encerrada)
    .sort((a, b) => {
      const da = a.data_hora ? new Date(a.data_hora).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.data_hora ? new Date(b.data_hora).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db; // as mais próximas primeiro
    })
    .slice(0, 5);

  const Section = ({ title, items }) => (
    <div style={{ marginBottom: 16 }}>
      <div
        className="list__section"
        style={{
          padding: "8px 12px",
          fontWeight: 600,
          background: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderBottom: 0,
        }}
      >
        {title}
      </div>

      <ul className="list card" style={{ marginTop: 0 }}>
        {items.length === 0 ? (
          <li className="list__item">Nenhuma partida.</li>
        ) : (
          items.map((p) => {
            // Subtítulo:
            // - Wide/desktop: campeonato · data/hora · local
            // - Mobile/vertical: apenas campeonato
            const subtitleWide =
              `${p.campeonato?.nome ? p.campeonato.nome + " · " : ""}` +
              `${p.data_hora ? toLocalDateTimeLabel(p.data_hora) : "Data a definir"}` +
              `${p.local ? " · " + p.local : ""}`;

            const subtitleNarrow = p.campeonato?.nome || "";
            const subtitleText = isNarrow ? subtitleNarrow : subtitleWide;

            return (
  <li key={p.id} className="list__item">
    <div
      className="list__left"
      style={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",   // <-- força segunda linha para o subtítulo
        alignItems: "flex-start",
        gap: 4,
      }}
    >
      {/* 1ª linha: A x B */}
      <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <TeamIcon team={p.time_a} size={20} />
        <span className="mono">{timeLabel(p, "a", isNarrow)}</span>
        <strong className="mono">{p.encerrada ? (p.gols_time_a ?? 0) : "—"}</strong>
        <span className="mono">x</span>
        <strong className="mono">{p.encerrada ? (p.gols_time_b ?? 0) : "—"}</strong>
        <span className="mono">{timeLabel(p, "b", isNarrow)}</span>
        <TeamIcon team={p.time_b} size={20} />
      </div>

      {/* 2ª linha: subtítulo SEMPRE separado
          - narrow: só campeonato
          - wide: campeonato · data/hora · local */}
      {(() => {
        const subtitleWide =
          `${p.campeonato?.nome ? p.campeonato.nome + " · " : ""}` +
          `${p.data_hora ? toLocalDateTimeLabel(p.data_hora) : "Data a definir"}` +
          `${p.local ? " · " + p.local : ""}`;
        const subtitleNarrow = p.campeonato?.nome || "";
        const subtitleText = isNarrow ? subtitleNarrow : subtitleWide;

        return (
          subtitleText && (
            <div className="list__subtitle" style={{ marginTop: 2 }}>
              {subtitleText}
            </div>
          )
        );
      })()}

      {/* 3ª linha: pênaltis, se houver */}
      {p.encerrada && p.penaltis_time_a != null && p.penaltis_time_b != null && (
        <div className="text-muted" style={{ fontSize: 12 }}>
          Pênaltis: {p.penaltis_time_a}-{p.penaltis_time_b}
        </div>
      )}
    </div>
  </li>
);


          })
        )}
      </ul>
    </div>
  );

  return (
    <div>
      <Section title="Últimas 5 partidas" items={encerradas} />
      <Section title="Próximas 5 partidas" items={proximas} />
    </div>
  );
}

function JogadoresBlock({ jogadores, time }) {
  const total = jogadores?.length || 0;

  const header = (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div className="badge">{total} jogador(es)</div>
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
          const icone = <TeamIcon team={time} size={24} />;

          return <ListaCompactaItem key={j.id} icone={icone} titulo={titulo} subtitulo={subtitulo} />;
        })}
      </ul>
    </div>
  );
}
