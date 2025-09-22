// v1.2.0.2
// src/pages/Placar.jsx 
// Otimizações + Screen Wake Lock
// - Menos styles inline (centralizados em `ui`)
// - Lógica de fases/encerramento deduplicada em helpers
// - Responsividade via matchMedia (orientation)
// - Timer com useCallback e limpeza robusta
// - Pequenos fixes em pênaltis e encerramento
// - Screen Wake Lock: mantém tela ativa enquanto Placar estiver aberto

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";         // <- named export
import { useAuth } from "@/auth/AuthProvider";           // ajuste: auth
import TeamIcon from "../components/TeamIcon";
import { getContrastShadow } from "../utils/colors";
import logo from "../assets/logo_aureoartes.png";
import ColorSwatchSelect from "../components/ColorSwatchSelect";

export default function Placar() {
  const { partidaId } = useParams();
  const navigate = useNavigate();
  const isAvulso = !partidaId;
  const { ownerId, loading: authLoading } = useAuth();

  // ===== UI State =====
  const [toastMsg, setToastMsg] = useState("");
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout((showToast)._t);
    (showToast)._t = window.setTimeout(() => setToastMsg(""), 3000);
  }, []);

  // ===== Entities =====
  const [partida, setPartida] = useState(null);
  const [camp, setCamp] = useState(null);
  const [timeA, setTimeA] = useState({ id: null, nome: "Time A", abrev: "", escudo_url: null });
  const [timeB, setTimeB] = useState({ id: null, nome: "Time B", abrev: "", escudo_url: null });

  // ===== Score & Clock =====
  const [golsA, setGolsA] = useState(0);
  const [golsB, setGolsB] = useState(0);
  const [fase, setFase] = useState("1T"); // 1T | 2T | PR1 | PR2 | PEN
  const [segRestantes, setSegRestantes] = useState(0);
  const [rodando, setRodando] = useState(false);

  // ===== Config =====
  const [usaProrrogacao, setUsaProrrogacao] = useState(false);
  const [durTempo, setDurTempo] = useState(10); // min
  const [durProrro, setDurProrro] = useState(5); // min
  const [qtdPen, setQtdPen] = useState(5);

  // ===== Penaltis =====
  const [penA, setPenA] = useState(0);
  const [penB, setPenB] = useState(0);
  const [penAMiss, setPenAMiss] = useState(0);
  const [penBMiss, setPenBMiss] = useState(0);
  const [penTurn, setPenTurn] = useState("A");
  const [penAlt, setPenAlt] = useState(false);
  const [penFinished, setPenFinished] = useState(false);

  // ===== Meta =====
  const [local, setLocal] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [encerrada, setEncerrada] = useState(false);
  const [isMataMata, setIsMataMata] = useState(false);
  const [perna, setPerna] = useState(null);
  const [chaveId, setChaveId] = useState(null);
  const [etapa, setEtapa] = useState(null);
  const [ida, setIda] = useState(null);

  // ===== Responsivo =====
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const check = () => setIsMobilePortrait(mq.matches && window.innerWidth <= 480);
    check();
    mq.addEventListener?.("change", check);
    window.addEventListener("resize", check, { passive: true });
    return () => {
      mq.removeEventListener?.("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // ===== Avulso: cores e nomes livres =====
  const [corA1, setCorA1] = useState("#ff7a00");
  const [corA2, setCorA2] = useState("#ffffff");
  const [corADetalhe, setCorADetalhe] = useState("#000000");
  const [corB1, setCorB1] = useState("#ffffff");
  const [corB2, setCorB2] = useState("#ff7a00");
  const [corBDetalhe, setCorBDetalhe] = useState("#000000");
  const [showAvulsoEdit, setShowAvulsoEdit] = useState(false);
  const [desempate, setDesempate] = useState("amistoso"); // amistoso | prorrogacao | penaltis
  const started = (fase !== "1T") || (golsA + golsB > 0) || (segRestantes < durTempo * 60) || rodando;

  // ===== Utils =====
  const intervalRef = useRef(null);
  const autoEndRef = useRef(false);
  const DEBUG = false;

  const toLocalISOString = (dtLike) => {
    const d = new Date(dtLike);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 19);
  };
  const nowLocalForInput = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  const withColors = (team, cor1, cor2, cor_detalhe) => ({ ...team, cor1, cor2, cor_detalhe });

  // ===== Helpers Regras =====
  const empateJogo = () => golsA === golsB;
  const isJogoUnico = useMemo(() => (isMataMata && (!camp?.ida_volta || camp?.ida_volta === 0 || camp?.ida_volta === false || camp?.ida_volta === "false")), [isMataMata, camp]);

  function placarAgregado() {
    if (perna !== 2 || !ida) return { a: golsA, b: golsB };
    const idaGA = Number(ida?.gols_time_a ?? 0);
    const idaGB = Number(ida?.gols_time_b ?? 0);
    const idaTA = ida?.time_a_id ?? ida?.id_time_a ?? ida?.clube_a_id;
    const idaTB = ida?.time_b_id ?? ida?.id_time_b ?? ida?.clube_b_id;
    const volTA = timeA?.id;
    const volTB = timeB?.id;

    if (idaTA && idaTB && volTA && volTB) {
      const idaForVolA = (idaTA === volTA) ? idaGA : (idaTB === volTA) ? idaGB : idaGA;
      const idaForVolB = (idaTA === volTB) ? idaGA : (idaTB === volTB) ? idaGB : idaGB;
      return { a: idaForVolA + golsA, b: idaForVolB + golsB };
    }
    return { a: idaGA + golsA, b: idaGB + golsB };
  }

  const agregadoEmpatadoAoFimDo2T = () => (perna === 2 && (placarAgregado().a === placarAgregado().b));
  const precisaDesempateApos2T = () => (isJogoUnico ? empateJogo() : (isMataMata && perna === 2 ? agregadoEmpatadoAoFimDo2T() : false));

  const getDurTempoCamp = () => Number(camp?.duracao_tempo_min ?? camp?.duracao_tempo) || durTempo || 10;
  const getDurProrroCamp = () => Number(camp?.duracao_prorrogacao_min ?? camp?.duracao_prorrogacao) || durProrro || 5;
  const getQtdPenCamp = () => Number(camp?.qtd_penaltis ?? camp?.penaltis_regulares) || qtdPen || 5;

  const enterPenaltis = useCallback((regulares = getQtdPenCamp()) => {
    setQtdPen(regulares);
    setFase("PEN");
    setSegRestantes(0);
    setRodando(false);
    setPenTurn("A");
    setPenAlt(false);
    setPenFinished(false);
  }, [setFase]);

  const startProrrogacao = useCallback(() => {
    const prDur = Math.max(1, Math.round(getDurProrroCamp() * 60));
    setFase("PR1");
    setSegRestantes(prDur);
    setRodando(false);
    if (!isAvulso && partidaId) {
      // marca prorrogação no banco sem bloquear UI
      supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId).catch(() => {});
    }
  }, [partidaId, isAvulso]);

  const setFaseComDuracao = useCallback((novaFase) => {
    setFase(novaFase);
    const minutos = (novaFase === "PR1" || novaFase === "PR2") ? getDurProrroCamp() : getDurTempoCamp();
    setSegRestantes(Math.max(1, Math.round(minutos * 60)));
    if (novaFase === "PEN") enterPenaltis(getQtdPenCamp());
    if (novaFase === "PR1" && !isAvulso && partidaId) {
      supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId).catch(() => {});
    }
  }, [enterPenaltis, getDurProrroCamp, getDurTempoCamp, getQtdPenCamp, isAvulso, partidaId]);

  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  // ===== Guards =====
  const [canEnd, setCanEnd] = useState(true);
  const canEncerrarPartida = useCallback(() => {
    if (encerrada) return false;
    if (fase === "PEN") return penFinished;
    if (isMataMata) {
      if (isJogoUnico) {
        if (golsA === golsB) return false; // jogo único não encerra empatado
      } else if (perna === 2) {
        const agg = placarAgregado();
        if (agg.a === agg.b) return false; // volta com agregado empatado
      }
      if (fase === "PR1") return false; // nunca encerrar manual na PR1
      if (fase === "PR2" && perna === 2) {
        const agg2 = placarAgregado();
        if (agg2.a === agg2.b) return false;
      }
    }
    return true;
  }, [encerrada, fase, isMataMata, isJogoUnico, golsA, golsB, penFinished, perna]);

  useEffect(() => {
    try { setCanEnd(canEncerrarPartida()); } catch { setCanEnd(true); }
  }, [encerrada, fase, isMataMata, penFinished, golsA, golsB, penA, penB, penAMiss, penBMiss, perna, camp, canEncerrarPartida]);

  // ===== Carregamento =====
  useEffect(() => {
    if (!isAvulso && authLoading) return; // aguarda auth
    if (isAvulso) {
      // Reset avulso
      const tempoMin = 10;
      setGolsA(0); setGolsB(0); resetPenalties();
      setTimeA({ id: null, nome: "Time A", abrev: "", escudo_url: null });
      setTimeB({ id: null, nome: "Time B", abrev: "", escudo_url: null });
      setCorA1("#ff7a00"); setCorA2("#ffffff"); setCorADetalhe("#000000");
      setCorB1("#ff7a00"); setCorB2("#ffffff"); setCorBDetalhe("#000000");
      setDurTempo(tempoMin); setUsaProrrogacao(false); setDurProrro(5); setQtdPen(5);
      setEncerrada(false); setFase("1T"); setSegRestantes(tempoMin * 60); setRodando(false);
      setShowAvulsoEdit(false);
      if (!dataHora) setDataHora(nowLocalForInput());
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    (async () => {
      const { data: p } = await supabase.from("partidas").select("*").eq("id", partidaId).single();
      if (!p) return;
      setPartida(p);

      const { data: c } = await supabase.from("campeonatos").select("*").eq("id", p.campeonato_id).eq("usuario_id", ownerId).single();
      if (!c || c.usuario_id !== ownerId) { showToast("Campeonato não encontrado para este usuário."); navigate("/campeonatos"); return; }
      setCamp(c);

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
          .in("id", ids)
          .eq("usuario_id", ownerId);
        const byId = new Map((ts || []).map((t) => [t.id, t]));
        const A = byId.get(p.time_a_id);
        const B = byId.get(p.time_b_id);
        if (A) { setTimeA({ id: A.id, nome: A.nome, abrev: A.abreviacao || "", escudo_url: A.escudo_url || null }); setCorA1(A.cor1 || corA1); setCorA2(A.cor2 || corA2); setCorADetalhe(A.cor_detalhe || corADetalhe); }
        if (B) { setTimeB({ id: B.id, nome: B.nome, abrev: B.abreviacao || "", escudo_url: B.escudo_url || null }); setCorB1(B.cor1 || corB1); setCorB2(B.cor2 || corB2); setCorBDetalhe(B.cor_detalhe || corBDetalhe); }
      }

      setGolsA(p.gols_time_a ?? 0); setGolsB(p.gols_time_b ?? 0);
      setPenA(p.penaltis_time_a ?? 0); setPenB(p.penaltis_time_b ?? 0);
      setLocal(p.local || ""); setDataHora(p.data_hora ? p.data_hora.substring(0, 16) : "");

      setEncerrada(!!p.encerrada);
      if (typeof p.penmiss_time_a !== "undefined") setPenAMiss(p.penmiss_time_a || 0);
      if (typeof p.penmiss_time_b !== "undefined") setPenBMiss(p.penmiss_time_b || 0);
      if (p.encerrada && ((p.penaltis_time_a ?? 0) + (p.penaltis_time_b ?? 0) + (p.penmiss_time_a ?? 0) + (p.penmiss_time_b ?? 0) > 0)) {
        setFase("PEN"); setPenFinished(true); setRodando(false);
      }

      if (p.chave_id && p.perna === 2) {
        const { data: outras } = await supabase.from("partidas").select("*").eq("chave_id", p.chave_id);
        const idaMatch = (outras || []).find((x) => x.perna === 1);
        setIda(idaMatch || null);
      } else setIda(null);

      if (!p.encerrada) { setFase("1T"); setSegRestantes(tempoMin * 60); setRodando(false); }
      if (!p.data_hora) setDataHora(nowLocalForInput());
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAvulso, partidaId, authLoading]);

  useEffect(() => { window.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); }, []);
  useEffect(() => { window.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); }, [partidaId, isAvulso]);

  // ===== Screen Wake Lock =====
  const wakeLockRef = useRef(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const requestWakeLock = useCallback(async () => {
    try {
      if (!("wakeLock" in navigator)) return; // sem suporte
      if (wakeLockRef.current) return; // já ativo
      const wl = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wl;
      setWakeLockActive(true);
      wl.addEventListener?.("release", () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch (err) {
      if (document.visibilityState === "visible") {
        showToast("ℹ️ Seu dispositivo pode não permitir manter a tela ativa.");
      }
    }
  }, [showToast]);

  const releaseWakeLock = useCallback(() => {
    try { wakeLockRef.current?.release?.(); } catch {}
    wakeLockRef.current = null;
    setWakeLockActive(false);
  }, []);

  useEffect(() => {
    // Mantém a tela ativa enquanto o Placar estiver aberto
    requestWakeLock();

    const onVis = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // ===== Timer =====
  const onTick = useCallback(() => {
    setSegRestantes((s) => {
      if (s <= 1) {
        window.clearInterval(intervalRef.current);
        setRodando(false);

        // Transições automáticas por término do tempo
        if (fase === "1T" && !encerrada) {
          showToast("⏱️ Fim do 1º tempo!");
          setFase("2T");
          setSegRestantes(getDurTempoCamp() * 60);
          return getDurTempoCamp() * 60;
        }

        if (fase === "2T" && !encerrada) {
          if (isMataMata && precisaDesempateApos2T()) {
            if (camp?.prorrogacao) {
              showToast("⏱️ Fim do 2º tempo! Prorrogação iniciada.");
              startProrrogacao();
            } else {
              showToast("⏱️ Fim do 2º tempo! Vamos aos pênaltis.");
              enterPenaltis(getQtdPenCamp());
            }
          }
        }

        if (fase === "PR1" && !encerrada) {
          showToast("⏱️ Fim da 1ª prorrogação!");
          setFase("PR2");
          setSegRestantes(getDurProrroCamp() * 60);
          return getDurProrroCamp() * 60;
        }

        if (fase === "PR2" && !encerrada) {
          showToast("⏱️ Fim da 2ª prorrogação!");
          if (isAvulso) {
            if (golsA === golsB) enterPenaltis(getQtdPenCamp());
          } else if (isMataMata) {
            const agg = placarAgregado();
            if (agg.a === agg.b) enterPenaltis(getQtdPenCamp());
          }
        }
        return 0;
      }
      return Math.max(0, s - 1);
    });
  }, [fase, encerrada, isMataMata, camp, isAvulso, golsA, golsB, startProrrogacao, enterPenaltis]);

  useEffect(() => {
    if (!rodando) { window.clearInterval(intervalRef.current); return; }
    intervalRef.current = window.setInterval(onTick, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [rodando, onTick]);

  // ===== Auto-encerrar: pontos corridos & AVULSO =====
  useEffect(() => {
    if (!rodando && segRestantes === 0) {
      if (isAvulso && fase === "2T" && !encerrada) {
        if (golsA === golsB) {
          if (desempate === "prorrogacao") { showToast("⏱️ Fim do 2º tempo! Prorrogação iniciada."); startProrrogacao(); return; }
          if (desempate === "penaltis") { showToast("⏱️ Fim do 2º tempo! Vamos aos pênaltis."); enterPenaltis(getQtdPenCamp()); return; }
          setEncerrada(true); showToast("🏁 Amistoso encerrado (empate)."); return;
        }
        setEncerrada(true); showToast("🏁 Amistoso encerrado."); return;
      }
      if (!isMataMata && fase === "2T" && !encerrada && !autoEndRef.current) {
        autoEndRef.current = true;
        showToast("🏁 Partida encerrada (pontos corridos)");
        salvarVinculado(true);
      }
    }
    if (segRestantes > 0) autoEndRef.current = false;
  }, [segRestantes, rodando, fase, isMataMata, encerrada, isAvulso, desempate, durProrro, golsA, golsB]);

  // ===== Persistência =====
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
    const payload = { ...payloadBase, ...overrides };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { showToast("❌ Erro ao salvar partida"); return; }
    if (encerrar) { setEncerrada(true); setRodando(false); setSegRestantes(0); showToast("✅ Partida encerrada e salva!"); } else { showToast("✅ Parciais salvas!"); }
  }

  async function salvarLocalHorario() {
    if (isAvulso || !partidaId) { showToast("⏺️ Local/Data atualizados (modo avulso)"); return; }
    const payload = { local: local || null, data_hora: dataHora ? toLocalISOString(dataHora) : null };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { showToast("❌ Erro ao salvar Local/Data"); return; }
    showToast("✅ Local e Data/Hora salvos!");
  }

  async function reiniciarPartida() {
    setGolsA(0); setGolsB(0); resetPenalties(); setFase("1T"); setSegRestantes(getDurTempoCamp() * 60); setRodando(false); setEncerrada(false);
    if (isAvulso || !partidaId) { showToast("🔄 Partida reiniciada"); return; }
    const payload = { gols_time_a: 0, gols_time_b: 0, penaltis_time_a: 0, penaltis_time_b: 0, penmiss_time_a: 0, penmiss_time_b: 0, encerrada: false, prorrogacao: false };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) showToast("❌ Erro ao reiniciar partida"); else showToast("🔄 Partida reiniciada");
  }

  function labelFaseAmigavel(f) {
    switch (f) { case "1T": return "1º tempo"; case "2T": return "2º tempo"; case "PR1": return "1ª prorrogação"; case "PR2": return "2ª prorrogação"; case "PEN": return "pênaltis"; default: return f || ""; }
  }

  function encerrarPartidaImediata() {
    window.clearInterval(intervalRef.current);
    setRodando(false); setEncerrada(true); setSegRestantes(0); setPenFinished(true); setShowAvulsoEdit(false); showToast("🏁 Partida encerrada (avulso).");
  }

  function resetPeriodo() {
    const secs = (fase === "1T" || fase === "2T") ? getDurTempoCamp() * 60 : getDurProrroCamp() * 60;
    setSegRestantes(secs);
    setRodando(false);
  }

  // ===== Pênaltis =====
  function resetPenalties() { setPenA(0); setPenB(0); setPenAMiss(0); setPenBMiss(0); setPenTurn("A"); setPenAlt(false); setPenFinished(false); }
  const totalA = () => penA + penAMiss; const totalB = () => penB + penBMiss;

  function finalizarPartidaPenaltis(snapshot) {
    setPenFinished(true); setEncerrada(true); salvarVinculado(true, snapshot || {});
  }

  function registrarPenalti(team, convertido) {
    if (penFinished || encerrada) return; if (team !== penTurn) return;
    let aConv = penA, aMiss = penAMiss, bConv = penB, bMiss = penBMiss;
    if (team === "A") { if (convertido) aConv += 1; else aMiss += 1; } else { if (convertido) bConv += 1; else bMiss += 1; }
    const aTot = aConv + aMiss; const bTot = bConv + bMiss;

    if (!penAlt) {
      const remA = Math.max(0, qtdPen - aTot); const remB = Math.max(0, qtdPen - bTot);
      if ((aConv - bConv) > remB || (bConv - aConv) > remA) {
        setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
        finalizarPartidaPenaltis({ penaltis_time_a: aConv, penaltis_time_b: bConv, penmiss_time_a: aMiss, penmiss_time_b: bMiss });
        return;
      }
      if (aTot >= qtdPen && bTot >= qtdPen) {
        setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
        if (aConv !== bConv) { finalizarPartidaPenaltis({ penaltis_time_a: aConv, penaltis_time_b: bConv, penmiss_time_a: aMiss, penmiss_time_b: bMiss }); }
        else { setPenAlt(true); setPenTurn("A"); }
        return;
      }
      setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss); setPenTurn(team === "A" ? "B" : "A");
      return;
    }

    // Alternadas
    setPenA(aConv); setPenAMiss(aMiss); setPenB(bConv); setPenBMiss(bMiss);
    if (team === "B") { if (aConv !== bConv) finalizarPartidaPenaltis({ penaltis_time_a: aConv, penaltis_time_b: bConv, penmiss_time_a: aMiss, penmiss_time_b: bMiss }); else setPenTurn("A"); }
    else { setPenTurn("B"); }
  }

  // ===== Encerrar período (centralizado) =====
  function encerrarPeriodo(perguntar = true) {
    if (perguntar && !confirm(`Confirma encerrar ${labelFaseAmigavel(fase)}?`)) return;
    setRodando(false);

    if (fase === "1T") { setFaseComDuracao("2T"); return; }

    if (fase === "2T") {
      if (isAvulso) {
        if (golsA === golsB) {
          if (desempate === "prorrogacao") { setFaseComDuracao("PR1"); return; }
          if (desempate === "penaltis") { setFase("PEN"); return; }
          setEncerrada(true); showToast("🏁 Amistoso encerrado (empate)."); return;
        }
        setEncerrada(true); showToast("🏁 Amistoso encerrado."); return;
      }
      if (!isMataMata) { salvarVinculado(true); return; }
      if (precisaDesempateApos2T()) {
        if (camp?.prorrogacao) { showToast("⏱️ Fim do 2º tempo! Vamos para a prorrogação."); setFaseComDuracao("PR1"); return; }
        showToast("⏱️ Fim do 2º tempo! Vamos para os pênaltis."); setFase("PEN"); return;
      }
      salvarVinculado(true); return;
    }

    if (fase === "PR1") { setFaseComDuracao("PR2"); return; }

    if (fase === "PR2") {
      if (isAvulso) {
        if (golsA === golsB) { setFase("PEN"); setSegRestantes(0); setRodando(false); setPenTurn("A"); setPenAlt(false); setPenFinished(false); showToast("⏱️ Prorrogação encerrada. Vamos aos pênaltis."); return; }
        setEncerrada(true); setRodando(false); setSegRestantes(0); showToast("🏁 Partida encerrada (avulso)."); return;
      }
      if (isMataMata) {
        const agg = placarAgregado();
        if (agg.a === agg.b) { enterPenaltis(getQtdPenCamp()); return; }
      }
      salvarVinculado(true); return;
    }
  }

  // ===== Render =====
  const tevePenaltis = (penA + penB + penAMiss + penBMiss) > 0;

  return (
    <div className="container" style={{ maxWidth: `calc(${COL_W} * 2 + ${GAP * 2}px)`, margin: "0 auto", padding: "0 8px" }}>
      {/* Topo */}
      <div className="placar-header card">
        <span className="placar-header__title">{isAvulso ? "Amistoso" : camp?.nome || "Campeonato"}</span>
        {wakeLockActive && <span className="badge" style={{ marginLeft: 8 }}>Tela ativa</span>}
        {isAvulso && (
          <button
            className="placar-header__edit btn"
            onClick={() => setShowAvulsoEdit(v => !v)}
            aria-label="Editar amistoso"
          >✎</button>
        )}
      </div>

      {/* Painel Avulso */}
      {isAvulso && showAvulsoEdit && (
        <div className="card" style={ui.cardPad}>
          <div className="row" style={ui.avulsoGrid}>
            {/* TIME A */}
            <div style={{ minWidth: 260, flex: 1 }}>
              <div className="label" style={ui.labelBold}>Time A</div>
              <div className="row" style={ui.rowGap8}>
                <input className="input" placeholder="Nome do Time A" value={timeA.nome} onChange={e => setTimeA(t => ({ ...t, nome: e.target.value }))} disabled={started} style={{ flex: 2 }} />
                <input className="input" placeholder="SIG" value={timeA.abrev || ""} onChange={e => setTimeA(t => ({ ...t, abrev: e.target.value.slice(0, 3).toUpperCase() }))} disabled={started} style={ui.sigla} />
              </div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor 1 (A)" value={corA1} onChange={setCorA1} disabled={started} /></div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor 2 (A)" value={corA2} onChange={setCorA2} disabled={started} /></div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor Detalhe (A)" value={corADetalhe} onChange={setCorADetalhe} disabled={started} /></div>
            </div>
            {/* TIME B */}
            <div style={{ minWidth: 260, flex: 1 }}>
              <div className="label" style={ui.labelBold}>Time B</div>
              <div className="row" style={ui.rowGap8}>
                <input className="input" placeholder="Nome do Time B" value={timeB.nome} onChange={e => setTimeB(t => ({ ...t, nome: e.target.value }))} disabled={started} style={{ flex: 2 }} />
                <input className="input" placeholder="SIG" value={timeB.abrev || ""} onChange={e => setTimeB(t => ({ ...t, abrev: e.target.value.slice(0, 3).toUpperCase() }))} disabled={started} style={ui.sigla} />
              </div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor 1 (B)" value={corB1} onChange={setCorB1} disabled={started} /></div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor 2 (B)" value={corB2} onChange={setCorB2} disabled={started} /></div>
              <div style={ui.mt10}><ColorSwatchSelect label="Cor Detalhe (B)" value={corBDetalhe} onChange={setCorBDetalhe} disabled={started} /></div>
            </div>
          </div>

          {/* Configs */}
          <div style={ui.mt14}>
            <div className="label" style={ui.labelBold}>Configurações da Partida</div>
            <div className="row" style={ui.configRow}>
              <select className="input" value={desempate} onChange={(e) => setDesempate(e.target.value)} disabled={started} style={{ minWidth: 240 }} title="Critério em caso de empate no tempo normal" >
                <option value="amistoso">Desempate: Amistoso (permite empate)</option>
                <option value="prorrogacao">Desempate: Prorrogação</option>
                <option value="penaltis">Desempate: Pênaltis direto</option>
              </select>
              <div className="row" style={ui.rowGap8}><label className="label" style={ui.labelInline}>Tempo de partida (min):</label>
                <input type="number" className="input" min={1} value={durTempo} onChange={e => { const novo = Math.max(1, Number(e.target.value || 1)); setDurTempo(novo); if (!rodando && (fase === "1T" || fase === "2T")) setSegRestantes(novo * 60); }} disabled={started} style={ui.numSmall} />
              </div>
              <div className="row" style={ui.rowGap8}><label className="label" style={ui.labelInline}>Prorrogação (min):</label>
                <input type="number" className="input" min={1} value={durProrro} onChange={e => setDurProrro(Math.max(1, Number(e.target.value || 1)))} disabled={started || desempate !== "prorrogacao"} style={ui.numSmall} />
              </div>
              <div className="row" style={ui.rowGap8}><label className="label" style={ui.labelInline}>Pênaltis (regulares):</label>
                <input type="number" className="input" min={1} value={qtdPen} onChange={e => setQtdPen(Math.max(1, Number(e.target.value || 1)))} disabled={started} style={ui.numSmall} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Times + Placar */}
      <div style={{ ...ui.boardGrid, ...(isMobilePortrait ? ui.boardGridMobile : null) }}>
        {/* Escudos */}
        <div style={{ ...ui.iconCell, ...(isMobilePortrait ? ui.iconCellMobile : null) }}>{renderTeamIcon(withColors(timeA, corA1, corA2, corADetalhe))}</div>
        <div style={{ ...ui.iconCell, ...(isMobilePortrait ? ui.iconCellMobile : null) }}>{renderTeamIcon(withColors(timeB, corB1, corB2, corBDetalhe))}</div>
        {/* Nomes */}
        <div style={{ ...ui.teamNameBar, background: corA1, color: corADetalhe, textShadow: getContrastShadow(corADetalhe) }}>{timeA.nome}</div>
        <div style={{ ...ui.teamNameBar, background: corB1, color: corBDetalhe, textShadow: getContrastShadow(corBDetalhe) }}>{timeB.nome}</div>
        <div style={{ ...ui.teamThinBar, background: corA2 }} />
        <div style={{ ...ui.teamThinBar, background: corB2 }} />
        {/* Placar */}
        <div style={ui.scoreCell}><ScoreCardA value={golsA} onDec={() => setGolsA(v => Math.max(0, v - 1))} onInc={() => setGolsA(v => v + 1)} bg={corA1} textColor={corADetalhe} textShadow={getContrastShadow(corADetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait} /></div>
        <div style={ui.scoreCell}><ScoreCardB value={golsB} onDec={() => setGolsB(v => Math.max(0, v - 1))} onInc={() => setGolsB(v => v + 1)} bg={corB1} textColor={corBDetalhe} textShadow={getContrastShadow(corBDetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait} /></div>
      </div>

      {/* Faixa e cronômetro */}
      <div style={{ marginTop: isMobilePortrait ? -40 : -60 }}>
        <img src={logo} alt="AureoArtes" style={{ ...ui.logoBelowImg, ...(isMobilePortrait ? { height: 40 } : null) }} />
      </div>
      <div style={ui.orangeLineWide} />
      <div className="placar-timer"><div className="placar-timer__value">{fmt(segRestantes)}</div></div>

      {/* Toast */}
      {toastMsg && (
        <div className={`placar-toast ${isMobilePortrait ? "placar-toast--top" : ""}`}>{toastMsg}</div>
      )}

      {/* Seção Período / Encerrada */}
      {encerrada && (<div className="card" style={ui.cardCenteredStrong}>Partida Encerrada</div>)}

      {!encerrada && fase !== "PEN" && (
        <div className="card" style={ui.cardCentered}>
          <div className={`placar-period${isMobilePortrait ? " placar-period--sm" : ""}`}>{labelFaseAmigavel(fase)}</div>
          <div className="row" style={ui.rowCenter8}>
            {!rodando ? (
              <button className="btn btn--primary" onClick={() => { setShowAvulsoEdit(false); setRodando(true); }} style={isMobilePortrait ? ui.btnSm : undefined}>Iniciar</button>
            ) : (
              <button className="btn btn--primary" onClick={() => setRodando(false)} style={isMobilePortrait ? ui.btnSm : undefined}>Pausar</button>
            )}
            <button className="btn btn--muted" onClick={resetPeriodo} style={isMobilePortrait ? ui.btnSm : undefined}>{isMobilePortrait ? "Reiniciar" : "Reiniciar período"}</button>
            <button className="btn btn--muted" onClick={() => encerrarPeriodo(true)} style={isMobilePortrait ? ui.btnSm : undefined}>{isMobilePortrait ? "Encerrar" : "Encerrar período"}</button>
          </div>
        </div>
      )}

      {/* Pênaltis */}
      {(fase === "PEN" || (encerrada && tevePenaltis)) && (
        <div className="card" style={ui.cardPadCenter}>
          <div style={ui.penTitle}>{penAlt ? "Pênaltis — Cobranças alternadas" : `Pênaltis — Cobranças regulares ${qtdPen}`}</div>
          <div className="badge" style={{ marginBottom: 10 }}>Vez: {penTurn === "A" ? timeA.nome : timeB.nome}</div>
          <div className="row" style={ui.penRow}> 
            <div>
              <div style={ui.penTeamBox(corA1, corADetalhe, corA2)}>{timeA.nome}<div>⚽ {penA} &nbsp;&nbsp; ❌ {penAMiss}</div></div>
              <div className="row" style={ui.rowGap8Mt6}>
                <button className="btn btn--primary" style={ui.penBtn} onClick={() => registrarPenalti("A", true)} disabled={encerrada || penFinished || penTurn !== "A"}>⚽ Marcou</button>
                <button className="btn btn--primary" style={ui.penBtn} onClick={() => registrarPenalti("A", false)} disabled={encerrada || penFinished || penTurn !== "A"}>❌ Perdeu</button>
              </div>
            </div>
            <div>
              <div style={ui.penTeamBox(corB1, corBDetalhe, corB2)}>{timeB.nome}<div>⚽ {penB} &nbsp;&nbsp; ❌ {penBMiss}</div></div>
              <div className="row" style={ui.rowGap8Mt6}>
                <button className="btn btn--primary" style={ui.penBtn} onClick={() => registrarPenalti("B", true)} disabled={encerrada || penFinished || penTurn !== "B"}>⚽ Marcou</button>
                <button className="btn btn--primary" style={ui.penBtn} onClick={() => registrarPenalti("B", false)} disabled={encerrada || penFinished || penTurn !== "B"}>❌ Perdeu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local/Data e Controles */}
      <div className="card" style={ui.cardPadMt20}>
        <div className="row" style={ui.localGrid}>
          <input type="text" className="input" placeholder="Local" value={local} onChange={e => setLocal(e.target.value)} />
          <input type="datetime-local" className="input" value={dataHora} onChange={e => setDataHora(e.target.value)} onFocus={() => { if (!dataHora) { const agora = new Date(); setDataHora(agora.toISOString().slice(0,16)); } }} />
        </div>
        <div className="row" style={ui.rowCenter12}>
          {!isAvulso && (<button className="btn" style={ui.btnOrange} onClick={salvarLocalHorario}>Salvar Local</button>)}
          <button className="btn btn--danger" onClick={reiniciarPartida}>Reiniciar Partida</button>
          <button className="btn btn--danger" onClick={() => isAvulso ? encerrarPartidaImediata() : (canEnd && salvarVinculado(true))} disabled={!isAvulso && !canEnd}>Encerrar Partida</button>
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
    <div style={{ position: "relative", width: ICON_SIZE, height: ICON_SIZE, zIndex: 3 }}>
      <img src={team.escudo_url} alt={team.nome} width={ICON_SIZE} height={ICON_SIZE} style={{ objectFit: "contain", display: "block" }} />
    </div>
  ) : (
    <div style={{ position: "relative", width: ICON_SIZE, height: ICON_SIZE }}>
      <TeamIcon team={{ cor1: team.cor1, cor2: team.cor2, cor_detalhe: team.cor_detalhe }} size={ICON_SIZE} title={team.nome} />
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: team.cor_detalhe, textShadow: shadow, pointerEvents: "none" }}>{sigla}</span>
    </div>
  );
}

function ScoreCardPoly({ value, onDec, onInc, bg, textColor, textShadow, side = "A", showControls = true, compact = false }) {
  const clip = side === "A" ? "polygon(0 0, 100% 0, 90% 100%, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%, 10% 100%)";
  return (
    <div style={ui.scoreShell}>
      <div style={{ ...ui.scoreBox, ...(compact ? ui.scoreBoxCompact : null), background: bg, clipPath: clip }}>
        <div style={{ ...ui.scoreValue, ...(compact ? ui.scoreValueCompact : null), color: textColor, textShadow }}>{value}</div>
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
const ScoreCardA = (props) => <ScoreCardPoly side="A" {...props} />;
const ScoreCardB = (props) => <ScoreCardPoly side="B" {...props} />;

/* ===== Styles ===== */
const COL_W   = "clamp(140px, 42vw, 360px)"; // col width
const GAP     = 16;
const ICON_SIZE = 140;

const ui = {
  cardPad: { padding: 14, marginTop: 12 },
  cardPadCenter: { padding: 16, marginTop: 12, textAlign: "center" },
  cardCentered: { padding: 16, marginTop: 12, textAlign: "center" },
  cardCenteredStrong: { padding: 16, marginTop: 12, textAlign: "center", fontWeight: 800 },
  cardPadMt20: { padding: 16, marginTop: 20 },

  avulsoGrid: { gap: 14, flexWrap: "wrap" },
  rowGap8: { gap: 8 },
  rowGap8Mt6: { gap: 8, marginTop: 6 },
  rowCenter8: { gap: 8, justifyContent: "center" },
  rowCenter12: { gap: 12, justifyContent: "center" },
  labelBold: { fontWeight: 900, marginBottom: 8 },
  labelInline: { alignSelf: "center" },
  numSmall: { width: 100 },
  sigla: { width: 80, textTransform: "uppercase", textAlign: "center", fontWeight: 800 },
  mt10: { marginTop: 10 },
  mt14: { marginTop: 14 },

  configRow: { gap: 10, flexWrap: "wrap" },

  boardGrid: { display: "grid", gridTemplateColumns: `repeat(2, ${COL_W})`, gridTemplateRows: "160px auto 6px auto", justifyContent: "center", alignItems: "end", columnGap: 28, rowGap: 0, margin: "-24px auto 16px", width: "100%", maxWidth: `calc(${COL_W} * 2 + 28px)` },
  boardGridMobile: { gridTemplateRows: "130px auto 6px auto", columnGap: 18, margin: "-18px auto 12px" },
  iconCell: { display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: -12, zIndex: 2 },
  iconCellMobile: { marginBottom: -16, transform: "scale(0.85)", transformOrigin: "bottom center" },
  teamNameBar: { width: "100%", boxSizing: "border-box", fontWeight: 900, fontSize: 22, padding: "14px 16px", borderRadius: "16px 16px 0 0", textAlign: "center", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  teamThinBar: { width: "100%", height: 8, borderRadius: 0, margin: 0 },
  scoreCell: { width: COL_W, display: "block" },

  scoreShell:  { width: "100%" },
  scoreBox: { width: "100%", minWidth: "100%", maxWidth: "100%", boxSizing: "border-box", color: "#fff", borderRadius: "0 0 16px 16px", padding: "16px 16px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 10px 22px rgba(0,0,0,.22)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.1))", border: "1px solid rgba(255,255,255,.06)" },
  scoreBoxCompact: { minHeight: 150, padding: "10px 10px" },
  scoreValue: { fontSize: "clamp(72px, 9vw, 128px)", lineHeight: 1, fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' },
  scoreValueCompact: { fontSize: "clamp(64px, 8vw, 112px)" },
  scoreBtnsWrap: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 },

  logoBelowImg: { height: 58, display: "block", margin: "0 auto 0" },
  orangeLineWide: { height: 10, background: "#ff7a00", margin: 0, marginTop: 0 },
  penTitle: { marginBottom: 8, fontWeight: 800, fontSize: 18, color: "#ff7a00" },
  penRow: { justifyContent: "space-around", marginTop: 12 },
  penTeamBox: (bg, fg, br) => ({ background: bg, color: fg, textShadow: getContrastShadow(fg), border: "2px solid", borderColor: br, padding: "8px 12px", borderRadius: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 160, textAlign: "center", fontWeight: 800 }),
  penBtn: { padding: "10px 14px", fontSize: 16, minWidth: 100 },  btnSm: { padding: "8px 10px", fontSize: 14 },

  localGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  btnOrange: { background: "#ff7a00", color: "#fff" },
};
