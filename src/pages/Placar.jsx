// src/pages/Placar.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";

// ⚠️ Mantive toda a lógica do arquivo original e reorganizei o layout
// para um visual focado em **mobile vertical** (como no mock enviado).
// Em telas pequenas: emblemas grandes, placares gigantes, botões -1/+1,
// cronômetro no centro com faixa, seletor de período e controles.
// Em telas médias/desktop o layout continua funcional (empilha bem).

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function Placar() {
  const { partidaId } = useParams();
  const navigate = useNavigate();

  const isAvulso = !partidaId;

  // Dados carregados (modo vinculado)
  const [partida, setPartida] = useState(null);
  const [camp, setCamp] = useState(null);
  const [timeA, setTimeA] = useState({ id: null, nome: "Time A", abrev: "" });
  const [timeB, setTimeB] = useState({ id: null, nome: "Time B", abrev: "" });

  // Placar
  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);

  // Fases: 1T -> 2T -> (PR1 -> PR2) -> PEN
  const [fase, setFase] = useState("1T"); // "1T" | "2T" | "PR1" | "PR2" | "PEN"
  const [segRestantes, setSegRestantes] = useState(0);
  const [rodando, setRodando] = useState(false);

  // Configurações do campeonato
  const [usaProrrogacao, setUsaProrrogacao] = useState(false);
  const [durTempo, setDurTempo] = useState(10); // min
  const [durProrro, setDurProrro] = useState(5); // min
  const [qtdPen, setQtdPen] = useState(5); // 1..5

  // Pênaltis
  const [penA, setPenA] = useState(0);
  const [penB, setPenB] = useState(0);

  // Meta (modo vinculado)
  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");

  // Avulso: nomes livres
  const [nomeLivreA, setNomeLivreA] = useState("Time A");
  const [nomeLivreB, setNomeLivreB] = useState("Time B");

  // Avulso: cores básicas dos escudos (para aproximar o mock)
  const [corA1, setCorA1] = useState("#e41010");
  const [corA2, setCorA2] = useState("#101010");
  const [corB1, setCorB1] = useState("#101010");
  const [corB2, setCorB2] = useState("#ffffff");

  // Metadados para regra de mata-mata
  const [isMataMata, setIsMataMata] = useState(false);
  const [perna, setPerna] = useState(null); // 1 | 2 | null
  const [chaveId, setChaveId] = useState(null);
  const [etapa, setEtapa] = useState(null); // "pontos_corridos" | "grupos" | "oitavas" | ...

  // Outra perna (para agregado)
  const [ida, setIda] = useState(null);

  const intervalRef = useRef(null);

  // ==== Carregamento inicial ====
  useEffect(() => {
    if (isAvulso) {
      setDurTempo(10);
      setUsaProrrogacao(false);
      setDurProrro(5);
      setQtdPen(5);
      setFase("1T");
      setSegRestantes(10 * 60);
      setRodando(false);
      return;
    }
    (async () => {
      const { data: p } = await supabase
        .from("partidas")
        .select("*")
        .eq("id", partidaId)
        .single();
      if (!p) return;

      setPartida(p);

      const { data: c } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("id", p.campeonato_id)
        .single();
      setCamp(c || null);

      const tempoMin = c?.duracao_tempo ?? 10;
      const pr = !!c?.prorrogacao;
      const prMin = c?.duracao_prorrogacao ?? 5;
      const qpen = c?.qtd_penaltis ?? 5;

      setDurTempo(tempoMin);
      setUsaProrrogacao(pr);
      setDurProrro(pr ? prMin : 5);
      setQtdPen(qpen);

      // metadados de mata-mata
      setIsMataMata(!!p.is_mata_mata);
      setPerna(p.perna ?? null);
      setChaveId(p.chave_id ?? null);
      setEtapa(p.etapa || null);

      // times
      const ids = [p.time_a_id, p.time_b_id].filter(Boolean);
      if (ids.length) {
        const { data: ts } = await supabase
          .from("times")
          .select("id, nome, abreviacao")
          .in("id", ids);
        const byId = new Map((ts || []).map((t) => [t.id, t]));
        const A = byId.get(p.time_a_id);
        const B = byId.get(p.time_b_id);
        if (A) setTimeA({ id: A.id, nome: A.nome, abrev: A.abreviacao || "" });
        if (B) setTimeB({ id: B.id, nome: B.nome, abrev: B.abreviacao || "" });
      }

      // placar existente
      setGolsA(p.gols_time_a ?? 0);
      setGolsB(p.gols_time_b ?? 0);
      setPenA(p.penaltis_time_a ?? 0);
      setPenB(p.penaltis_time_b ?? 0);
      setLocal(p.local || "");
      setDataHora(p.data_hora ? p.data_hora.substring(0, 16) : "");

      // Se for volta, buscar ida para agregado
      if (p.chave_id && p.perna === 2) {
        const { data: outras } = await supabase
          .from("partidas")
          .select("*")
          .eq("chave_id", p.chave_id);
        const idaMatch = (outras || []).find((x) => x.perna === 1);
        setIda(idaMatch || null);
      } else {
        setIda(null);
      }

      // Inicia SEMPRE em 1T e cronômetro do tempo regulamentar
      setFase("1T");
      setSegRestantes(tempoMin * 60);
      setRodando(false);
    })();
  }, [isAvulso, partidaId]);

  // ==== Timer ====
  useEffect(() => {
    if (!rodando) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSegRestantes((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          // Avança automaticamente quando zera (modo campeonato)
          if (!isAvulso) {
            avancarAutomaticoAposFim();
          }
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [rodando]);

  // ==== Helpers de fase e regras ====
  function setFaseComDuracao(f) {
    setFase(f);
    if (f === "1T" || f === "2T") setSegRestantes(durTempo * 60);
    else if (f === "PR1" || f === "PR2")
      setSegRestantes((usaProrrogacao ? durProrro : durTempo) * 60);
    else if (f === "PEN") setSegRestantes(0); // sem cronômetro
    setRodando(false);
  }

  function labelFase(f) {
    if (f === "1T") return "1º Tempo";
    if (f === "2T") return "2º Tempo";
    if (f === "PR1") return "Prorrogação — 1º Tempo";
    if (f === "PR2") return "Prorrogação — 2º Tempo";
    if (f === "PEN") return "Pênaltis";
    return f;
  }

  function labelBotaoEncerrar() {
    if (fase === "1T") return "Encerrar 1º tempo";
    if (fase === "2T") return "Encerrar 2º tempo";
    if (fase === "PR1") return "Encerrar PR1";
    if (fase === "PR2") return "Encerrar PR2";
    return "Encerrar período";
  }

  // Regras
  function isFaseDeGrupos() {
    return etapa === "grupos";
  }
  function isPontosCorridos() {
    return etapa === "pontos_corridos";
  }
  function isEliminatoria() {
    return isMataMata === true;
  }
  function empateJogo() {
    return golsA === golsB;
  }
  // agregado (só sentido na VOLTA com ida conhecida)
  function agregadoEmpatadoAoFimDo2T() {
    if (!isEliminatoria()) return false;
    if (perna !== 2 || !ida) return false;
    const idaA = ida?.gols_time_a ?? 0;
    const idaB = ida?.gols_time_b ?? 0;
    const voltaA = golsA;
    const voltaB = golsB;
    return idaA + voltaA === idaB + voltaB;
  }
  // pode prorrogar ao fim do 2º tempo?
  function podeProrrogacaoApos2T() {
    if (!camp?.prorrogacao) return false;
    if (isPontosCorridos() || isFaseDeGrupos()) return false; // nunca
    if (!isEliminatoria()) return false;

    // jogo único:
    if (!perna) return empateJogo();

    // ida:
    if (perna === 1) return false;

    // volta:
    if (perna === 2) return agregadoEmpatadoAoFimDo2T();

    return false;
  }

  // Avanço automático quando cronômetro zera (modo vinculado)
  function avancarAutomaticoAposFim() {
    setRodando(false);
    encerrarPeriodo(false);
  }

  // Encerrar período (manual ou automático)
  function encerrarPeriodo(perguntar = true) {
    if (perguntar) {
      const ok = confirm(`Confirma encerrar ${labelFase(fase)}?`);
      if (!ok) return;
    }

    if (fase === "1T") {
      setFaseComDuracao("2T");
      return;
    }

    if (fase === "2T") {
      // Regras especiais ao fim do 2º tempo
      if (podeProrrogacaoApos2T()) {
        setFaseComDuracao("PR1");
        return;
      }

      if (isEliminatoria()) {
        // Eliminatória SEM prorrogação habilitada:
        if (!camp?.prorrogacao) {
          const jogoUnicoEmpatado = !perna && empateJogo();
          const voltaAgregadoEmpatado = perna === 2 && agregadoEmpatadoAoFimDo2T();
          if (jogoUnicoEmpatado || voltaAgregadoEmpatado) {
            setFase("PEN");
            return;
          }
        }
        // Caso contrário, se há vencedor (no tempo) ou agregado resolvido:
        alert("Tempo regulamentar encerrado. Você pode encerrar a partida.");
        return;
      }

      // Pontos corridos / fase de grupos: encerra (empate permitido)
      alert("Tempo regulamentar encerrado. Você pode encerrar a partida.");
      return;
    }

    if (fase === "PR1") {
      setFaseComDuracao("PR2");
      return;
    }

    if (fase === "PR2") {
      // Se ainda empatado → pênaltis; senão encerrar
      if (empateJogo()) {
        setFase("PEN");
      } else {
        alert("Prorrogação encerrada. Você pode encerrar a partida.");
      }
      return;
    }
  }

  async function salvarVinculado(encerrar = false) {
    if (isAvulso || !partida) return;
    const payload = {
      gols_time_a: golsA,
      gols_time_b: golsB,
      prorrogacao:
        usaProrrogacao &&
        (fase === "PR1" || fase === "PR2" || (fase === "2T" && podeProrrogacaoApos2T())),
      penaltis_time_a: fase === "PEN" ? penA : null,
      penaltis_time_b: fase === "PEN" ? penB : null,
      local: local || null,
      data_hora: dataHora ? new Date(dataHora).toISOString() : null,
      encerrada: !!encerrar,
    };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partida.id);
    if (error) {
      alert("❌ Erro ao salvar partida");
      return;
    }
    if (encerrar) {
      alert("✅ Partida encerrada e salva!");
      navigate(`/campeonatos/${partida.campeonato_id}/partidas`);
    } else {
      alert("✅ Parciais salvas!");
    }
  }

  function resetPeriodo() {
    if (fase === "1T" || fase === "2T") setSegRestantes(durTempo * 60);
    else if (fase === "PR1" || fase === "PR2")
      setSegRestantes((usaProrrogacao ? durProrro : durTempo) * 60);
    setRodando(false);
  }

  const titulo = isAvulso ? "Placar Eletrônico (Avulso)" : "Placar Eletrônico";
  function fmtRelogio(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const abreA = isAvulso ? abreviar(nomeLivreA) : timeA.abrev || abreviar(timeA.nome);
  const abreB = isAvulso ? abreviar(nomeLivreB) : timeB.abrev || abreviar(timeB.nome);

  // === UI ===
  return (
    <div className="container" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* BARRA/LIGA superior (estilo faixa) */}
      <div style={s.faixaTop}> 
        <div style={s.faixaTopInner}>{!isAvulso && camp ? camp.nome : "AureoArtes League"}</div>
      </div>

      {/* Nomes/Abreviações e Escudos (circulares com meia/diagonal) */}
      <div style={s.escudosLinha}>
        <TeamBadge abrev={abreA} c1={corA1} c2={corA2} side="left" />
        <TeamBadge abrev={abreB} c1={corB1} c2={corB2} side="right" />
      </div>

      <div style={s.tagsLinha}>
        <div style={s.tagNomeLeft}>{abreA}</div>
        <div style={{ flex: 1 }} />
        <div style={s.tagNomeRight}>{abreB}</div>
      </div>

      {/* Placar numérico e botões */}
      <div style={s.placaresLinha}>
        <ScoreBig
          value={golsA}
          onDec={() => setGolsA((v) => Math.max(0, v - 1))}
          onInc={() => setGolsA((v) => v + 1)}
          bg={corA1}
        />
        <ScoreBig
          value={golsB}
          onDec={() => setGolsB((v) => Math.max(0, v - 1))}
          onInc={() => setGolsB((v) => v + 1)}
          bg={corB1}
          right
        />
      </div>

      {/* Cronômetro central com faixa */}
      {fase !== "PEN" && (
        <div style={s.timerFaixaWrap}>
          <div style={s.timerFaixa}>
            <div style={s.timerText}>{fmtRelogio(segRestantes)}</div>
          </div>
        </div>
      )}

      {/* Fase + controles */}
      <div style={{ padding: 12 }}>
        <div className="field" style={{ marginTop: 6 }}>
          <label className="label">Período</label>
          {!isAvulso ? (
            <div className="badge">{labelFase(fase)}</div>
          ) : (
            <select className="select" value={fase} onChange={(e) => setFaseComDuracao(e.target.value)}>
              <option value="1T">1º Tempo</option>
              <option value="2T">2º Tempo</option>
              {usaProrrogacao && <option value="PR1">Prorrogação 1</option>}
              {usaProrrogacao && <option value="PR2">Prorrogação 2</option>}
              <option value="PEN">Pênaltis</option>
            </select>
          )}
        </div>

        {fase !== "PEN" && (
          <div className="row" style={{ gap: 8, marginTop: 10, justifyContent: "flex-start" }}>
            {!rodando ? (
              <button className="btn btn--primary" onClick={() => setRodando(true)}>Iniciar</button>
            ) : (
              <button className="btn btn--muted" onClick={() => setRodando(false)}>Pausar</button>
            )}
            {!isAvulso ? (
              <button className="btn btn--muted" onClick={() => encerrarPeriodo(true)}>{labelBotaoEncerrar()}</button>
            ) : (
              <button className="btn btn--muted" onClick={resetPeriodo}>Reiniciar período</button>
            )}
          </div>
        )}
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

      {/* Config / meta */}
      <div className="card" style={{ padding: 14, marginTop: 8 }}>
        {isAvulso ? (
          <>
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Time A</label>
                <input className="input" value={nomeLivreA} onChange={(e) => setNomeLivreA(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Time B</label>
                <input className="input" value={nomeLivreB} onChange={(e) => setNomeLivreB(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-4" style={{ marginTop: 8 }}>
              <ColorInput label="Cor A1" value={corA1} onChange={setCorA1} />
              <ColorInput label="Cor A2" value={corA2} onChange={setCorA2} />
              <ColorInput label="Cor B1" value={corB1} onChange={setCorB1} />
              <ColorInput label="Cor B2" value={corB2} onChange={setCorB2} />
            </div>
            <div className="grid grid-3" style={{ marginTop: 8 }}>
              <div className="field">
                <label className="label">Duração (min)</label>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={45}
                  value={durTempo}
                  onChange={(e) => setDurTempo(parseInt(e.target.value || "0", 10) || 10)}
                />
              </div>
              <div className="field">
                <label className="label">Prorrogação?</label>
                <div className="row">
                  <input id="av_pr" type="checkbox" checked={usaProrrogacao} onChange={(e) => setUsaProrrogacao(e.target.checked)} />
                  <label htmlFor="av_pr">Sim</label>
                </div>
              </div>
              <div className="field">
                <label className="label">Duração prorrogação (min)</label>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={15}
                  value={durProrro}
                  onChange={(e) => setDurProrro(parseInt(e.target.value || "0", 10) || 5)}
                  disabled={!usaProrrogacao}
                />
              </div>
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label className="label">Pênaltis regulares (1–5)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={5}
                value={qtdPen}
                onChange={(e) => setQtdPen(parseInt(e.target.value || "0", 10) || 5)}
              />
            </div>
          </>
        ) : (
          <div className="grid grid-2">
            <div className="field">
              <label className="label">Local</label>
              <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Data e Hora</label>
              <input
                className="input"
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          {!isAvulso ? (
            <>
              <button className="btn btn--orange" onClick={() => salvarVinculado(false)}>
                Salvar parciais
              </button>
              <button className="btn btn--red" onClick={() => salvarVinculado(true)}>
                Encerrar partida
              </button>
            </>
          ) : (
            <button
              className="btn btn--orange"
              onClick={() => {
                setGolsA(0);
                setGolsB(0);
                setPenA(0);
                setPenB(0);
                setFaseComDuracao("1T");
              }}
            >
              Limpar
            </button>
          )}

          {!isAvulso && partida && (
            <Link to={`/campeonatos/${partida.campeonato_id}/partidas`} className="btn btn--muted">
              Voltar
            </Link>
          )}
          {isAvulso && <Link to="/" className="btn btn--muted">Início</Link>}
        </div>
      </div>
    </div>
  );
}

/* ====== Componentes ====== */

function TeamBadge({ abrev, c1, c2, side = "left" }) {
  // círculo 2 cores com diagonal
  const gradId = `g_${side}_${abrev}`;
  return (
    <svg viewBox="0 0 100 100" width={140} height={140} style={{ filter: "drop-shadow(0 1px 0 #fff)" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="50%" stopColor={c1} />
          <stop offset="50%" stopColor={c2} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${gradId})`} stroke="#eee" strokeWidth="2" />
      <text x="50" y="60" fontFamily="Inter, system-ui" fontSize="26" fontWeight="800" fill="#ffffff" textAnchor="middle">
        {abrev}
      </text>
    </svg>
  );
}

function ScoreBig({ value, onDec, onInc, bg = "#111", right = false }) {
  return (
    <div style={{ ...s.scoreBox, background: bg, transform: right ? "skewX(-6deg)" : "skewX(6deg)" }}>
      <div style={{ ...s.scoreValue }}>{value}</div>
      <div style={s.scoreBtnsWrap}>
        <button className="btn btn--muted" onClick={onDec}>-1</button>
        <button className="btn btn--primary" onClick={onInc}>+1</button>
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
        <button className="btn btn--primary" onClick={() => setValue((v) => v + 1)}>
          {value < qtd ? "+1" : "+1 (alternada)"}
        </button>
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input
        className="input"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: 40, padding: 2 }}
      />
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

/* ====== Styles in JS (mobile-first) ====== */
const s = {
  faixaTop: {
    position: "relative",
    padding: "8px 0 0",
  },
  faixaTopInner: {
    margin: "0 auto",
    background: "#ff7a00",
    color: "#fff",
    fontWeight: 800,
    fontSize: 20,
    textAlign: "center",
    padding: "10px 16px",
    clipPath: "polygon(0 0, 94% 0, 100% 30%, 100% 100%, 0 100%, 0 0)",
    borderRadius: 6,
  },
  escudosLinha: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tagsLinha: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -6,
  },
  tagNomeLeft: {
    background: "#e41010",
    color: "#fff",
    fontWeight: 900,
    fontSize: 28,
    padding: "6px 12px",
    borderTopRightRadius: 6,
  },
  tagNomeRight: {
    background: "#101010",
    color: "#fff",
    fontWeight: 900,
    fontSize: 28,
    padding: "6px 12px",
    borderTopLeftRadius: 6,
  },
  placaresLinha: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    alignItems: "stretch",
  },
  scoreBox: {
    color: "#fff",
    borderRadius: 6,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 160,
  },
  scoreValue: {
    fontSize: 96,
    lineHeight: 1,
    fontWeight: 900,
    textAlign: "center",
    transform: "skewX(-6deg)",
  },
  scoreBtnsWrap: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  timerFaixaWrap: {
    margin: "10px 0 6px",
    padding: "6px 0",
    borderTop: "6px solid #ff7a00",
    borderBottom: "6px solid #ff7a00",
  },
  timerFaixa: {
    margin: "0 auto",
    display: "inline-block",
    background: "#ff7a00",
    color: "#fff",
    padding: "6px 18px",
    borderRadius: 6,
    clipPath: "polygon(0 0, 90% 0, 100% 35%, 100% 100%, 0 100%)",
  },
  timerText: { fontSize: 44, fontWeight: 900, textAlign: "center" },
};
