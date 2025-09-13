// src/pages/Placar.jsx (V13)
//Ajuste no salvamento dos penaltis

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
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };

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
  const [penTurn, setPenTurn] = useState("A");
  const [penAlt, setPenAlt] = useState(false);
  const [penFinished, setPenFinished] = useState(false);

  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");

  const [encerrada, setEncerrada] = useState(false);

  const [isMataMata, setIsMataMata] = useState(false);
  const [perna, setPerna] = useState(null);
  const [chaveId, setChaveId] = useState(null);
  const [etapa, setEtapa] = useState(null);
  const [ida, setIda] = useState(null);

  const intervalRef = useRef(null);

  const [canEnd, setCanEnd] = useState(true);
  // Responsivo: mobile vertical
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsMobilePortrait(window.innerWidth <= 480 && window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ===== Carregamento =====
  useEffect(() => {
    try { setCanEnd(canEncerrarPartida()); }
    catch { setCanEnd(true); }
  }, [encerrada, fase, isMataMata, penFinished,
      golsA, golsB, penA, penB, penAMiss, penBMiss,
      ida, perna, camp]);
    
  useEffect(() => {
    if (isAvulso) {
      const tempoMin = 10;
      setDurTempo(tempoMin); setUsaProrrogacao(false); setDurProrro(5); setQtdPen(5);
      setEncerrada(false);
      setFase("1T");
      setSegRestantes(tempoMin * 60);
      setRodando(false);
      if (!dataHora) setDataHora(nowLocalForInput());
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

      // estado de encerramento e pênaltis (inclusive perdidos)
      setEncerrada(!!p.encerrada);
      if (typeof p.penmiss_time_a !== "undefined") setPenAMiss(p.penmiss_time_a || 0);
      if (typeof p.penmiss_time_b !== "undefined") setPenBMiss(p.penmiss_time_b || 0);
      if (p.encerrada && ((p.penaltis_time_a ?? 0) + (p.penaltis_time_b ?? 0) + (p.penmiss_time_a ?? 0) + (p.penmiss_time_b ?? 0) > 0)) {
        setFase("PEN");
        setPenFinished(true);
        setRodando(false);
      }

      if (p.chave_id && p.perna === 2) {
        const { data: outras } = await supabase.from("partidas").select("*").eq("chave_id", p.chave_id);
        const idaMatch = (outras || []).find((x) => x.perna === 1);
        setIda(idaMatch || null);
      } else setIda(null);

      if (!p.encerrada) { setFase("1T"); setSegRestantes(tempoMin * 60); setRodando(false); }
      if (!p.data_hora) {
        setDataHora(nowLocalForInput());
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvulso, partidaId]);

  // ===== Timer =====
  useEffect(() => {
    // Verificar possibilidade de empate ao abrir tela ou reiniciar partida
    if (isMataMata && !encerrada) {
      if (fase === "2T" && precisaDesempateApos2T()) {
        setEncerrada(false); // apenas força re-render
      }
      if (fase === "PR1") {
        setEncerrada(false);
      }
      if (fase === "PR2") {
        const agg = placarAgregado();
        if (agg.a === agg.b) setEncerrada(false);
      }
    }

    if (!rodando) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSegRestantes((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRodando(false);

          // Auto-transições por término de tempo
          if (fase === "1T" && !encerrada) {
            showToast("⏱️ Fim do 1º tempo!");
            setFase("2T");
            setSegRestantes(durTempo * 60);
            return durTempo * 60;
          }

          // 2T: pontos corridos auto-encerram no useEffect(autoEndRef).
          // Em MATA-MATA: decidir próximo período automaticamente ao zerar.
          if (fase === "2T" && !encerrada && isMataMata) {
            if (precisaDesempateApos2T()) {
              const prMin = Number(camp?.duracao_prorrogacao_min ?? camp?.duracao_prorrogacao);
              const prDur = prMin || durProrro || 15; // minutos
              if (camp?.prorrogacao) {
                showToast("⏱️ Fim do 2º tempo! Prorrogação iniciada.");
                setFase("PR1");
                setSegRestantes(Math.max(1, Math.round(prDur * 60)));
                return Math.max(1, Math.round(prDur * 60));
              } else {
                showToast("⏱️ Fim do 2º tempo! Vamos aos pênaltis.");
                const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5;
                setQtdPen(penReg);
                setFase("PEN");
                return 0; // timer não roda em pênaltis
              }
            } else {
              // Não precisa desempate: encerrar manual/auto via botão ou salvarVinculado externo
              // (mantém comportamento atual)
            }
          }

          if (fase === "PR1" && !encerrada) {
            showToast("⏱️ Fim da 1ª prorrogação!");
            setFase("PR2");
            setSegRestantes(durProrro * 60);
            return durProrro * 60;
          }

          if (fase === "PR2" && !encerrada) {
            showToast("⏱️ Fim da 2ª prorrogação!");
            if (isMataMata && golsA === golsB) {
              const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5;
              setQtdPen(penReg);
              setFase("PEN");
            }
          }
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [rodando, fase, encerrada, isMataMata, durTempo, durProrro, golsA, golsB, camp]);

  // ===== Auto-encerrar em pontos corridos ao fim do 2º tempo =====
  const autoEndRef = useRef(false);
  useEffect(() => {
    if (!rodando && segRestantes === 0) {
      if (!isMataMata && fase === "2T" && !encerrada && !autoEndRef.current) {
        autoEndRef.current = true;
        showToast("🏁 Partida encerrada (pontos corridos)");
        salvarVinculado(true);
      }
    }
    if (segRestantes > 0) autoEndRef.current = false;
  }, [segRestantes, rodando, fase, isMataMata, encerrada]);

  // Função utilitária para mesclar cores no modo avulso
  function withColors(team, cor1, cor2, cor_detalhe) {
  return { ...team, cor1, cor2, cor_detalhe };
  }

  // ===== Helpers e regras =====
  // Datas: manter horário escolhido como LOCAL (evitar +fuso ao salvar/exibir)
  function toLocalISOString(dtLike) {
    const d = new Date(dtLike);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 19);
  }
  function nowLocalForInput() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }
  
  const [corA1, setCorA1] = useState("#e41010");
  const [corA2, setCorA2] = useState("#101010");
  const [corADetalhe, setCorADetalhe] = useState("#FFFFFF");
  const [corB1, setCorB1] = useState("#101010");
  const [corB2, setCorB2] = useState("#FFFFFF");
  const [corBDetalhe, setCorBDetalhe] = useState("#FFFFFF");

  const [nomeLivreA, setNomeLivreA] = useState("Time A");
  const [nomeLivreB, setNomeLivreB] = useState("Time B");

  const empateJogo = () => golsA === golsB;

  const podeProrrogacaoApos2T = () => {
    if (!camp?.prorrogacao) return false;
    if (!isMataMata) return false;
    if (!perna) return empateJogo(); // jogo único
    if (perna === 1) return false;   // ida nunca
    if (perna === 2) return agregadoEmpatadoAoFimDo2T();
    return false;
  };

  // Debug logs (defina false para silenciar durante testes)
  const DEBUG = true;
  // ===== Helpers de agregado (mata-mata ida/volta) =====
  function placarAgregado() {
    // Volta sem ida: agregado é o placar atual
    if (perna !== 2 || !ida) {
      if (DEBUG) console.log('[agg] sem ida: volta', { a: golsA, b: golsB });
      return { a: golsA, b: golsB };
    }

    // Gols da ida conforme salvos no banco (sempre relativos ao mandante da ida)
    const idaGA = Number(ida?.gols_time_a ?? 0);
    const idaGB = Number(ida?.gols_time_b ?? 0);

    // Precisamos mapear os gols da ida para os times A/B ATUAIS (volta),
    // pois o mando pode inverter entre as pernas.
    const idaTA = ida?.time_a_id ?? ida?.id_time_a ?? ida?.clube_a_id; // tentativas de nomes
    const idaTB = ida?.time_b_id ?? ida?.id_time_b ?? ida?.clube_b_id;
    const volTA = timeA?.id;
    const volTB = timeB?.id;

    let aggA, aggB;
    if (idaTA && idaTB && volTA && volTB) {
      // Se o time A da VOLTA foi o time A da IDA, ele herda idaGA; se foi o time B da IDA, herda idaGB
      const idaForVolA = (idaTA === volTA) ? idaGA : (idaTB === volTA) ? idaGB : null;
      const idaForVolB = (idaTA === volTB) ? idaGA : (idaTB === volTB) ? idaGB : null;

      // Fallback seguro caso IDs não batam por algum motivo
      aggA = (idaForVolA != null ? idaForVolA : idaGA) + golsA;
      aggB = (idaForVolB != null ? idaForVolB : idaGB) + golsB;

      if (DEBUG) console.log('[agg] map por IDs', {
        ida: { idaGA, idaGB, idaTA, idaTB },
        volta: { volTA, volTB, golsA, golsB },
        mapeado: { aggA, aggB }
      });
    } else {
      // Sem IDs confiáveis: assumir mesma ordem A/B
      aggA = idaGA + golsA;
      aggB = idaGB + golsB;
      if (DEBUG) console.log('[agg] fallback ordem', { idaGA, idaGB, golsA, golsB, aggA, aggB });
    }

    return { a: aggA, b: aggB };
  }
  // Empate no agregado ao final do 2T da volta?
  function agregadoEmpatadoAoFimDo2T() {
    if (perna !== 2) return false;
    const agg = placarAgregado();
    const empate = agg.a === agg.b;
    if (DEBUG) console.log('[rule] agregadoEmpatadoAoFimDo2T', { agg, empate });
    return empate;
  }
  // Precisa decidir após 2T?
  // - Volta empatada no agregado
  // - OU jogo único empatado com desempate no regulamento
  function precisaDesempateApos2T() {
    const jogoUnico = isMataMata && (!camp?.ida_volta || camp?.ida_volta === 0 || camp?.ida_volta === "false");
    let res = false;
    if (jogoUnico) res = (golsA === golsB);
    else if (isMataMata && perna === 2) res = agregadoEmpatadoAoFimDo2T();
    if (DEBUG) console.log('[rule] precisaDesempateApos2T', { jogoUnico, perna, res });
    return res;
  }

  function resetPeriodo() {
    if (fase === "1T" || fase === "2T") setSegRestantes(durTempo * 60);
    else if (fase === "PR1" || fase === "PR2") setSegRestantes(durProrro * 60);
    setRodando(false);
  }

  async function salvarVinculado(encerrar = false, overrides = {}) {
    if (isAvulso || !partidaId) return;
    const payloadBase = {
      gols_time_a: golsA,
      gols_time_b: golsB,
      penaltis_time_a: fase === "PEN" ? penA : null,
      penaltis_time_b: fase === "PEN" ? penB : null,
      penmiss_time_a: fase === "PEN" ? penAMiss : null,
      penmiss_time_b: fase === "PEN" ? penBMiss : null,
      local: local || null,
      data_hora: dataHora ? toLocalISOString(dataHora) : null,
      encerrada: !!encerrar,
    };

    // aplica os valores “snapshot” (se vierem)
    const payload = { ...payloadBase, ...overrides };

    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { showToast("❌ Erro ao salvar partida"); return; }
    if (encerrar) {
      setEncerrada(true);
      setRodando(false);
      setSegRestantes(0);
      showToast("✅ Partida encerrada e salva!");
    } else {
      showToast("✅ Parciais salvas!");
    }
  }

  async function salvarLocalHorario() {
    // salva somente local e data/hora
    if (isAvulso || !partidaId) { 
      showToast("⏺️ Local/Data atualizados (modo avulso)");
      return;
    }
    const payload = {
      local: local || null,
      data_hora: dataHora ? toLocalISOString(dataHora) : null,
    };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { showToast("❌ Erro ao salvar Local/Data"); return; }
    showToast("✅ Local e Data/Hora salvos!");
  }
  async function reiniciarPartida() {
    // Reset local
    setGolsA(0); setGolsB(0);
    resetPenalties();
    setFase("1T"); setSegRestantes(durTempo * 60); setRodando(false);
    setEncerrada(false);

    // Persistir no banco como "nova" (zerada)
    if (isAvulso || !partidaId) {
      showToast("🔄 Partida reiniciada");
    } else {
      const payload = {
        gols_time_a: 0,
        gols_time_b: 0,
        penaltis_time_a: 0,
        penaltis_time_b: 0,
        penmiss_time_a: 0,
        penmiss_time_b: 0,
        encerrada: false,
        prorrogacao: false,
      };
      const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
      if (error) {
        showToast("❌ Erro ao reiniciar partida");
      } else {
        showToast("🔄 Partida reiniciada");
      }
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

    if (novaFase === "PEN") {
      // ao entrar em pênaltis: começa com A, modo regulares, não finalizado
      setPenTurn("A");
      setPenAlt(false);
      setPenFinished(false);
    }

    // Marcar prorrogação no banco quando entrar em PR1 (se aplicável)
    if (novaFase === "PR1" && typeof supabase !== "undefined" && partidaId) {
      try {
        supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId);
      } catch (e) {
        console.warn("Falha ao marcar prorrogação:", e);
      }
    }
    }
  
  // ===== Pênaltis: helpers =====
  function resetPenalties() {
    setPenA(0); setPenB(0); setPenAMiss(0); setPenBMiss(0);
    setPenTurn("A"); setPenAlt(false); setPenFinished(false);
  }

  function totalA() { return penA + penAMiss; }
  function totalB() { return penB + penBMiss; }

  function avaliarPenaltis(depoisDoTime) {
    const aTot = totalA();
    const bTot = totalB();

    if (!penAlt) {
      // fim das regulares?
      if (aTot >= qtdPen && bTot >= qtdPen) {
        if (penA !== penB) {
          // temos vencedor
          setPenFinished(true);
          setEncerrada(true);
          salvarVinculado(true);
        } else {
          // alternadas
          setPenAlt(true);
        }
      }
    } else {
      // alternadas: checa somente ao fechar o par (quando volta a vez do A)
      if (depoisDoTime === "B") {
        if (penA !== penB) {
          setPenFinished(true);
          setEncerrada(true);
          salvarVinculado(true);
        }
      }
    }
  }

  function finalizarPartidaPenaltis(snapshot) {
    if (DEBUG) console.log('[pen] finalizarPartidaPenaltis');
    setPenFinished(true);
    setEncerrada(true);
    // se vier snapshot, salva com ele; senão usa estado atual
    salvarVinculado(true, snapshot || {});
  }

  function registrarPenalti(team, convertido) {
   if (DEBUG) console.log('[pen] registrar', { team, convertido, penAlt, turno: penTurn, A: { conv: penA, miss: penAMiss }, B: { conv: penB, miss: penBMiss } });

    if (penFinished || encerrada) return;
    if (team !== penTurn) return;

    let aConv = penA, aMiss = penAMiss, bConv = penB, bMiss = penBMiss;
    if (team === "A") {
      if (convertido) aConv += 1; else aMiss += 1;
    } else {
      if (convertido) bConv += 1; else bMiss += 1;
    }

    const aTot = aConv + aMiss;
    const bTot = bConv + bMiss;

    if (DEBUG) console.log("[PENALTIS] Após cobrança de", team, convertido ? "✅" : "❌", "| A:", aConv, "(", aTot, ") B:", bConv, "(", bTot, ") alt=", penAlt);
    
    if (!penAlt) {
      if (DEBUG) console.log('[pen] regulares check', { aConv, aMiss, bConv, bMiss, qtdPen });
      const remA = Math.max(0, qtdPen - aTot);
      const remB = Math.max(0, qtdPen - bTot);
      if ((aConv - bConv) > remB || (bConv - aConv) > remA) {
        setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
        finalizarPartidaPenaltis({
          penaltis_time_a: aConv,
          penaltis_time_b: bConv,
          penmiss_time_a: aMiss,
          penmiss_time_b: bMiss,
        });
        return;
      }
      if (aTot >= qtdPen && bTot >= qtdPen) {
        setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
        if (aConv !== bConv) {
          finalizarPartidaPenaltis({
            penaltis_time_a: aConv,
            penaltis_time_b: bConv,
            penmiss_time_a: aMiss,
            penmiss_time_b: bMiss,
          });
        } else {
          setPenAlt(true);
          setPenTurn("A");
        }
        return;
      }
      setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
      setPenTurn(team === "A" ? "B" : "A");
      return;
    }

    setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
    if (team === "B") {
      if (aConv !== bConv) {
        finalizarPartidaPenaltis({
          penaltis_time_a: aConv,
          penaltis_time_b: bConv,
          penmiss_time_a: aMiss,
          penmiss_time_b: bMiss,
        });
      } else {
        setPenTurn("A");
      }
    } else {
      setPenTurn("B");
    }
  }

  function canEncerrarPartida() {
    if (DEBUG) console.log('[ui] canEncerrarPartida state', { fase, encerrada, isMataMata, penFinished, perna, golsA, golsB, camp });

    if (encerrada) return false;
    if (fase === "PEN") return penFinished;

    if (isMataMata) {
      const jogoUnico =
        !camp?.ida_volta || camp?.ida_volta === 0 || camp?.ida_volta === false || camp?.ida_volta === "false";

      // Jogo único: nunca encerrar empatado (em qualquer fase)
      if (jogoUnico) {
        if (golsA === golsB) return false;
      } else if (perna === 2) {
        // Volta: se agregado empatado, não pode encerrar (em qualquer fase)
        const agg = placarAgregado();
        if (DEBUG) console.log('[ui] agregado atual', agg);
        if (agg.a === agg.b) return false;
      }

      // PR1: nunca encerrar manualmente
      if (fase === "PR1") return false;

      // PR2 (volta) empatado no agregado também bloqueia (reforço)
      if (fase === "PR2" && perna === 2) {
        const agg2 = placarAgregado();
        if (agg2.a === agg2.b) return false;
      }
    }

    return true;
  }

  // ===== Encerrar período =====
  function encerrarPeriodo(perguntar = true) {
    if (DEBUG) console.log('[periodo] encerrar', { fase });
    if (perguntar) {
      const ok = confirm(`Confirma encerrar ${labelFaseAmigavel(fase)}?`);
      if (!ok) return;
    }
    setRodando(false);

    if (fase === "1T") { setFaseComDuracao("2T"); return; }

    if (fase === "2T") {
      if (!isMataMata) { salvarVinculado(true); return; }
      if (precisaDesempateApos2T()) {
        if (camp?.prorrogacao) {
          showToast("⏱️ Fim do 2º tempo! Vamos para a prorrogação.");
          setFaseComDuracao("PR1"); return;
        }
        showToast("⏱️ Fim do 2º tempo! Vamos para os pênaltis.");
        setFase("PEN"); return;
      }
      // se não precisa desempate, encerra
      salvarVinculado(true); return;
      if (precisaDesempateApos2T()) {
        if (camp?.prorrogacao) { setFaseComDuracao("PR1"); return; }
        setFase("PEN"); return;
      }
      salvarVinculado(true); return;
    }

    if (fase === "PR1") { setFaseComDuracao("PR2"); return; }

    if (fase === "PR2") {
      if (isMataMata) {
        const agg = placarAgregado();
        if (agg.a === agg.b) {
          const penReg = Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || 5;
          setQtdPen(penReg); setFase("PEN"); return;
        }
      }
      salvarVinculado(true); return;
    }
  }

  // ===== Util =====
  // totalizou pênaltis na partida?
  const tevePenaltis = (penA + penB + penAMiss + penBMiss) > 0;
  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  // ===== Render =====
  return (
    <div className="container" style={{ maxWidth: `calc(${COL_W} * 2 + ${GAP * 2}px)`, margin: "0 auto", padding: "0 8px" }}>
      {/* Seção topo com nome do campeonato ou Amistoso */}
      <div style={{
        background: "linear-gradient(180deg, #ff8a20, #ff7a00)",
        padding: 14,
        textAlign: "center",
        marginTop: 10,
        borderRadius: 14,
        boxShadow: "0 8px 20px rgba(0,0,0,.12)",
      }}>
        <span style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 0.3 }}>
          {isAvulso ? "Amistoso" : camp?.nome || "Campeonato"}
        </span>
      </div>

      {/* === Times + Placar === */}
      <div
        style={{
          ...ui.boardGrid,
          ...(isMobilePortrait
            ? { gridTemplateRows: "130px auto 6px auto", columnGap: 18, margin: "-18px auto 12px" }
            : null),
        }}
      >
        {/* Escudos */}
        <div
          style={{
            ...ui.iconCell,
            ...(isMobilePortrait
              ? {
                  marginBottom: -16,              // sobreposição maior no nome
                  transform: "scale(0.85)",       // ícone ~15% menor
                  transformOrigin: "bottom center"
                }
              : null),
          }}
        >
          {renderTeamIcon(withColors(timeA, corA1, corA2, corADetalhe))}
        </div>
        <div
          style={{
            ...ui.iconCell,
            ...(isMobilePortrait
              ? {
                  marginBottom: -16,              // sobreposição maior no nome
                  transform: "scale(0.85)",       // ícone ~15% menor
                  transformOrigin: "bottom center"
                }
              : null),
          }}
        >
          {renderTeamIcon(withColors(timeB, corB1, corB2, corBDetalhe))}
        </div>

        {/* Nomes */}
        <div style={{ 
          ...ui.teamNameBar, 
          background: corA1, 
          color: corADetalhe, 
          textShadow: getContrastShadow(corADetalhe),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          {timeA.nome}
        </div>
        <div style={{ 
          ...ui.teamNameBar, 
          background: corB1, 
          color: corBDetalhe, 
          textShadow: getContrastShadow(corBDetalhe),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
          {timeB.nome}
        </div>
        {/* Faixa fina */}
        <div style={{ ...ui.teamThinBar, background: corA2 }} />
        <div style={{ ...ui.teamThinBar, background: corB2 }} />

        {/* Placar */}
        <div style={ui.scoreCell}>
          <ScoreCardA value={golsA} onDec={() => setGolsA(v => Math.max(0, v - 1))} onInc={() => setGolsA(v => v + 1)} bg={corA1} textColor={corADetalhe} textShadow={getContrastShadow(corADetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait}/>
        </div>
        <div style={ui.scoreCell}>
          <ScoreCardB value={golsB} onDec={() => setGolsB(v => Math.max(0, v - 1))} onInc={() => setGolsB(v => v + 1)} bg={corB1} textColor={corBDetalhe} textShadow={getContrastShadow(corBDetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait}/>
        </div>
      </div>

      {/* Faixa e cronômetro */}
      {/* Logo acima da faixa do cronometro */}
      <div style={{ marginTop: -60}}>
        <img
          src={logo}
          alt="AureoArtes"
          style={{
            ...ui.logoBelowImg,
            ...(isMobilePortrait ? { height: 46 } : null)
          }}
        />
      </div>
      <div style={ui.orangeLineWide} />
      <div style={ui.timerTrapWide}><div style={ui.timerText}>{fmt(segRestantes)}</div></div>
      
      {/* Toast sutil */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff7a00',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: 10,
          boxShadow: '0 8px 20px rgba(0,0,0,.2)',
          opacity: 1,
          transition: 'opacity 0.5s ease-in-out',
          zIndex: 9999,
          textAlign: 'center'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Seção Período / Encerrada */}
      {encerrada && (
        <div className="card" style={{ padding: 16, marginTop: 12, textAlign: "center", fontWeight: 800 }}>
          Partida Encerrada
        </div>
      )}

      {!encerrada && fase !== "PEN" && (
        <div className="card" style={{ padding: 16, marginTop: 12, textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 22, color: "#ff7a00" }}>
            {labelFaseAmigavel(fase)}
          </div>
          <div className="row" style={{ gap: 8, justifyContent: "center" }}>
            {!rodando ? (
              <button className="btn btn--primary" onClick={() => setRodando(true)}>Iniciar</button>
            ) : (
              <button className="btn btn--primary" onClick={() => setRodando(false)}>Pausar</button>
            )}
            <button className="btn btn--muted" onClick={resetPeriodo}>Reiniciar período</button>
            <button className="btn btn--muted" onClick={() => encerrarPeriodo(true)}>Encerrar período</button>
          </div>
        </div>
      )}

      {/* Seção Pênaltis */}
      {(fase === "PEN" || (encerrada && tevePenaltis)) && (
        <div className="card" style={{ padding: 16, marginTop: 12, textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontWeight: 800, fontSize: 18, color: "#ff7a00" }}>
            {penAlt ? "Pênaltis — Cobranças alternadas" : `Pênaltis — Cobranças regulares ${qtdPen}`}
          </div>
          <div className="badge" style={{ marginBottom: 10 }}>
            Vez: {penTurn === "A" ? timeA.nome : timeB.nome}
          </div>
          <div className="row" style={{ justifyContent: "space-around", marginTop: 12 }}>
            <div>
              <div
                style={{
                  background: corA1,
                  color: corADetalhe,
                  textShadow: getContrastShadow(corADetalhe),
                  border: "2px solid",
                  borderColor: corA2,
                  padding: "8px 12px",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 160,
                  textAlign: "center",
                  fontWeight: 800,
                }}
              >
                {timeA.nome}
                <div>⚽ {penA} &nbsp;&nbsp; ❌ {penAMiss}</div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button
                  className="btn btn--primary"
                  style={{ padding: "10px 14px", fontSize: 16, minWidth: 100 }}
                  onClick={() => registrarPenalti("A", true)} 
                  disabled={encerrada || penFinished || penTurn !== "A"}
                >⚽ Marcou
                </button>
                <button
                  className="btn btn--primary"
                  style={{ padding: "10px 14px", fontSize: 16, minWidth: 100 }}
                  onClick={() => registrarPenalti("A", false)} 
                  disabled={encerrada || penFinished || penTurn !== "A"}
                >❌ Perdeu
                </button>
              </div>
            </div>
            <div>
              <div
                style={{
                  background: corB1,
                  color: corBDetalhe,
                  textShadow: getContrastShadow(corBDetalhe),
                  border: "2px solid",
                  borderColor: corB2,
                  padding: "8px 12px",
                  borderRadius: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 160,
                  textAlign: "center",
                  fontWeight: 800,
                }}
              >
                {timeB.nome}
                <div>⚽ {penB} &nbsp;&nbsp; ❌ {penBMiss}</div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button
                  className="btn btn--primary"
                  style={{ padding: "10px 14px", fontSize: 16, minWidth: 100 }}
                  onClick={() => registrarPenalti("B", true)} 
                  disabled={encerrada || penFinished || penTurn !== "B"}
                >⚽ Marcou
                </button>
                <button
                  className="btn btn--primary"
                  style={{ padding: "10px 14px", fontSize: 16, minWidth: 100 }}
                  onClick={() => registrarPenalti("B", false)} 
                  disabled={encerrada || penFinished || penTurn !== "B"}
                 >❌ Perdeu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção Local/DataHora + Controles */}
      <div className="card" style={{ padding: 16, marginTop: 20 }}>
        <div className="row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <input type="text" className="input" placeholder="Local" value={local} onChange={e => setLocal(e.target.value)} />
          <input type="datetime-local" className="input" value={dataHora} onChange={e => setDataHora(e.target.value)} onFocus={() => { if (!dataHora) { const agora = new Date(); setDataHora(agora.toISOString().slice(0,16)); } }} />
        </div>
        <div className="row" style={{ gap: 12, justifyContent: "center" }}>
          <button
            className="btn"
            style={{ background: "#ff7a00", color: "#fff" }}
            onClick={salvarLocalHorario}
          >
            Salvar Local
          </button>
          <button              
            className="btn"
            style={{ background: "#d93025", color: "#fff" }}
            onClick={reiniciarPartida}
          >
            Reiniciar Partida
          </button>
          <button
            className="btn"
            style={{ background: "#d93025", color: "#fff" }}
            onClick={() => canEnd && salvarVinculado(true)}
            disabled={!canEnd}
          >
            Encerrar Partida
          </button>
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
function ScoreCardPoly({ value, onDec, onInc, bg, textColor, textShadow, side = "A", showControls = true, compact = false }) {
  const clip = side === "A"
    ? "polygon(0 0, 100% 0, 90% 100%, 0 100%)"
    : "polygon(0 0, 100% 0, 100% 100%, 10% 100%)";

  return (
    <div style={ui.scoreShell}>
      <div style={{ ...ui.scoreBox, ...(compact ? { minHeight: 170, padding: "12px 12px" } : null), background: bg, clipPath: clip }}>
        <div style={{ ...ui.scoreValue, color: textColor, textShadow }}>{value}</div>
        {showControls && (
          <div style={ui.scoreBtnsWrap}>
            <button className="btn btn--muted" onClick={onDec}>-1</button>
            <button className="btn btn--primary" onClick={onInc}>+1</button>
          </div>
        )}
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
const ICON_WRAP_H = ICON_SIZE

const ui = {
  headerWrap: { margin: "8px 0 0" },
  headerBar: (isMobilePortrait) ? {
    background: "#ff7a00",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    padding: "6px 10px", // menor
    boxShadow: "0 4px 10px rgba(255,122,0,.25), inset 0 1px 0 rgba(255,255,255,.15)",
  } : {
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
    margin: "-24px auto 16px",
    width: "100%",
    maxWidth: `calc(${COL_W} * 2 + 28px)`, // opcional, combina com o container
  },

  // célula do escudo
  iconCell: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: -12, // sobreposição no teamNameBar
  },

  // nome e thinbar SEMPRE com 100% da coluna e com padding “dentro”
  teamNameBar: {
    width: "100%",
    boxSizing: "border-box",
    fontWeight: 900,
    fontSize: 22,
    padding: "14px 16px",
    borderRadius: "16px 16px 0 0",
    textAlign: "center",
    margin: 0,
  },
  teamThinBar: {
    width: "100%",
    height: 8,
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
  scoreBox: (isMobilePortrait) ? {
    width: "100%",
    minWidth: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    color: "#fff",
    borderRadius: "0 0 14px 14px",
    padding: "12px 12px",
    minHeight: 170, // reduzido
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 8px 18px rgba(0,0,0,.18)",
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.1))",
    border: "1px solid rgba(255,255,255,.06)",
  } : {
    // versão normal
    width: "100%",
    minWidth: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    color: "#fff",
    borderRadius: "0 0 16px 16px",
    padding: "16px 16px",
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 10px 22px rgba(0,0,0,.22)",
    backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.1))",
    border: "1px solid rgba(255,255,255,.06)",
  },

  // números com tabular-nums (cada dígito ocupa a mesma largura)
   scoreValue: {
    fontSize: "clamp(72px, 9vw, 128px)",
    lineHeight: 1,
    fontWeight: 900,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum"',
  },

  scoreBtnsWrap: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 },

  logoBelowImg: { height: 58, display: "block", margin: "0 auto 0" }, // um pouco maior e centralizada

  orangeLineWide: {
    height: 10,
    background: "#ff7a00",
    margin: 0,
    marginTop: 0,
  },

  timerTrapWide: {
    display: "block",
    width: "clamp(220px, 40vw, 320px)",
    margin: "0 auto",
    background: "#ff7a00",
    color: "#fff",
    padding: "12px 0",
    clipPath: "polygon(8% 0, 92% 0, 80% 100%, 20% 100%)",
    boxShadow: "0 8px 18px rgba(255,122,0,.3)",
    textAlign: "center",
  },

  timerText: { fontSize: 44, fontWeight: 900, textAlign: "center" },
};
