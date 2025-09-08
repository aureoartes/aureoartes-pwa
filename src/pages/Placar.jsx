// src/pages/Placar.jsx (versão consolidada base única)
// Mantemos este arquivo como referência única para evoluir daqui em diante.


import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import TeamIcon from "../components/TeamIcon";
import { getContrastShadow } from "../utils/colors";
import logo from "../assets/logo_aureoartes.png";


export default function Placar() {
  const { partidaId } = useParams();
  const navigate = useNavigate();
  const isAvulso = !partidaId;

  // ===== Estado base =====
  const [partida, setPartida] = useState(null);
  const [camp, setCamp] = useState(null);
  const [timeA, setTimeA] = useState({ id: null, nome: "Time A", abrev: "", escudo_url: null });
  const [timeB, setTimeB] = useState({ id: null, nome: "Time B", abrev: "", escudo_url: null });

  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);

  const [fase, setFase] = useState("1T"); // 1T | 2T | PR1 | PR2 | PEN
  const [segRestantes, setSegRestantes] = useState(0);
  const [rodando, setRodando] = useState(false);

  const [usaProrrogacao, setUsaProrrogacao] = useState(false);
  const [durTempo, setDurTempo] = useState(10); // min
  const [durProrro, setDurProrro] = useState(5); // min
  const [qtdPen, setQtdPen] = useState(5);

  const [penA, setPenA] = useState(0);
  const [penB, setPenB] = useState(0);
  const [penAMiss, setPenAMiss] = useState(0);
  const [penBMiss, setPenBMiss] = useState(0);

  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");

  const [encerrada, setEncerrada] = useState(false);

  // Mata-mata
  const [isMataMata, setIsMataMata] = useState(false);
  const [perna, setPerna] = useState(null);
  const [chaveId, setChaveId] = useState(null);
  const [etapa, setEtapa] = useState(null);
  const [ida, setIda] = useState(null);

  const intervalRef = useRef(null);

  // ===== Carregamento =====
  useEffect(() => {
    if (isAvulso) {
      setDurTempo(10); setUsaProrrogacao(false); setDurProrro(5); setQtdPen(5);
      setFase("1T"); setSegRestantes(10 * 60); setRodando(false);
      return;
    }
    (async () => {
      const { data: p } = await supabase.from("partidas").select("*").eq("id", partidaId).single();
      if (!p) return;
      setPartida(p);

      const { data: c } = await supabase.from("campeonatos").select("*").eq("id", p.campeonato_id).single();
      setCamp(c || null);

      const tempoMin = c?.duracao_tempo ?? 10;
      const pr = !!c?.prorrogacao;
      const prMin = c?.duracao_prorrogacao ?? 5;
      const qpen = c?.qtd_penaltis ?? 5;
      setDurTempo(tempoMin); setUsaProrrogacao(pr); setDurProrro(pr ? prMin : 5); setQtdPen(qpen);

      setIsMataMata(!!p.is_mata_mata); setPerna(p.perna ?? null); setChaveId(p.chave_id ?? null); setEtapa(p.etapa || null);

      const ids = [p.time_a_id, p.time_b_id].filter(Boolean);
      if (ids.length) {
        const { data: ts } = await supabase
          .from("times")
          .select("id, nome, abreviacao, cor1, cor2, cor_detalhe, escudo_url")
          .in("id", ids);
        const byId = new Map((ts || []).map((t) => [t.id, t]));
        const A = byId.get(p.time_a_id);
        const B = byId.get(p.time_b_id);
        if (A) { setTimeA({ id: A.id, nome: A.nome, abrev: A.abreviacao || "", escudo_url: A.escudo_url || null }); setCorA1(A.cor1 || corA1); setCorA2(A.cor2 || corA2); setCorADetalhe(A.cor_detalhe || corADetalhe); }
        if (B) { setTimeB({ id: B.id, nome: B.nome, abrev: B.abreviacao || "", escudo_url: B.escudo_url || null }); setCorB1(B.cor1 || corB1); setCorB2(B.cor2 || corB2); setCorBDetalhe(B.cor_detalhe || corBDetalhe); }
      }

      setGolsA(p.gols_time_a ?? 0); setGolsB(p.gols_time_b ?? 0);
      setPenA(p.penaltis_time_a ?? 0); setPenB(p.penaltis_time_b ?? 0);
      setLocal(p.local || ""); setDataHora(p.data_hora ? p.data_hora.substring(0, 16) : "");

      if (p.chave_id && p.perna === 2) {
        const { data: outras } = await supabase.from("partidas").select("*").eq("chave_id", p.chave_id);
        const idaMatch = (outras || []).find((x) => x.perna === 1);
        setIda(idaMatch || null);
      } else setIda(null);

      setFase("1T"); setSegRestantes(tempoMin * 60); setRodando(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvulso, partidaId]);

  // ===== Timer =====
  useEffect(() => {
    if (!rodando) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSegRestantes((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); setRodando(false); }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [rodando]);

  // Função utilitária para mesclar cores no modo avulso
  function withColors(team, cor1, cor2, cor_detalhe) {
  return { ...team, cor1, cor2, cor_detalhe };
  }

  // ===== Helpers e regras =====
  
  const [corA1, setCorA1] = useState("#e41010");
  const [corA2, setCorA2] = useState("#101010");
  const [corADetalhe, setCorADetalhe] = useState("#FFFFFF");
  const [corB1, setCorB1] = useState("#101010");
  const [corB2, setCorB2] = useState("#FFFFFF");
  const [corBDetalhe, setCorBDetalhe] = useState("#FFFFFF");

  const [nomeLivreA, setNomeLivreA] = useState("Time A");
  const [nomeLivreB, setNomeLivreB] = useState("Time B");

  const empateJogo = () => golsA === golsB;
  const agregadoEmpatadoAoFimDo2T = () => {
    if (!isMataMata) return false;
    if (perna !== 2 || !ida) return false;
    const idaA = ida?.gols_time_a ?? 0; const idaB = ida?.gols_time_b ?? 0;
    return idaA + golsA === idaB + golsB;
  };
  const podeProrrogacaoApos2T = () => {
    if (!camp?.prorrogacao) return false;
    if (!isMataMata) return false;
    if (!perna) return empateJogo(); // jogo único
    if (perna === 1) return false;   // ida nunca
    if (perna === 2) return agregadoEmpatadoAoFimDo2T();
    return false;
  };

  //function avancarAutomaticoAposFim() { setRodando(false); encerrarPeriodo(false); }

  function resetPeriodo() {
    if (fase === "1T" || fase === "2T") setSegRestantes(durTempo * 60);
    else if (fase === "PR1" || fase === "PR2") setSegRestantes(durProrro * 60);
    setRodando(false);
  }

  function encerrarPeriodo(perguntar = true) {
    if (perguntar) {
      const ok = confirm(`Confirma encerrar ${labelFaseAmigavel(fase)}?`);
      if (!ok) return;
    }
    setRodando(false);
  }

  async function salvarVinculado(encerrar = false) {
    if (isAvulso || !partidaId) return;
    const payload = {
      gols_time_a: golsA,
      gols_time_b: golsB,
      penaltis_time_a: fase === "PEN" ? penA : null,
      penaltis_time_b: fase === "PEN" ? penB : null,
      penmiss_time_a: fase === "PEN" ? penAMiss : null,
      penmiss_time_b: fase === "PEN" ? penBMiss : null,
      local: local || null,
      data_hora: dataHora ? new Date(dataHora).toISOString() : null,
      encerrada: !!encerrar,
    };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { alert("❌ Erro ao salvar partida"); return; }
    if (encerrar) {
      setEncerrada(true);
      alert("✅ Partida encerrada e salva!");
    } else {
      alert("✅ Parciais salvas!");
    }
  }

  function labelFaseAmigavel(f) {
    switch (f) {
      case "1T": return "1º tempo";
      case "2T": return "2º tempo";
      case "PR1": return "1ª prorrogação";
      case "PR2": return "2ª prorrogação";
      case "PEN": return "pênaltis";
      default: return f || "";
    }
  }

  // ===== Ajusta fase e carrega duração (preferindo as configs do campeonato) =====
  function setFaseComDuracao(novaFase) {
    setFase(novaFase);

    const durTempoCamp  = Number(camp?.duracao_tempo_min ?? camp?.duracao_tempo) || durTempo || 45; // min
    const durProrroCamp = Number(camp?.duracao_prorrogacao_min ?? camp?.duracao_prorrogacao) || durProrro || 15; // min

    const minutos = (novaFase === "PR1" || novaFase === "PR2") ? durProrroCamp : durTempoCamp;
    const segundos = Math.max(1, Math.round(minutos * 60));
    setSegRestantes(segundos);

    // Marcar prorrogação no banco quando entrar em PR1 (se aplicável)
    if (novaFase === "PR1" && typeof supabase !== "undefined" && partidaId) {
      try {
        supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId);
      } catch (e) {
        console.warn("Falha ao marcar prorrogação:", e);
      }
    }
  } 
  // ===== Encerrar período (com desempate) =====
  function encerrarPeriodo(perguntar = true) {
    if (perguntar) {
      const ok = confirm(`Confirma encerrar ${labelFaseAmigavel(fase)}?`);
      if (!ok) return;
    }

    // 1º tempo -> 2º tempo
    if (fase === "1T") { setFaseComDuracao("2T"); return; }

    // Encerrando 2º tempo
    if (fase === "2T") {
      if (isMataMata) {
        const jogoUnico = (camp?.ida_volta === false || camp?.ida_volta === 0 || camp?.ida_volta === "false");
        const precisaDecidir = jogoUnico ? (golsA === golsB) : (perna === 2 && agregadoEmpatadoAoFimDo2T());
        if (precisaDecidir) {
          if (camp?.prorrogacao) { setFaseComDuracao("PR1"); return; }
          const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5;
          setQtdPen(penReg); setFase("PEN"); setRodando(false); return;
        }
        if (typeof salvarVinculado === "function") salvarVinculado(true); else setRodando(false);
        return;
      }
      // Avulso e outras fases
      if (empateJogo() && usaProrrogacao) { setFaseComDuracao("PR1"); return; }
      if (empateJogo() && !usaProrrogacao) { const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5; setQtdPen(penReg); setFase("PEN"); setRodando(false); return; }
      setRodando(false); return;
    }

    // PR1 -> PR2
    if (fase === "PR1") { setFaseComDuracao("PR2"); return; }

    // Fim PR2
    if (fase === "PR2") {
      if (empateJogo()) { const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5; setQtdPen(penReg); setFase("PEN"); setRodando(false); return; }
      if (isMataMata && typeof salvarVinculado === "function") { salvarVinculado(true); return; }
      setRodando(false); return;
    }
  }

  // ===== Util =====
  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  // ===== Render =====
  return (
    <div className="container" style={{ maxWidth: `calc(${COL_W} * 2 + ${GAP * 2}px)`, margin: "0 auto", padding: "0 8px" }}>
      {/* === Times + Placar === */}
      <div style={ui.boardGrid}>
        {/* Escudos */}
        <div style={ui.iconCell}>{renderTeamIcon(withColors(timeA, corA1, corA2, corADetalhe))}</div>
        <div style={ui.iconCell}>{renderTeamIcon(withColors(timeB, corB1, corB2, corBDetalhe))}</div>

        {/* Nomes */}
        <div style={{ ...ui.teamNameBar, background: corA1, color: corADetalhe, textShadow: getContrastShadow(corADetalhe) }}>{timeA.nome}</div>
        <div style={{ ...ui.teamNameBar, background: corB1, color: corBDetalhe, textShadow: getContrastShadow(corBDetalhe) }}>{timeB.nome}</div>

        {/* Faixa fina */}
        <div style={{ ...ui.teamThinBar, background: corA2 }} />
        <div style={{ ...ui.teamThinBar, background: corB2 }} />

        {/* Placar */}
        <div style={ui.scoreCell}>
          <ScoreCardA value={golsA} onDec={() => setGolsA(v => Math.max(0, v - 1))} onInc={() => setGolsA(v => v + 1)} bg={corA1} textColor={corADetalhe} textShadow={getContrastShadow(corADetalhe)} />
        </div>
        <div style={ui.scoreCell}>
          <ScoreCardB value={golsB} onDec={() => setGolsB(v => Math.max(0, v - 1))} onInc={() => setGolsB(v => v + 1)} bg={corB1} textColor={corBDetalhe} textShadow={getContrastShadow(corBDetalhe)} />
        </div>
      </div>

      {/* Faixa e cronômetro */}
      {/* Logo acima da faixa do cronometro */}
      <div style={{ marginTop: -60}}>
        <img src={logo} alt="AureoArtes" style={ui.logoBelowImg} />
      </div>
      <div style={ui.orangeLineWide} />
      <div style={ui.timerTrapWide}><div style={ui.timerText}>{fmt(segRestantes)}</div></div>

      {/* Seção Período */}
      <div className="card" style={{ padding: 16, marginTop: 12, textAlign: "center" }}>
        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 22, color: "#ff7a00" }}>{labelFaseAmigavel(fase)}</div>
        <div className="row" style={{ gap: 8, justifyContent: "center" }}>
          <button className="btn btn--primary" disabled={rodando || encerrada} onClick={() => setRodando(true)}>Iniciar</button>
          <button className="btn btn--muted" disabled={!rodando || encerrada} onClick={() => setRodando(false)}>Pausar</button>
          <button className="btn btn--muted" disabled={encerrada} onClick={resetPeriodo}>Reiniciar período</button>
          <button className="btn btn--muted" disabled={encerrada} onClick={() => encerrarPeriodo(true)}>Encerrar período</button>
        </div>
      </div>

      {/* Seção Pênaltis */}
      {fase === "PEN" && (
        <div className="card" style={{ padding: 16, marginTop: 12, textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 22, color: "#ff7a00" }}>
            Pênaltis - Cobranças regulares {qtdPen}
          </div>
          <div className="row" style={{ justifyContent: "space-around", marginTop: 12 }}>
            <div>
              <div>{timeA.nome}</div>
              <div>✅ {penA} &nbsp;&nbsp; ❌ {penAMiss}</div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button onClick={() => setPenA(p => p + 1)} disabled={encerrada}>✅</button>
                <button onClick={() => setPenAMiss(p => p + 1)} disabled={encerrada}>❌</button>
              </div>
            </div>
            <div>
              <div>{timeB.nome}</div>
              <div>✅ {penB} &nbsp;&nbsp; ❌ {penBMiss}</div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button onClick={() => setPenB(p => p + 1)} disabled={encerrada}>✅</button>
                <button onClick={() => setPenBMiss(p => p + 1)} disabled={encerrada}>❌</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção Local/DataHora + Controles */}
      <div className="card" style={{ padding: 16, marginTop: 20 }}>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <input type="text" className="input" placeholder="Local" value={local} onChange={e => setLocal(e.target.value)} />
          <input type="datetime-local" className="input" value={dataHora} onChange={e => setDataHora(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 12, justifyContent: "center" }}>
          <button className="btn btn--danger" onClick={() => window.location.reload()}>Reiniciar Partida</button>
          <button className="btn btn--danger" onClick={() => salvarVinculado(true)}>Encerrar Partida</button>
          <button className="btn btn--muted" onClick={() => navigate(-1)}>Voltar</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Blocos/Componentes ===== */

function renderTeamIcon(team) {
  const shadow = getContrastShadow(team.cor_detalhe);
  const sigla = (team.abrev || "").toUpperCase();
  return team?.escudo_url ? (
    <img src={team.escudo_url} alt={team.nome} width={ICON_SIZE} height={ICON_SIZE} style={{ objectFit: "contain" }} />
  ) : (
    <div style={{ position: "relative", width: ICON_SIZE, height: ICON_SIZE }}>
      <TeamIcon team={{ cor1: team.cor1, cor2: team.cor2, cor_detalhe: team.cor_detalhe }} size={ICON_SIZE} title={team.nome} />
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 900,
          color: team.cor_detalhe,
          textShadow: shadow,
          pointerEvents: "none",
        }}
      >
        {sigla}
      </span>
    </div>
  );
}

function TeamBlock({ team }) {
  const shadow = getContrastShadow(team.cor_detalhe);
  const sigla = (team.abrev || "").toUpperCase();

  const icon =
    team?.escudo_url ? (
      <img src={team.escudo_url} alt={team.nome} width={ICON_SIZE} height={ICON_SIZE} style={{ objectFit: "contain" }} />
    ) : (
      <div style={{ position: "relative", width: ICON_SIZE, height: ICON_SIZE }}>
        <TeamIcon team={team} size={ICON_SIZE} title={team.nome} />
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            fontWeight: 900,
            color: team.cor_detalhe,
            textShadow: shadow,
            pointerEvents: "none",
          }}
        >
          {sigla}
        </span>
      </div>
    );

  return (
    <div style={{ width: COL_W, display: "grid", justifyItems: "center" }}>
      {/* SLOT de altura fixa garante que o nome de A e B fique na MESMA linha */}
      <div
        style={{
          height: ICON_WRAP_H,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          marginBottom: -10, // leve sobreposição no retângulo do nome
        }}
      >
        {icon}
      </div>

      <div style={{ ...ui.teamNameBar, width: COL_W, background: team.cor1, color: team.cor_detalhe }}>
        {team.nome}
      </div>
      <div style={{ ...ui.teamThinBar, width: COL_W, background: team.cor2 }} />
    </div>
  );
}

/* ===== ScoreCard (polígono 4 faces conforme especificação) ===== */
function ScoreCardPoly({ value, onDec, onInc, bg, textColor, textShadow, side = "A" }) {
  // 4 faces:
  //  A (time esquerdo): topo 100%, esquerda 90°, base 90% (alinhada à esquerda), direita diagonal
  //  B (time direito): topo 100%, direita 90°, base 90% (alinhada à direita), esquerda diagonal
  const clip = side === "A"
    ? "polygon(0 0, 100% 0, 90% 100%, 0 100%)"     // TL→TR→BR(90%)→BL
    : "polygon(0 0, 100% 0, 100% 100%, 10% 100%)"; // TL→TR→BR(100%)→BL(10%)

  return (
    <div style={ui.scoreShell}>
      <div style={{ ...ui.scoreBox, background: bg, clipPath: clip }}>
        <div style={{ ...ui.scoreValue, color: textColor, textShadow }}>{value}</div>
        <div style={ui.scoreBtnsWrap}>
          <button className="btn btn--muted" onClick={onDec}>-1</button>
          <button className="btn btn--primary" onClick={onInc}>+1</button>
        </div>
      </div>
    </div>
  );
}

// Atalhos para usar no render:
const ScoreCardA = (props) => <ScoreCardPoly side="A" {...props} />;
const ScoreCardB = (props) => <ScoreCardPoly side="B" {...props} />;

function PenaltyBox({ label, value, setValue, qtd }) {
  return (
    <div style={{ textAlign: "center", minWidth: 140 }}>
      <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
      <div className="row" style={{ justifyContent: "center", gap: 6, marginTop: 6 }}>
        <button className="btn btn--muted" onClick={() => setValue((v) => Math.max(0, v - 1))}>-1</button>
        <button className="btn btn--primary" onClick={() => setValue((v) => v + 1)}>{value < qtd ? "+1" : "+1 (alternada)"}</button>
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ height: 40, padding: 2 }} />
    </div>
  );
}

function abreviar(nome = "") {
  const t = nome.trim();
  if (!t) return "";
  const semPreps = t
    .split(/\s+/)
    .filter((p) => !["de", "da", "do", "das", "dos"].includes(p.toLowerCase()));
  const iniciais = semPreps.map((p) => p[0]?.toUpperCase()).join("");
  return (iniciais || t.slice(0, 3)).slice(0, 3);
}

/* ===== Styles ===== */

// largura responsiva: mínimo 260px, cresce até 42% da viewport, máximo 360px
const COL_W   = "clamp(140px, 42vw, 360px)"; // largura de cada coluna
const GAP     = 16;                           // espaçamento horizontal entre colunas (px)
const TIMER_W = 260;                          // largura fixa do cronômetro (px)
const ICON_SIZE = 140;
const ICON_WRAP_H = ICON_SIZE + 20; // altura fixa do “slot” do escudo

const ui = {
  headerWrap: { margin: "8px 0 0" },
  headerBar: {
    background: "#ff7a00",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    padding: "8px 12px",
    boxShadow: "0 6px 14px rgba(255,122,0,.25), inset 0 1px 0 rgba(255,255,255,.15)",
  },
  headerLeft: { width: 40, display: "flex", alignItems: "center", justifyContent: "flex-start" },
  headerTitle: { fontWeight: 800, fontSize: 18, textAlign: "center", flex: 1 },
  logoImg: { width: 28, height: 28, objectFit: "contain" },

  teamsRow: {
    display: "grid",
    gridTemplateColumns: `repeat(2, ${COL_W})`,
    justifyItems: "center",   // centraliza cada coluna
    alignItems: "start",
    columnGap: 24,
    marginTop: 8,
  },

  boardGrid: {
    display: "grid",
    gridTemplateColumns: `repeat(2, ${COL_W})`,
    gridTemplateRows: "160px auto 6px auto",
    justifyContent: "center",
    alignItems: "end",
    columnGap: 28,
    rowGap: 0,
    margin: "8px auto 16px",
    width: "100%",
    maxWidth: `calc(${COL_W} * 2 + 28px)`, // opcional, combina com o container
  },

  // célula do escudo
  iconCell: {
    display: "flex",
    alignItems: "end",
    justifyContent: "center",
  },

  // nome e thinbar SEMPRE com 100% da coluna e com padding “dentro”
  teamNameBar: {
    width: "100%",
    boxSizing: "border-box",
    fontWeight: 900,
    fontSize: 20,
    padding: "10px 14px",
    borderRadius: "14px 14px 0 0",
    textAlign: "center",
    margin: 0,
  },
  teamThinBar: {
    width: "100%",
    height: 6,
    borderRadius: 0,
    margin: 0,
  },

  // célula do placar com largura fixa da coluna
  scoreCell: {
    width: COL_W,                 // <- trava a célula
    display: "block",
  },

  scoreShell:  { width: "100%" },
  
  scoresRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    justifyItems: "center",   // centraliza cada placar
    columnGap: 24,
    margin: "0 auto 16px",
    width: "100%",
    maxWidth: 900,
  },

  // PLACAR com largura fixa da célula, independentemente do conteúdo
  scoreBox: {
    width: "100%",
    minWidth: "100%",
    maxWidth: "100%",             // <- impede aumentar
    boxSizing: "border-box",      // <- padding conta “dentro”
    color: "#fff",
    borderRadius: "0 0 14px 14px",
    padding: "12px 14px",
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 8px 18px rgba(0,0,0,.20)",
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.08))",
  },

  // números com tabular-nums (cada dígito ocupa a mesma largura)
  scoreValue: {
    fontSize: 120,
    lineHeight: 1,
    fontWeight: 900,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum"',
  },

  scoreBtnsWrap: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 },

  logoBelowImg: { height: 58, display: "block", margin: "0 auto 0" }, // um pouco maior e centralizada

  orangeLineWide: {
    height: 8,
    background: "#ff7a00",
    margin: 0,
    marginTop: 0,             // espaço do fundo do placar para a faixa laranja
  },

  timerTrapWide: {
    display: "block",
    width: TIMER_W,
    margin: "0 auto",
    background: "#ff7a00",
    color: "#fff",
    padding: "10px 0",
    clipPath: "polygon(8% 0, 92% 0, 80% 100%, 20% 100%)",
    boxShadow: "0 6px 14px rgba(255,122,0,.28)",
    textAlign: "center",
  },

  timerText: { fontSize: 44, fontWeight: 900, textAlign: "center" },
};
