// src/pages/Placar.jsx (mobile-vertical • estética v4 • TeamIcon + sigla • regras mata-mata)
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

  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");

  // Mata‑mata
  const [isMataMata, setIsMataMata] = useState(false);
  const [perna, setPerna] = useState(null); // 1 | 2 | null (jogo único)
  const [chaveId, setChaveId] = useState(null);
  const [etapa, setEtapa] = useState(null); // grupos | pontos_corridos | eliminatoria
  const [ida, setIda] = useState(null); // partida de ida (quando estamos na volta)

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
        if (s <= 1) { clearInterval(intervalRef.current); if (!isAvulso) avancarAutomaticoAposFim(); }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [rodando]);

  // ===== Helpers e regras =====
  function setFaseComDuracao(f) {
    setFase(f);
    if (f === "1T" || f === "2T") setSegRestantes(durTempo * 60);
    else if (f === "PR1" || f === "PR2") setSegRestantes(durProrro * 60);
    else if (f === "PEN") setSegRestantes(0);
    setRodando(false);
  }
  const labelFase = (f) => ({ "1T": "1º Tempo", "2T": "2º Tempo", PR1: "Prorrogação — 1º Tempo", PR2: "Prorrogação — 2º Tempo", PEN: "Pênaltis" }[f] || f);
  const labelBotaoEncerrar = () => ({ "1T": "Encerrar 1º tempo", "2T": "Encerrar 2º tempo", PR1: "Encerrar PR1", PR2: "Encerrar PR2" }[fase] || "Encerrar período");

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

  function avancarAutomaticoAposFim() { setRodando(false); encerrarPeriodo(false); }

  function resetPeriodo() {
    if (fase === "1T" || fase === "2T") setSegRestantes(durTempo * 60);
    else if (fase === "PR1" || fase === "PR2") setSegRestantes(durProrro * 60);
    setRodando(false);
  }

  async function salvarVinculado(encerrar = false) {
    if (isAvulso || !partida) return;
    const payload = {
      gols_time_a: golsA,
      gols_time_b: golsB,
      prorrogacao: usaProrrogacao && (fase === "PR1" || fase === "PR2" || (fase === "2T" && podeProrrogacaoApos2T())),
      penaltis_time_a: fase === "PEN" ? penA : null,
      penaltis_time_b: fase === "PEN" ? penB : null,
      local: local || null,
      data_hora: dataHora ? new Date(dataHora).toISOString() : null,
      encerrada: !!encerrar,
    };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partida.id);
    if (error) { alert("❌ Erro ao salvar partida"); return; }
    if (encerrar) { alert("✅ Partida encerrada e salva!"); navigate(`/campeonatos/${partida.campeonato_id}/partidas`); }
    else { alert("✅ Parciais salvas!"); }
  }

  function encerrarPeriodo(perguntar = true) {
    if (perguntar) { const ok = confirm(`Confirma encerrar ${labelFase(fase)}?`); if (!ok) return; }
    if (fase === "1T") { setFaseComDuracao("2T"); return; }
    if (fase === "2T") {
      if (isMataMata) {
        if (podeProrrogacaoApos2T()) { setFaseComDuracao("PR1"); return; }
        if (!camp?.prorrogacao) {
          const jogoUnicoEmpatado = !perna && empateJogo();
          const voltaAgregadoEmpatado = perna === 2 && agregadoEmpatadoAoFimDo2T();
          if (jogoUnicoEmpatado || voltaAgregadoEmpatado) { setFase("PEN"); return; }
        }
        salvarVinculado(true); return;
      }
      // pontos corridos/grupos → encerra automaticamente
      salvarVinculado(true); return;
    }
    if (fase === "PR1") { setFaseComDuracao("PR2"); return; }
    if (fase === "PR2") {
      if (empateJogo()) { setFase("PEN"); return; }
      salvarVinculado(true); return;
    }
  }

  // ===== Render =====
  const fmtRelogio = (sec) => `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
  const nomeA = isAvulso ? nomeLivreA : timeA.nome;
  const nomeB = isAvulso ? nomeLivreB : timeB.nome;
  const siglaA = (timeA.abrev || abreviar(nomeA)).toUpperCase();
  const siglaB = (timeB.abrev || abreviar(nomeB)).toUpperCase();
  const scoreShadowA = getContrastShadow(corADetalhe);
  const scoreShadowB = getContrastShadow(corBDetalhe);

  return (
    <div className="container" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header: largura total, fundo laranja, logo à esquerda */}
      <div style={ui.headerWrap}>
        <div style={ui.headerBar}>
          <div style={ui.headerLeft}>
            <img src={logo} alt="AureoArtes" style={ui.logoImg} />
          </div>
          <div style={ui.headerTitle}>{isAvulso ? "Amistoso" : (camp ? camp.nome : "")}</div>
          <div style={{ width: 40 }} />
        </div>
      </div>

      {/* Times: escudo centralizado + barras do nome com mesma largura do placar */}
      <div style={ui.teamsRow}>
        <TeamBlock team={{ nome: nomeA, sigla: siglaA, cor1: corA1, cor2: corA2, cor_detalhe: corADetalhe, escudo_url: timeA.escudo_url }} />
        <div style={{ width: 12 }} />
        <TeamBlock team={{ nome: nomeB, sigla: siglaB, cor1: corB1, cor2: corB2, cor_detalhe: corBDetalhe, escudo_url: timeB.escudo_url }} />
      </div>

      {/* Placar com topo reto e base arredondada; inclinação oposta por lado */}
      <div style={ui.scoresRow}>
        <ScoreCardA
          value={golsA}
          onDec={() => setGolsA((v) => Math.max(0, v - 1))}
          onInc={() => setGolsA((v) => v + 1)}
          bg={corA1}
          textColor={corADetalhe}
          textShadow={getContrastShadow(corADetalhe)}
        />

        <ScoreCardB
          value={golsB}
          onDec={() => setGolsB((v) => Math.max(0, v - 1))}
          onInc={() => setGolsB((v) => v + 1)}
          bg={corB1}
          textColor={corBDetalhe}
          textShadow={getContrastShadow(corBDetalhe)}
        />
      </div>

      {/* Logo abaixo do placar, centralizada e encostada na barra laranja */}
      <div style={{ textAlign: "center", marginTop: -70 }}>
        <img src={logo} alt="AureoArtes" style={ui.logoBelowImg} />
        <div style={ui.orangeLineWide} />
        <div style={ui.timerTrapWide}>
          <div style={ui.timerText}>{fmtRelogio(segRestantes)}</div>
        </div>
      </div>

      {/* Fase + controles */}
      {/* Controles do período centralizados em uma nova seção */}
      <div className="card" style={{ padding: 14, marginTop: 12, textAlign: "center" }}>
        {!isAvulso ? (
          <div className="badge" style={{ margin: "0 auto 10px" }}>{labelFase(fase)}</div>
        ) : (
          <select
            className="select"
            value={fase}
            onChange={(e) => setFaseComDuracao(e.target.value)}
            style={{ margin: "0 auto 10px" }}
          >
            <option value="1T">1º Tempo</option>
            <option value="2T">2º Tempo</option>
            {usaProrrogacao && <option value="PR1">Prorrogação 1</option>}
            {usaProrrogacao && <option value="PR2">Prorrogação 2</option>}
            <option value="PEN">Pênaltis</option>
          </select>
        )}

        <div className="row" style={{ gap: 8, justifyContent: "center" }}>
          {!rodando ? (
            <button className="btn btn--primary" onClick={() => setRodando(true)}>Iniciar</button>
          ) : (
            <button className="btn btn--muted" onClick={() => setRodando(false)}>Pausar</button>
          )}

          {!isAvulso ? (
            <button className="btn btn--muted" onClick={() => encerrarPeriodo(true)}>
              {labelBotaoEncerrar()}
            </button>
          ) : (
            <button className="btn btn--muted" onClick={resetPeriodo}>Reiniciar período</button>
          )}
        </div>
      </div>

      {/* Pênaltis */}
      {fase === "PEN" && (
        <div className="card" style={{ padding: 14, marginTop: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <PenaltyBox label="Pênaltis A" value={penA} setValue={setPenA} qtd={qtdPen} />
            <div className="badge">{qtdPen} regulares</div>
            <PenaltyBox label="Pênaltis B" value={penB} setValue={setPenB} qtd={qtdPen} />
          </div>
        </div>
      )}

      {/* Meta / salvar */}
      <div className="card" style={{ padding: 14, marginTop: 8 }}>
        {!isAvulso ? (
          <div className="grid grid-2">
            <div className="field"><label className="label">Local</label><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} /></div>
            <div className="field"><label className="label">Data e Hora</label><input className="input" type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} /></div>
          </div>
        ) : (
          <div className="grid grid-4" style={{ marginBottom: 8 }}>
            <ColorInput label="A cor1" value={corA1} onChange={setCorA1} />
            <ColorInput label="A cor2" value={corA2} onChange={setCorA2} />
            <ColorInput label="A detalhe" value={corADetalhe} onChange={setCorADetalhe} />
            <div />
            <ColorInput label="B cor1" value={corB1} onChange={setCorB1} />
            <ColorInput label="B cor2" value={corB2} onChange={setCorB2} />
            <ColorInput label="B detalhe" value={corBDetalhe} onChange={setCorBDetalhe} />
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          {!isAvulso ? (
            <>
              <button className="btn btn--orange" onClick={() => salvarVinculado(false)}>Salvar parciais</button>
              <button className="btn btn--red" onClick={() => salvarVinculado(true)}>Encerrar partida</button>
            </>
          ) : (
            <button className="btn btn--orange" onClick={() => { setGolsA(0); setGolsB(0); setPenA(0); setPenB(0); setFaseComDuracao("1T"); }}>Limpar</button>
          )}

          {!isAvulso && partida && (
            <Link to={`/campeonatos/${partida.campeonato_id}/partidas`} className="btn btn--muted">Voltar</Link>
          )}
          {isAvulso && <Link to="/" className="btn btn--muted">Início</Link>}
        </div>
      </div>
    </div>
  );
}

/* ===== Blocos/Componentes ===== */

function TeamBlock({ team }) {
  const shadow = getContrastShadow(team.cor_detalhe);
  const sigla = (team.abrev || team.nome?.substring(0, 3) || "").toUpperCase();

  const icon = team?.escudo_url ? (
    <img
      src={team.escudo_url}
      alt={team.nome}
      width={140}
      height={140}
      style={{ objectFit: "contain" }}
    />
  ) : (
    <div style={{ position: "relative", display: "inline-block" }}>
      <TeamIcon team={team} size={140} title={team.nome} />
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
    <div style={{ flex: 1, textAlign: "center" }}>
      {/* Aproxima o escudo do nome e permite uma leve sobreposição */}
      <div style={{ marginBottom: -10 }}>{icon}</div>

      {/* Nome com altura maior e “subindo” para sobrepor um pouco */}
      <div
        style={{
          ...ui.teamNameBar,
          background: team.cor1,
          color: team.cor_detalhe,
        }}
      >
        {team.nome}
      </div>
      <div style={{ ...ui.teamThinBar, background: team.cor2 }} />
    </div>
  );
}

function ScoreCardA({ value, onDec, onInc, bg, textColor, textShadow }) {
  const clip = "polygon(8% 0, 100% 0, 90% 100%, 8% 100%)"; // topo > base
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

function ScoreCardB({ value, onDec, onInc, bg, textColor, textShadow }) {
  const clip = "polygon(8% 0, 100% 0, 100% 100%, 18% 100%)"; // topo > base
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

  teamsRow: { marginTop: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
 
  teamNameBar: {
    marginTop: -10,            // “sobe” o retângulo para sobrepor um pouco o escudo
    fontWeight: 900,
    fontSize: 20,
    padding: "10px 14px",      // altura maior do retângulo do nome
    borderRadius: "18px 18px 0 0",
    width: "92%",
    textAlign: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  teamThinBar: {
    height: 6,
    width: "92%",
    borderRadius: 0,
    marginLeft: "auto",
    marginRight: "auto",
  },
  
  scoresRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "stretch", marginTop: 0, marginBottom: 16 },
  scoreBox: {
    width: "95%",
    color: "#fff",
    borderRadius: "0 0 14px 14px",
    padding: 16,
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 8px 18px rgba(0,0,0,.20)",
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.08))",
    },
    
  scoreValue:  { fontSize: 120, lineHeight: 1, fontWeight: 900, textAlign: "center" },

  scoreBtnsWrap: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 },

  logoBelowImg: { height: 64, display: "block", margin: "0 auto 0" }, // um pouco maior e centralizada

  orangeLineWide: {
    height: 8,
    background: "#ff7a00",
    margin: 0,
    marginTop: 0,             // espaço do fundo do placar para a faixa laranja
  },

  timerTrapWide: {
    display: "inline-block",
    margin: "0 auto",
    background: "#ff7a00",
    color: "#fff",
    padding: "10px 64px",      // ↑ mais largo
    clipPath: "polygon(8% 0, 92% 0, 80% 100%, 20% 100%)",
    boxShadow: "0 6px 14px rgba(255,122,0,.28)",
  },

  timerText: { fontSize: 44, fontWeight: 900 },
};
