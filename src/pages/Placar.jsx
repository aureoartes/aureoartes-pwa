// src/pages/Placar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import supabase from "../lib/supabaseClient";

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

  // Placar/estados
  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);

  // Períodos: 1T, 2T, (PR1, PR2), PEN
  const [fase, setFase] = useState("1T"); // "1T" | "2T" | "PR1" | "PR2" | "PEN"
  const [segRestantes, setSegRestantes] = useState(0);
  const [rodando, setRodando] = useState(false);

  // Prorrogação e pênaltis
  const [usaProrrogacao, setUsaProrrogacao] = useState(false); // habilitar fase PR1/PR2
  const [durTempo, setDurTempo] = useState(10);  // minutos do tempo
  const [durProrro, setDurProrro] = useState(5); // minutos da prorrogação
  const [qtdPen, setQtdPen] = useState(5);       // regulares
  const [penA, setPenA] = useState(0);
  const [penB, setPenB] = useState(0);

  // Informações extras (modo vinculado)
  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState(""); // ISO local (yyyy-MM-ddTHH:mm)

  // Avulso: nomes livres
  const [nomeLivreA, setNomeLivreA] = useState("Time A");
  const [nomeLivreB, setNomeLivreB] = useState("Time B");

  const intervalRef = useRef(null);

  // Carregar dados da partida/campeonato
  useEffect(() => {
    if (isAvulso) {
      // padrões avulsos
      setDurTempo(10);
      setUsaProrrogacao(false);
      setDurProrro(5);
      setQtdPen(5);
      setSegRestantes(10 * 60);
      return;
    }
    (async () => {
      // partida
      const { data: p } = await supabase
        .from("partidas")
        .select("*")
        .eq("id", partidaId)
        .single();
      if (!p) return;

      setPartida(p);

      // campeonato + configs
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
      setDataHora(p.data_hora ? p.data_hora.substring(0, 16) : ""); // ISO->input-local

      // inicia com 1T parado
      setFase("1T");
      setSegRestantes(tempoMin * 60);
      setRodando(false);
    })();
  }, [isAvulso, partidaId]);

  // Timer
  useEffect(() => {
    if (!rodando) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSegRestantes((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [rodando]);

  // Altera fase define duração correspondente
  function setFaseComTempo(novaFase) {
    setFase(novaFase);
    if (novaFase === "1T" || novaFase === "2T") {
      setSegRestantes(durTempo * 60);
    } else if (novaFase === "PR1" || novaFase === "PR2") {
      setSegRestantes((usaProrrogacao ? durProrro : durTempo) * 60);
    } else if (novaFase === "PEN") {
      setSegRestantes(0); // sem cronômetro
    }
    setRodando(false);
  }

  const titulo = isAvulso ? "Placar Eletrônico (Avulso)" : "Placar Eletrônico";

  const exibePenaltis = fase === "PEN";

  function fmtRelogio(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

  async function salvarVinculado(encerrar = false) {
    if (isAvulso || !partida) return;
    const payload = {
      gols_time_a: golsA,
      gols_time_b: golsB,
      prorrogacao: usaProrrogacao && (fase === "PR1" || fase === "PR2" || (golsA === golsB && !exibePenaltis)),
      penaltis_time_a: exibePenaltis ? penA : null,
      penaltis_time_b: exibePenaltis ? penB : null,
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
    else if (fase === "PR1" || fase === "PR2") setSegRestantes((usaProrrogacao ? durProrro : durTempo) * 60);
    setRodando(false);
  }

  // UI
  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>{titulo}</h1>
            {!isAvulso && camp && (
              <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {camp.nome} — {camp.categoria} — {labelFormato(camp.formato)}
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {!isAvulso && partida && (
              <Link to={`/campeonatos/${partida.campeonato_id}/partidas`} className="btn btn--muted">Voltar</Link>
            )}
            {isAvulso && <Link to="/" className="btn btn--muted">Início</Link>}
          </div>
        </div>
      </div>

      {/* Configuração rápida (avulso) */}
      {isAvulso && (
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
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

          <div className="grid grid-3" style={{ marginTop: 8 }}>
            <div className="field">
              <label className="label">Duração de cada tempo (min)</label>
              <input className="input" type="number" min={2} max={45} value={durTempo} onChange={(e) => setDurTempo(parseInt(e.target.value || "0", 10) || 10)} />
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
              <input className="input" type="number" min={2} max={15} value={durProrro} onChange={(e) => setDurProrro(parseInt(e.target.value || "0", 10) || 5)} disabled={!usaProrrogacao} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 8 }}>
            <label className="label">Pênaltis regulares (1–5)</label>
            <input className="input" type="number" min={1} max={5} value={qtdPen} onChange={(e) => setQtdPen(parseInt(e.target.value || "0", 10) || 5)} />
          </div>
        </div>
      )}

      {/* Placar + Relógio */}
      <div className="card" style={{ padding: 14 }}>
        {/* Linha de nomes */}
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="text-strong" style={{ fontSize: 18 }}>
            {isAvulso ? nomeLivreA : (timeA.abrev || timeA.nome)}
          </div>
          <div className="badge">x</div>
          <div className="text-strong" style={{ fontSize: 18 }}>
            {isAvulso ? nomeLivreB : (timeB.abrev || timeB.nome)}
          </div>
        </div>

        {/* Placar numérico */}
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <GoalBox label="Gols A" value={golsA} onInc={() => setGolsA((v) => v + 1)} onDec={() => setGolsA((v) => Math.max(0, v - 1))} />
          <div style={{ textAlign: "center" }}>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Fase</div>
            <select className="select" value={fase} onChange={(e) => setFaseComTempo(e.target.value)}>
              <option value="1T">1º Tempo</option>
              <option value="2T">2º Tempo</option>
              {usaProrrogacao && <option value="PR1">Prorrogação 1</option>}
              {usaProrrogacao && <option value="PR2">Prorrogação 2</option>}
              <option value="PEN">Pênaltis</option>
            </select>

            {/* Relógio */}
            {fase !== "PEN" && (
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900 }}>{fmtRelogio(segRestantes)}</div>
            )}

            {fase !== "PEN" && (
              <div className="row" style={{ marginTop: 8, justifyContent: "center", gap: 6 }}>
                {!rodando ? (
                  <button className="btn btn--primary" onClick={() => setRodando(true)}>Iniciar</button>
                ) : (
                  <button className="btn btn--muted" onClick={() => setRodando(false)}>Pausar</button>
                )}
                <button className="btn btn--muted" onClick={resetPeriodo}>Reiniciar período</button>
              </div>
            )}
          </div>
          <GoalBox label="Gols B" value={golsB} onInc={() => setGolsB((v) => v + 1)} onDec={() => setGolsB((v) => Math.max(0, v - 1))} />
        </div>

        {/* Pênaltis */}
        {fase === "PEN" && (
          <div className="row" style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center" }}>
            <PenaltyBox label="Pênaltis A" value={penA} setValue={setPenA} qtd={qtdPen} />
            <div className="badge">{qtdPen} regulares</div>
            <PenaltyBox label="Pênaltis B" value={penB} setValue={setPenB} qtd={qtdPen} />
          </div>
        )}
      </div>

      {/* Meta (local/data) + ações */}
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          {/* meta só faz sentido no modo vinculado */}
          {!isAvulso && (
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Local</label>
                <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Data e Hora</label>
                <input className="input" type="datetime-local" value={dataHora} onChange={(e) => setDataHora(e.target.value)} />
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            {!isAvulso ? (
              <>
                <button className="btn btn--orange" onClick={() => salvarVinculado(false)}>Salvar parciais</button>
                <button className="btn btn--red" onClick={() => salvarVinculado(true)}>Encerrar partida</button>
              </>
            ) : (
              <>
                <button className="btn btn--orange" onClick={() => { setGolsA(0); setGolsB(0); setPenA(0); setPenB(0); setFaseComTempo("1T"); }}>Limpar</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFormato(v) {
  if (v === "pontos_corridos") return "Pontos Corridos";
  if (v === "grupos") return "Grupos";
  if (v === "mata_mata") return "Mata-mata";
  return v;
}

function GoalBox({ label, value, onInc, onDec }) {
  return (
    <div style={{ textAlign: "center", minWidth: 120 }}>
      <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 900 }}>{value}</div>
      <div className="row" style={{ justifyContent: "center", gap: 6, marginTop: 6 }}>
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
        <button className="btn btn--primary" onClick={() => setValue((v) => v + 1)}>{value < qtd ? "+1" : "+1 (alternada)"}</button>
      </div>
    </div>
  );
}
