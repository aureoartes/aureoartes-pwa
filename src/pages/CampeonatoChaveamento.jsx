// src/pages/CampeonatoChaveamento.jsx (V6)
// Visão de mata‑mata (bracket) — layout horizontal com conectores entre colunas
// Foco visual: nomes completos, hover, conectores SVG; agregado com inversão de mando; "-" para jogos não encerrados

import { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import TeamIcon from "../components/TeamIcon";

const ETAPAS_ORDEM = [
  "preliminar",
  "64-avos",
  "32-avos",
  "16-avos",
  "oitavas",
  "quartas",
  "semifinal",
  "final"
]; // 3º lugar é ocultado

function normalizeEtapa(raw) {
  if (!raw) return "";
  let s = String(raw).toLowerCase();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos (faixa Unicode combinantes)
  s = s.replace(/[^a-z0-9]+/g, '_'); // separadores -> _
  if (/prelim/.test(s) || /qualif/.test(s) || /play[-_ ]?in/.test(s)) return 'preliminar';
  if (/(64|sessenta_e_quatro).*avos/.test(s) || /^64-avos?$/.test(s)) return '64-avos';
  if (/(32|trinta_e_dois).*avos/.test(s) || /^32-avos?$/.test(s)) return '32-avos';
  if (/(16|dezesseis).*avos/.test(s) || /^16-avos?$/.test(s)) return '16-avos';
  if (/oitava/.test(s)) return 'oitavas';
  if (/quarta/.test(s)) return 'quartas';
  if (/semi/.test(s)) return 'semifinal';
  if (/final/.test(s)) return 'final';
  return String(raw).toLowerCase();
}

function etapaTitulo(etapa) {
  const e = (etapa || "").toLowerCase();
  if (e === "preliminar") return "PRELIMINAR";
  if (e === "64-avos") return "64º AVOS";
  if (e === "32-avos") return "32º AVOS";
  if (e === "16-avos") return "16º AVOS";
  if (e === "oitavas") return "OITAVAS";
  if (e === "quartas") return "QUARTAS";
  if (e === "semifinal") return "SEMIFINAL";
  if (e === "final") return "FINAL";
  return (etapa || "FASE").toUpperCase();
}

// --- Bracket grid helpers (alinhamento vertical tipo chaveamento)
const ROW_H = 56;
function rowStartFor(colIndexRel, idxInCol) {
  // Coluna 0 encostada no topo (1,3,5,7...), fases seguintes centralizadas (2,6... / 4 ...)
  const c = Math.max(0, colIndexRel | 0);
  if (c === 0) {
    return 1 + idxInCol * 2;
  }
  const base = 1 << c; // 2^c
  return base + idxInCol * (1 << (c + 1));
}

function gridStyleForColumn(baseMatchesCount) {
  const totalRows = 1 << Math.ceil(Math.log2(Math.max(1, baseMatchesCount)) + 1);
  return { display: 'grid', gridTemplateRows: `repeat(${totalRows}, ${ROW_H}px)`, alignItems: 'start' };
}

// Conectores em SVG entre colunas adjacentes (horizontal)
function ConnectorLayer({ containerRef }) {
  const svgRef = useRef(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const draw = () => {
      const svg = svgRef.current;
      if (!svg) return;
      // Usa o scroller real (a .card com overflow) para corrigir offsets
      const scroller = el.parentElement?.closest('.card') || el;
      const rect = el.getBoundingClientRect();
      const cards = Array.from(el.querySelectorAll('.match-card'));
      const byCol = new Map();
      for (const c of cards) {
        const col = Number(c.getAttribute('data-col'));
        const idx = Number(c.getAttribute('data-idx'));
        if (!byCol.has(col)) byCol.set(col, []);
        byCol.get(col)[idx] = c;
      }
      const width = (scroller?.scrollWidth || el.scrollWidth);
      const height = (scroller?.scrollHeight || el.scrollHeight);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.style.width = width + 'px';
      svg.style.height = height + 'px';
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!width || !height) return;
      for (const [col, arr] of byCol) {
        const next = byCol.get(col + 1);
        if (!next) continue;
        arr.forEach((fromCard, i) => {
          const toIdx = Math.floor(i / 2);
          const toCard = next[toIdx];
          if (!fromCard || !toCard) return;
          const a = fromCard.getBoundingClientRect();
          const b = toCard.getBoundingClientRect();
          const startX = (a.right - rect.left) + (scroller?.scrollLeft || 0);
          const startY = (a.top - rect.top) + a.height / 2 + (scroller?.scrollTop || 0);
          const endX   = (b.left - rect.left) + (scroller?.scrollLeft || 0);
          const endY   = (b.top - rect.top) + b.height / 2 + (scroller?.scrollTop || 0);
          const midX = (startX + endX) / 2;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', '#FF7A00');
          path.setAttribute('stroke-width', '3');
          path.setAttribute('opacity', '1');
          svg.appendChild(path);
        });
      }
    };
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    // Observa a rolagem do pai scrollável (ui.board)
    const scrollParent = el.parentElement?.closest('.card') || el.parentElement;
    window.addEventListener('resize', draw);
    scrollParent?.addEventListener('scroll', draw);
    el.addEventListener('scroll', draw);
    draw();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', draw);
      el.removeEventListener('scroll', draw);
      const scrollParent = el.parentElement?.closest('.card') || el.parentElement;
      scrollParent?.removeEventListener('scroll', draw);
    };
  }, [containerRef]);
  return <svg ref={svgRef} style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:10}} />;
}

// Decide vencedor (agregado + pênaltis) mapeando por ID do time
function decidirVencedor(par) {
  const ida = par.ida || null;
  const volta = par.volta || null;
  if (!ida && !volta) return { vencedor: null, agregado: null };

  // Identifica os dois times (independente de A/B em cada perna)
  const t1 = ida?.time_a || ida?.time_b || volta?.time_a || volta?.time_b;
  const t2 = [ida?.time_a, ida?.time_b, volta?.time_a, volta?.time_b].find(t => t && t.id !== t1?.id) || null;
  if (!t1 || !t2) return { vencedor: null, agregado: null };

  const golsDoTime = (match, team) => {
    if (!match) return null;
    if (!match.encerrada) return null;
    if (match.time_a?.id === team.id) return match.gols_time_a ?? 0;
    if (match.time_b?.id === team.id) return match.gols_time_b ?? 0;
    return null;
  };

  const g1 = (golsDoTime(ida, t1) ?? 0) + (golsDoTime(volta, t1) ?? 0);
  const g2 = (golsDoTime(ida, t2) ?? 0) + (golsDoTime(volta, t2) ?? 0);

  // Ambas as pernas encerradas (ou só ida existente & encerrada)
  const ambasEncerradas = (ida?.encerrada || false) && (volta ? volta.encerrada : true);
  if (!ambasEncerradas) return { vencedor: null, agregado: null };

  if (g1 !== g2) return { vencedor: g1 > g2 ? t1 : t2, agregado: `${g1}-${g2}` };

  // Empate: decide por pênaltis da volta (ou da única perna)
  const m = volta || ida;
  if (m?.penaltis_time_a != null && m?.penaltis_time_b != null && m.penaltis_time_a !== m.penaltis_time_b) {
    const pen1 = m.time_a?.id === t1.id ? m.penaltis_time_a : m.penaltis_time_b;
    const pen2 = m.time_a?.id === t2.id ? m.penaltis_time_a : m.penaltis_time_b;
    return { vencedor: pen1 > pen2 ? t1 : t2, agregado: `${g1}-${g2} (p)` };
  }
  return { vencedor: null, agregado: `${g1}-${g2}` };
}

function NomeTime({ team, title, maxWidth = 160 }) {
  const full = team?.nome || team?.abreviacao || title || 'Time';
  // Truncamento seguro via CSS (ellipsis) com largura fixa visual
  return (
    <span
      title={full}
      style={{
        display: 'inline-block',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : String(maxWidth),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle'
      }}
    >
      {full}
    </span>
  );
}
  
export default function CampeonatoChaveamento() {
  const { id: campeonatoId } = useParams();

  const [camp, setCamp] = useState(null);
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const bracketRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro("");
      try {
        const { data: c, error: e1 } = await supabase
          .from('campeonatos')
          .select('*')
          .eq('id', campeonatoId)
          .single();
        if (e1) throw e1;
        setCamp(c);

        const { data: ps, error: e2 } = await supabase
          .from('partidas')
          .select(`id, chave_id, etapa, perna, is_mata_mata, encerrada,
                    gols_time_a, gols_time_b, penaltis_time_a, penaltis_time_b,
                    time_a:time_a_id(id, nome, abreviacao, cor1, cor2, cor_detalhe),
                    time_b:time_b_id(id, nome, abreviacao, cor1, cor2, cor_detalhe)`)
          .eq('campeonato_id', campeonatoId)
          .eq('is_mata_mata', true)
          .order('etapa', { ascending: true })
          .order('chave_id', { ascending: true })
          .order('perna', { ascending: true, nullsFirst: true });
        if (e2) throw e2;
        setJogos(ps || []);
      } catch (err) {
        setErro(err?.message || 'Falha ao carregar chaveamento');
      } finally {
        setLoading(false);
      }
    })();
  }, [campeonatoId]);

  // Agrupa por etapa -> chaves (ida/volta)
  const colunas = useMemo(() => {
    // 1) Agrupa jogos reais por etapa normalizada (ignorando 3º lugar)
    const porEtapa = new Map();
    if (Array.isArray(jogos)) {
      for (const j of jogos) {
        const etapaKeyRaw = j?.etapa || '';
        const etapaKey = normalizeEtapa(etapaKeyRaw);
        if (!etapaKey) continue;
        if (/terce/.test(etapaKey) || /^3/.test(etapaKey)) continue;
        if (!porEtapa.has(etapaKey)) porEtapa.set(etapaKey, new Map());
        const porChave = porEtapa.get(etapaKey);
        const k = j.chave_id || j.id;
        if (!porChave.has(k)) porChave.set(k, { ida: null, volta: null, meta: { chave_id: k } });
        if (j.perna === 1 || j.perna == null) porChave.get(k).ida = j; else porChave.get(k).volta = j;
      }
    }

    const stagesPresent = Array.from(porEtapa.keys());
    if (stagesPresent.length === 0) return [];

    const orderIndex = (k) => ETAPAS_ORDEM.indexOf(k);
    const nonPrelim = stagesPresent.filter(k => k !== 'preliminar');
    const startStage = nonPrelim.length > 0 ? nonPrelim.sort((a,b) => orderIndex(a)-orderIndex(b))[0] : 'preliminar';
    const startIdx = Math.max(0, orderIndex(startStage));
    const etapas = ETAPAS_ORDEM.slice(startIdx);

    const sizeReal = new Map();
    for (const k of etapas) sizeReal.set(k, porEtapa.get(k)?.size || 0);

    const sizeWanted = new Map();
    for (let i=0;i<etapas.length;i++){
      const k = etapas[i];
      const real = sizeReal.get(k) || 0;
      if (real>0) sizeWanted.set(k, real);
      else {
        if (k==='preliminar'){ sizeWanted.set(k,0); continue; }
        const prev = i>0 ? (sizeWanted.get(etapas[i-1])||0):0;
        sizeWanted.set(k, prev>0 ? Math.max(1, Math.ceil(prev/2)) : 0);
      }
    }

    const out=[]; let colIndex=0;
    for(const etapaKey of etapas){
      const titulo = etapaTitulo(etapaKey);
      const reaisMap = porEtapa.get(etapaKey);
      let reais = reaisMap ? Array.from(reaisMap.values()) : [];
      let wanted = sizeWanted.get(etapaKey) || 0;
      if (etapaKey==='preliminar') wanted=reais.length;
      const hasAnyRight = ETAPAS_ORDEM.slice(ETAPAS_ORDEM.indexOf(etapaKey)).some(k=>(sizeWanted.get(k)||0)>0||(porEtapa.get(k)?.size||0)>0);
      if (wanted===0 && reais.length===0 && !hasAnyRight) continue;

      // Ordena jogos por chave_id numérica quando possível
      reais.sort((a,b)=>{
        const ka=Number(a?.meta?.chave_id ?? a?.ida?.chave_id ?? a?.volta?.chave_id ?? Infinity);
        const kb=Number(b?.meta?.chave_id ?? b?.ida?.chave_id ?? b?.volta?.chave_id ?? Infinity);
        if(!Number.isNaN(ka)&&!Number.isNaN(kb)) return ka-kb;
        return String(a?.meta?.chave_id ?? a?.ida?.chave_id ?? a?.volta?.chave_id ?? '').localeCompare(String(b?.meta?.chave_id ?? b?.ida?.chave_id ?? b?.volta?.chave_id ?? ''));
      });

      // Agrupa pares em blocos de acordo com a próxima fase (para alinhar "irmãos")
      const nextEtapa = etapas[etapas.indexOf(etapaKey)+1];
      if(nextEtapa && porEtapa.has(nextEtapa)){
        const filhos = Array.from(porEtapa.get(nextEtapa).values());
        const grupos = [];
        filhos.forEach(f=>{
          const ids=[f?.ida?.time_a?.id,f?.ida?.time_b?.id,f?.volta?.time_a?.id,f?.volta?.time_b?.id].filter(Boolean);
          const pais = reais.filter(r=>{
            const tids=[r?.ida?.time_a?.id,r?.ida?.time_b?.id,r?.volta?.time_a?.id,r?.volta?.time_b?.id].filter(Boolean);
            return tids.some(id=>ids.includes(id));
          });
          if(pais.length>0) grupos.push(pais);
        });
        const flattened = [].concat(...grupos);
        const resto = reais.filter(r=>!flattened.includes(r));
        reais = [...flattened,...resto];
      }

      const pares=[...reais];
      while(pares.length<wanted) pares.push({ida:null,volta:null,meta:{placeholder:true}});
      const concluidos = reais.reduce((acc,par)=>acc+(decidirVencedor(par).vencedor?1:0),0);
      out.push({ etapaKey,titulo,pares,concluidos,total:pares.length,colIndex:colIndex++ });
    }
    // Reordena visualmente cada fase para agrupar pais sob o mesmo filho da fase seguinte
    for (let i = 0; i < out.length - 1; i++) {
      const cur = out[i];
      const nxt = out[i + 1];

      const nextTeams = nxt.pares.map((p) => {
        const ida = p.ida || null; const volta = p.volta || null;
        const t1 = ida?.time_a || ida?.time_b || volta?.time_a || volta?.time_b;
        const t2 = [ida?.time_a, ida?.time_b, volta?.time_a, volta?.time_b].find(t => t && t.id !== t1?.id) || null;
        return new Set([t1?.id, t2?.id].filter(Boolean));
      });

      const teamsOf = (par) => {
        const ida = par.ida || null; const volta = par.volta || null;
        const t1 = ida?.time_a || ida?.time_b || volta?.time_a || volta?.time_b;
        const t2 = [ida?.time_a, ida?.time_b, volta?.time_a, volta?.time_b].find(t => t && t.id !== t1?.id) || null;
        return new Set([t1?.id, t2?.id].filter(Boolean));
      };

      const groupIndex = (par) => {
        const ts = teamsOf(par);
        for (let j = 0; j < nextTeams.length; j++) {
          const tgt = nextTeams[j];
          if (tgt.size === 0) continue;
          for (const id of ts) if (tgt.has(id)) return j;
        }
        return Number.MAX_SAFE_INTEGER;
      };

      const chaveNum = (par) => {
        const k = Number(par?.meta?.chave_id ?? par?.ida?.chave_id ?? par?.volta?.chave_id);
        return Number.isNaN(k) ? Number.MAX_SAFE_INTEGER : k;
      };

      cur.pares = cur.pares.slice().sort((a, b) => {
        const ga = groupIndex(a), gb = groupIndex(b);
        if (ga !== gb) return ga - gb;
        return chaveNum(a) - chaveNum(b);
      });
    }

    return out;
  },[jogos]);

  if (loading) return (
    <div className="container"><div className="card">Carregando…</div></div>
  );
  if (erro) return (
    <div className="container"><div className="card">❌ {erro}</div></div>
  );

  // estilos visuais
  const ui = {
    container: {},
    headerWrap: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badge: { background: '#FFF1E5', border: '1px solid #FFD6B8', color: '#B45309', fontWeight: 700, padding: '2px 8px', borderRadius: 999, fontSize: 12, marginLeft: 8 },
    board: { overflowX: 'auto', padding: 0 },
    lane: { position: 'relative', display: 'grid', gridAutoFlow: 'column', gap: 16, padding: 12, scrollSnapType: 'x mandatory', alignItems: 'start' },
    col: (i) => ({
      minWidth: 320, scrollSnapAlign: 'start',
      background: i % 2 === 0 ? 'linear-gradient(180deg,#fafafa,#fff)' : 'linear-gradient(180deg,#fff,#fafafa)',
      border: '1px solid #eef2f7', borderRadius: 16, padding: 10,
      boxShadow: '0 1px 0 rgba(0,0,0,.02) inset', position: 'relative', zIndex: 0
    }),
    colHeader: { padding: '8px 10px', marginBottom: 8, borderBottom: '2px solid #FF6600', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, letterSpacing: .6, fontSize: 12 },
    matches: (n0) => ({ ...gridStyleForColumn(n0), gap: 8 }),
    card: (destaque) => ({
      borderRadius: 14, padding: 12,
      background: destaque ? '#FFF7ED' : '#fff',
      boxShadow: destaque ? '0 10px 16px rgba(255,102,0,.12), 0 1px 2px rgba(0,0,0,.06)' : '0 4px 10px rgba(0,0,0,.05)',
      border: destaque ? '1px solid #FFD6B8' : '1px solid #eef2f7',
      transition: 'transform .12s ease, box-shadow .12s ease', position: 'relative', zIndex: 1
    }),
    cardHover: { transform: 'translateY(-1px)', boxShadow: '0 12px 18px rgba(0,0,0,.08)' },
    row: { alignItems: 'center', gap: 10 },
    teamNameWrap: { flex: 1, minWidth: 0 },
    teamName: (isWinner) => ({ fontSize: 14, fontWeight: isWinner ? 800 : 600, color: isWinner ? '#b45309' : 'inherit' }),
    pillBase: { padding: '2px 6px', borderRadius: 12, fontSize: 12, lineHeight: 1.2, marginLeft: 6, display: 'inline-block', fontVariantNumeric: 'tabular-nums', minWidth: '1.6em', textAlign: 'center' },
    pillIda: (showVolta, encerrada) => ({ background: showVolta ? '#f3f4f6' : (encerrada ? '#fde68a' : '#f3f4f6'), fontWeight: showVolta ? 500 : 700 }),
    pillVolta: () => ({ background: '#f3f4f6' }),
    pillAgg: { background: '#e0f2fe', fontWeight: 700 },
    pillPen: { background: '#fde2e2', color: '#991b1b', fontWeight: 700 },
  };

  const baseCount = Math.max(1, colunas[0]?.total || 1);

  return (
    <div className="container" style={ui.container}>
      <div className="row" style={ui.headerWrap}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Chaveamento — {camp?.nome}</h1>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Mata‑mata</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link to={`/campeonatos/${camp?.id}/partidas`} className="btn btn--muted">Voltar</Link>
        </div>
      </div>

      <div className="card" style={ui.board}>
        <div className="bracket" ref={bracketRef} style={ui.lane}>
          {colunas.map((col) => (
            <div key={col.etapaKey} style={ui.col(col.colIndex)} data-col={col.colIndex}>
              <div style={ui.colHeader}>
                <span>{col.titulo}</span>
                <span style={ui.badge}>{col.concluidos}/{col.total}</span>
              </div>
              <div style={ui.matches(baseCount)}>
                {col.pares.map((par, idx) => {
                  const rowStart = rowStartFor(col.colIndex, idx);
                  const isPlaceholder = !!par?.meta?.placeholder;
                  const ida = par.ida || null;
                  const volta = par.volta || null;

                  // Times por ID (lida com inversão de mando)
                  const t1 = isPlaceholder ? null : (ida?.time_a || ida?.time_b || volta?.time_a || volta?.time_b);
                  const t2 = isPlaceholder ? null : ([ida?.time_a, ida?.time_b, volta?.time_a, volta?.time_b].find(t => t && t.id !== t1?.id) || null);

                  const golsDoTime = (match, team) => {
                    if (!match) return null;
                    if (!match.encerrada) return null; // mostra '-'
                    if (match.time_a?.id === team?.id) return match.gols_time_a ?? 0;
                    if (match.time_b?.id === team?.id) return match.gols_time_b ?? 0;
                    return null;
                  };
                  const penDoTime = (match, team) => {
                    if (!match) return null;
                    if (match.time_a?.id === team?.id) return match.penaltis_time_a ?? null;
                    if (match.time_b?.id === team?.id) return match.penaltis_time_b ?? null;
                    return null;
                  };

                  const idaA = isPlaceholder ? null : golsDoTime(ida, t1);
                  const idaB = isPlaceholder ? null : golsDoTime(ida, t2);
                  const voltaA = isPlaceholder ? null : golsDoTime(volta, t1);
                  const voltaB = isPlaceholder ? null : golsDoTime(volta, t2);

                  const penA = isPlaceholder ? null : penDoTime(volta || ida, t1);
                  const penB = isPlaceholder ? null : penDoTime(volta || ida, t2);

                  const showVolta = !!volta && !isPlaceholder;
                  const ambasEncerradas = !isPlaceholder && (ida?.encerrada || false) && (volta ? volta.encerrada : false);
                  const aggA = ambasEncerradas ? ((idaA ?? 0) + (voltaA ?? 0)) : null;
                  const aggB = ambasEncerradas ? ((idaB ?? 0) + (voltaB ?? 0)) : null;

                  const { vencedor } = isPlaceholder ? { vencedor: null } : decidirVencedor(par);
                  const isWinnerA = vencedor && t1 && vencedor.id === t1?.id;
                  const isWinnerB = vencedor && t2 && vencedor.id === t2?.id;

                  const renderNum = (valor, encerrada) => (encerrada ? (valor ?? 0) : '–');

                  const cardStyle = isPlaceholder
                    ? { ...ui.card(false), borderStyle: 'dashed', background: '#fafafa' }
                    : ui.card(!!vencedor);

                  return (
                    <div
                      key={idx}
                      className="match-card"
                      data-col={col.colIndex}
                      data-idx={idx}
                      data-chave={(par?.meta?.chave_id ?? par?.ida?.chave_id ?? par?.volta?.chave_id) ?? ''}
                      data-teams={`${t1?.id || ''},${t2?.id || ''}`}
                      style={{ ...cardStyle, gridRow: `${rowStart} / span 1`, minHeight: ROW_H - 16 }}
                      onMouseEnter={(e) => !isPlaceholder && Object.assign(e.currentTarget.style, ui.cardHover)}
                      onMouseLeave={(e) => !isPlaceholder && Object.assign(e.currentTarget.style, ui.card(!!vencedor))}
                    >
                      {/* Linha A */}
                      <div className="row" style={ui.row}>
                        <TeamIcon team={t1} size={26} />
                        <div style={ui.teamNameWrap}>
                          <div style={{ ...ui.teamName(isWinnerA), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{isPlaceholder ? 'Aguardando confrontos' : <NomeTime team={t1} title="Time A" />}</span>
                            <span>
                              {isPlaceholder ? (
                                <span style={{ ...ui.pillBase, background: '#eee' }}>–</span>
                              ) : (
                                <>
                                  {ida && (<span title="Gols na ida" style={{ ...ui.pillBase, ...ui.pillIda(showVolta, ida?.encerrada) }}>{renderNum(idaA, ida?.encerrada)}</span>)}
                                  {showVolta && (<span title="Gols na volta" style={{ ...ui.pillBase, ...ui.pillVolta(volta?.encerrada) }}>{renderNum(voltaA, volta?.encerrada)}</span>)}
                                  {ambasEncerradas && (<span title="Gols no agregado" style={{ ...ui.pillBase, ...ui.pillAgg }}>{aggA}</span>)}
                                  {(penA != null) && (volta?.encerrada || (!volta && ida?.encerrada)) && (<span title="Pênaltis" style={{ ...ui.pillBase, ...ui.pillPen }}>p {penA}</span>)}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Linha B */}
                      <div className="row" style={{ ...ui.row, marginTop: 6 }}>
                        <TeamIcon team={t2} size={26} />
                        <div style={ui.teamNameWrap}>
                          <div style={{ ...ui.teamName(isWinnerB), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{isPlaceholder ? 'Aguardando confrontos' : <NomeTime team={t2} title="Time B" />}</span>
                            <span>
                              {isPlaceholder ? (
                                <span style={{ ...ui.pillBase, background: '#eee' }}>–</span>
                              ) : (
                                <>
                                  {ida && (<span title="Gols na ida" style={{ ...ui.pillBase, ...ui.pillIda(showVolta, ida?.encerrada) }}>{renderNum(idaB, ida?.encerrada)}</span>)}
                                  {showVolta && (<span title="Gols na volta" style={{ ...ui.pillBase, ...ui.pillVolta(volta?.encerrada) }}>{renderNum(voltaB, volta?.encerrada)}</span>)}
                                  {ambasEncerradas && (<span title="Gols no agregado" style={{ ...ui.pillBase, ...ui.pillAgg }}>{aggB}</span>)}
                                  {(penB != null) && (volta?.encerrada || (!volta && ida?.encerrada)) && (<span title="Pênaltis" style={{ ...ui.pillBase, ...ui.pillPen }}>p {penB}</span>)}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Conectores por cima (z-index 2) */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12 }}>
            <ConnectorLayer containerRef={bracketRef} />
          </div>

          {/* Fallback */}
          {colunas.length === 0 && (
            <div style={{ padding: 12 }}>Nenhuma partida de mata‑mata encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
