// v1.2.2.19
// src/pages/Placar.jsx
// Navbar próprio fixo no Placar, cor laranja igual ao global, texto branco e botão voltar à direita
// Editor Avulso com seletor de cores via overlay
// - Bloqueia encerramento durante pênaltis enquanto não finalizado (avulso e vinculado)
// - Botão "Encerrar Partida" desabilita em PEN até penFinished === true
// - Mensagem clara ao tentar encerrar com pênaltis em andamento

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/auth/AuthProvider";
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
  const [timeA, setTimeA] = useState({ id: null, nome: "Time A", abrev: "TMA", escudo_url: null });
  const [timeB, setTimeB] = useState({ id: null, nome: "Time B", abrev: "TMB", escudo_url: null });

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
  const [corA1, setCorA1] = useState("#FB8C00");
  const [corA2, setCorA2] = useState("#ffffff");
  const [corADetalhe, setCorADetalhe] = useState("#000000");
  const [corB1, setCorB1] = useState("#ffffff");
  const [corB2, setCorB2] = useState("#FB8C00");
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

  // ===== Sound FX =====
  const [soundOn, setSoundOn] = useState(() => (localStorage.getItem("placar_sound_on") ?? "1") === "1");
  const [crowdOn, setCrowdOn] = useState(() => (localStorage.getItem("placar_crowd_on") ?? "1") === "1");
  const [soundVol, setSoundVol] = useState(() => Number(localStorage.getItem("placar_sound_vol") ?? 0.6));
  const audioRef = useRef({ ctx: null, unlocked: false, pack: { ready:false } });
  const crowdRef = useRef({ src: null, gain: null, playing: false });

  const ensureCtx = useCallback(() => {
    if (!audioRef.current.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioRef.current.ctx = new Ctx();
    }
    return audioRef.current.ctx;
  }, []);

  const loadBuffer = useCallback(async (url) => {
    try {
      const ctx = ensureCtx(); if (!ctx) return null;
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch { return null; }
  }, [ensureCtx]);

  const tryLoadAdvancedPack = useCallback(async () => {
    const base = "/sfx";
    const tryExts = async (name) => {
      const mp3 = await loadBuffer(`${base}/${name}.mp3`);
      if (mp3) return mp3;
      return await loadBuffer(`${base}/${name}.wav`);
    };
    const [whStart, whEnd, whGoal, crowdLoop, crowdCheer] = await Promise.all([
      tryExts("whistle_start"),
      tryExts("whistle_end"),
      tryExts("whistle_goal"),
      tryExts("crowd_loop"),
      tryExts("crowd_cheer"),
    ]);
    audioRef.current.pack = { ready: !!(whStart||whEnd||whGoal||crowdLoop||crowdCheer), whStart, whEnd, whGoal, crowdLoop, crowdCheer };
  }, [loadBuffer]);

  useEffect(() => {
    const unlock = async () => {
      const ctx = ensureCtx(); if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
      audioRef.current.unlocked = true;
      tryLoadAdvancedPack();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [ensureCtx, tryLoadAdvancedPack]);

  useEffect(() => { localStorage.setItem("placar_sound_on", soundOn ? "1" : "0"); }, [soundOn]);
  useEffect(() => { localStorage.setItem("placar_crowd_on", crowdOn ? "1" : "0"); }, [crowdOn]);
  useEffect(() => { localStorage.setItem("placar_sound_vol", String(soundVol)); }, [soundVol]);

  const playSimple = useCallback((freq = 880, dur = 0.12, type = "sine", vol = 0.25) => {
    if (!soundOn) return; // respeita toggle de Sons de apito
    const ctx = ensureCtx(); if (!ctx) return;
    const t0 = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    const g = Math.max(0, Math.min(1, vol * soundVol));
    gain.gain.setValueAtTime(g || 0.0001, t0);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, g), t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.stop(t0 + dur + 0.02);
  }, [ensureCtx, soundVol, soundOn]);

  const playBuffer = useCallback((buf, vol = 0.3) => {
    const ctx = ensureCtx(); if (!ctx || !buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf; const g = ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1, vol * soundVol));
    src.connect(g).connect(ctx.destination); src.start();
  }, [ensureCtx, soundVol]);

  const sfxClick = useCallback(() => playSimple(820, 0.06, "square", 0.18), [playSimple]);
  const sfxStartSimple = useCallback(() => { playSimple(660, 0.08, "triangle", 0.22); playSimple(990, 0.12, "triangle", 0.18); }, [playSimple]);
  const sfxEndSimple = useCallback(() => { playSimple(740, 0.10, "sawtooth", 0.26); setTimeout(() => playSimple(880, 0.14, "sawtooth", 0.26), 80); }, [playSimple]);
  const sfxFinalSimple = useCallback(() => { playSimple(523, 0.1, "triangle", 0.24); setTimeout(() => playSimple(659, 0.12, "triangle", 0.26), 100); setTimeout(() => playSimple(784, 0.16, "triangle", 0.28), 220); }, [playSimple]);
  const sfxGoalSimple = useCallback(() => { playSimple(392, 0.08, "square", 0.26); setTimeout(() => playSimple(523, 0.1, "square", 0.28), 60); setTimeout(() => playSimple(659, 0.12, "square", 0.30), 140); navigator.vibrate?.(20); }, [playSimple]);

  const sfxWhistleStart = useCallback(() => {
    if (!soundOn) return; const p = audioRef.current.pack;
    if (p.ready && p.whStart) playBuffer(p.whStart, 0.7); else sfxStartSimple();
  }, [playBuffer, sfxStartSimple, soundOn]);
  const sfxWhistleEnd = useCallback(() => {
    if (!soundOn) return; const p = audioRef.current.pack;
    if (p.ready && p.whEnd) playBuffer(p.whEnd, 0.7); else sfxEndSimple();
  }, [playBuffer, sfxEndSimple, soundOn]);
  const sfxWhistleGoal = useCallback(() => {
    if (!soundOn) return; const p = audioRef.current.pack;
    if (p.ready && p.whGoal) playBuffer(p.whGoal, 0.75); else sfxGoalSimple();
  }, [playBuffer, sfxGoalSimple, soundOn]);
  const sfxCrowdCheer = useCallback(() => {
    const p = audioRef.current.pack; if (!crowdOn) return;
    if (p.ready && p.crowdCheer) playBuffer(p.crowdCheer, 0.9);
  }, [playBuffer, crowdOn]);

  const ensureCrowdLoop = useCallback((shouldPlay) => {
    const ctx = ensureCtx(); if (!ctx) return;
    if (!crowdOn) {
      if (crowdRef.current.src) { try { crowdRef.current.src.stop(); } catch {}
      crowdRef.current = { src: null, gain: null, playing: false }; }
      return;
    }
    const p = audioRef.current.pack; const buf = p.crowdLoop;
    if (!buf || !shouldPlay) {
      if (crowdRef.current.src) { try { crowdRef.current.src.stop(); } catch {} }
      crowdRef.current = { src: null, gain: null, playing: false };
      return;
    }
    if (crowdRef.current.playing) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.25 * soundVol;
    src.connect(g).connect(ctx.destination); src.start();
    crowdRef.current = { src, gain: g, playing: true };
  }, [ensureCtx, crowdOn, soundVol]);

  // ===== Crowd loop reactivity & cleanup =====
  useEffect(() => {
    const ativo = rodando && !encerrada && ["1T","2T","PR1","PR2"].includes(fase);
    ensureCrowdLoop(ativo);
  }, [fase, rodando, encerrada, ensureCrowdLoop]);
  useEffect(() => () => { ensureCrowdLoop(false); }, [ensureCrowdLoop]);

  // ===== Helpers Regras =====
  const empateJogo = () => golsA === golsB;
  const isJogoUnico = useMemo(() => (isMataMata && (!camp?.ida_volta || camp?.ida_volta === 0 || camp?.ida_volta === false || camp?.ida_volta === "false")), [isMataMata, camp]);

  function placarAgregado() {
    if (perna !== 2 || !ida) return { a: golsA, b: golsB };
    const idaGA = Number(ida?.gols_time_a ?? 0);
    const idaGB = Number(ida?.gols_time_b ?? 0);
    const idaTA = ida?.time_a_id ?? ida?.id_time_a ?? ida?.clube_a_id;
    const idaTB = ida?.time_b_id ?? ida?.id_time_b ?? ida?.clube_b_id;
    const volTA = timeA?.id; const volTB = timeB?.id;
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

  // ===== Helpers Regras =====
  const enterPenaltis = useCallback((regulares = getQtdPenCamp()) => {
    setQtdPen(regulares);
    setFase("PEN");
    setSegRestantes(0);
    setRodando(false);
    setPenTurn("A");
    setPenAlt(false);
    setPenFinished(false);
  }, [getQtdPenCamp]);

  const startProrrogacao = useCallback(async () => {
    const prDur = Math.max(1, Math.round(getDurProrroCamp() * 60));
    setFase("PR1");
    setSegRestantes(prDur);
    setRodando(false);
    if (!isAvulso && partidaId) {
      try {
        await supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId);
      } catch (e) {}
    }
  }, [getDurProrroCamp, isAvulso, partidaId]);

  const setFaseComDuracao = useCallback((novaFase, { silentStart = false } = {}) => {
    // 1) Se PR1 em jogo vinculado, marca prorrogação no banco
    if (novaFase === "PR1" && !isAvulso && partidaId) {
      (async () => {
        try {
          await supabase.from("partidas").update({ prorrogacao: true }).eq("id", partidaId);
        } catch (e) {}
      })();
    }

    // 2) Calcula a nova duração do período
    const secs =
      (novaFase === "1T" || novaFase === "2T")
        ? getDurTempoCamp() * 60
        : (novaFase === "PR1" || novaFase === "PR2")
          ? getDurProrroCamp() * 60
          : 0;

    // 3) Atualiza o estado para a nova fase, zera o timer e para o relógio
    setFase(novaFase);
    setSegRestantes(secs);
    setRodando(false);

    // 4) Toca apito de início do novo período quando aplicável
    if (!silentStart && (novaFase === "2T" || novaFase === "PR2")) {
      sfxWhistleStart();
    }
  }, [getDurTempoCamp, getDurProrroCamp, isAvulso, partidaId, sfxWhistleStart]);

  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  // ===== Guards =====
  const [canEnd, setCanEnd] = useState(true);
  const canEncerrarPartida = useCallback(() => {
    if (encerrada) return false;
    if (fase === "PEN") return penFinished;
    if (isMataMata) {
      if (isJogoUnico) {
        if (golsA === golsB) return false;
      } else if (perna === 2) {
        // Se a ida ainda não foi carregada (estado inicial), não bloqueie encerrar
        if (!ida && chaveId) return true;
        const agg = placarAgregado();
        if (agg.a === agg.b) return false;
      }
      if (fase === "PR1") return false;
      if (fase === "PR2" && perna === 2) {
        if (!ida && chaveId) return true;
        const agg2 = placarAgregado();
        if (agg2.a === agg2.b) return false;
      }
    }
    return true;
  }, [encerrada, fase, isMataMata, isJogoUnico, golsA, golsB, penFinished, perna, ida, chaveId]);

  useEffect(() => {
    try { setCanEnd(canEncerrarPartida()); } catch { setCanEnd(true); }
  }, [encerrada, fase, isMataMata, penFinished, golsA, golsB, penA, penB, penAMiss, penBMiss, perna, camp, ida, chaveId, canEncerrarPartida]);

  // ===== Carregamento =====
  useEffect(() => {
    if (!isAvulso && authLoading) return;
    if (isAvulso) {
      const tempoMin = 10;
      setGolsA(0); setGolsB(0); resetPenalties();
      setCorA1("#FB8C00"); setCorA2("#ffffff"); setCorADetalhe("#000000");
      setCorB1("#FB8C00"); setCorB2("#ffffff"); setCorBDetalhe("#000000");
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
      const pr = !!c?.prorrogacao; const prMin = c?.duracao_prorrogacao ?? 5; const qpen = c?.qtd_penaltis ?? 5;
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
        const A = byId.get(p.time_a_id); const B = byId.get(p.time_b_id);
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
      if (!("wakeLock" in navigator)) return;
      if (wakeLockRef.current) return;
      const wl = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wl; setWakeLockActive(true);
      wl.addEventListener?.("release", () => { wakeLockRef.current = null; setWakeLockActive(false); });
    } catch (err) {
      if (document.visibilityState === "visible") showToast("ℹ️ Seu dispositivo pode não permitir manter a tela ativa.");
    }
  }, [showToast]);
  const releaseWakeLock = useCallback(() => { try { wakeLockRef.current?.release?.(); } catch {} wakeLockRef.current = null; setWakeLockActive(false); }, []);
  useEffect(() => {
    requestWakeLock();
    const onVis = () => { if (document.visibilityState === "visible" && !wakeLockRef.current) requestWakeLock(); };
    const onOrient = () => { if (!wakeLockRef.current) requestWakeLock(); };
    document.addEventListener("visibilitychange", onVis);
    screen.orientation?.addEventListener?.("change", onOrient);
    window.addEventListener("orientationchange", onOrient);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      screen.orientation?.removeEventListener?.("change", onOrient);
      window.removeEventListener("orientationchange", onOrient);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // ===== Timer & Transições =====
  const onTick = useCallback(() => {
    setSegRestantes((s) => {
      if (s <= 1) {
        window.clearInterval(intervalRef.current);
        setRodando(false);
        if (fase === "1T" && !encerrada) {
          showToast("⏱️ Fim do 1º tempo!"); sfxWhistleEnd(); setFaseComDuracao("2T", { silentStart: true }); return getDurTempoCamp()*60;
        }
        if (fase === "2T" && !encerrada) {
          if (isMataMata && precisaDesempateApos2T()) {
            sfxWhistleEnd();
            if (camp?.prorrogacao) { showToast("⏱️ Fim do 2º tempo! Prorrogação iniciada."); startProrrogacao(); }
            else { showToast("⏱️ Fim do 2º tempo! Vamos aos pênaltis."); enterPenaltis(getQtdPenCamp()); }
          } else {
            sfxFinalSimple(); setEncerrada(true); ensureCrowdLoop(false); if (!isAvulso) salvarVinculado(true);
          }
        }
        if (fase === "PR1" && !encerrada) { showToast("⏱️ Fim da 1ª prorrogação!"); sfxWhistleEnd(); setFaseComDuracao("PR2", { silentStart: true }); return getDurProrroCamp()*60; }
        if (fase === "PR2" && !encerrada) {
          showToast("⏱️ Fim da 2ª prorrogação!"); sfxWhistleEnd();
          if (isAvulso) { if (golsA === golsB) enterPenaltis(getQtdPenCamp()); }
          else if (isMataMata) { const agg = placarAgregado(); if (agg.a === agg.b) enterPenaltis(getQtdPenCamp()); }
        }
        return 0;
      }
      return Math.max(0, s - 1);
    });
  }, [fase, encerrada, isMataMata, camp, isAvulso, golsA, golsB, setFaseComDuracao, startProrrogacao, enterPenaltis, sfxWhistleEnd, sfxFinalSimple, ensureCrowdLoop, getDurTempoCamp, getDurProrroCamp, getQtdPenCamp]);

  useEffect(() => {
    if (!rodando) { window.clearInterval(intervalRef.current); return; }
    intervalRef.current = window.setInterval(onTick, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [rodando, onTick]);

  // ===== Auto-encerrar em pontos corridos e avulso =====
  useEffect(() => {
    if (!rodando && segRestantes === 0) {
      if (isAvulso && fase === "2T" && !encerrada) {
        if (golsA === golsB) {
          if (desempate === "prorrogacao") { showToast("⏱️ Fim do 2º tempo! Prorrogação iniciada."); sfxWhistleEnd(); startProrrogacao(); return; }
          if (desempate === "penaltis") { showToast("⏱️ Fim do 2º tempo! Vamos aos pênaltis."); sfxWhistleEnd(); enterPenaltis(getQtdPenCamp()); return; }
          setEncerrada(true); showToast("🏁 Amistoso encerrado (empate)."); sfxFinalSimple(); return;
        }
        setEncerrada(true); showToast("🏁 Amistoso encerrado."); sfxFinalSimple(); return;
      }
      if (!isMataMata && fase === "2T" && !encerrada && !autoEndRef.current) {
        autoEndRef.current = true; showToast("🏁 Partida encerrada (pontos corridos)"); sfxFinalSimple(); salvarVinculado(true);
      }
    }
    if (segRestantes > 0) autoEndRef.current = false;
  }, [segRestantes, rodando, fase, isMataMata, encerrada, isAvulso, desempate, golsA, golsB, sfxWhistleEnd, sfxFinalSimple, startProrrogacao, enterPenaltis, getQtdPenCamp]);

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
    if (encerrar) { setEncerrada(true); setRodando(false); setSegRestantes(0); setPenFinished(true); sfxWhistleEnd(); showToast("✅ Partida encerrada e salva!"); }
    else { showToast("✅ Parciais salvas!"); sfxClick(); }
  }

  async function salvarLocalHorario() {
    if (isAvulso || !partidaId) { showToast("⏺️ Local/Data atualizados (modo avulso)"); sfxClick(); return; }
    const payload = { local: local || null, data_hora: dataHora ? toLocalISOString(dataHora) : null };
    const { error } = await supabase.from("partidas").update(payload).eq("id", partidaId);
    if (error) { showToast("❌ Erro ao salvar Local/Data"); return; }
    showToast("✅ Local e Data/Hora salvos!"); sfxClick();
  }

  async function reiniciarPartida() {
    // Avulso: apenas reseta o estado local
    if (isAvulso || !partidaId) {
      setGolsA(0); setGolsB(0);
      resetPenalties();
      setFase("1T");
      setSegRestantes(getDurTempoCamp()*60);
      setRodando(false);
      setEncerrada(false);
      showToast("🔄 Partida reiniciada");
      sfxClick();
      return;
    }

    // Vinculado: chama apenas a função do banco e NÃO faz nenhuma outra ação de banco
    try {
      const { error } = await supabase.rpc('reabrir_partida', { p_partida_id: partidaId });
      if (error) { showToast("❌ Erro ao reabrir partida"); return; }
      // Atualiza somente o estado local; sem updates adicionais no banco
      setGolsA(0); setGolsB(0);
      resetPenalties();
      setFase("1T");
      setSegRestantes(getDurTempoCamp()*60);
      setRodando(false);
      setEncerrada(false);
      showToast("✅ Partida reaberta");
      sfxClick();
    } catch (e) {
      showToast("❌ Erro ao reabrir partida");
    }
  }

  function labelFaseAmigavel(f) {
    switch (f) { case "1T": return "1º tempo"; case "2T": return "2º tempo"; case "PR1": return "1ª prorrogação"; case "PR2": return "2ª prorrogação"; case "PEN": return "pênaltis"; default: return f || ""; }
  }

  function encerrarPeriodo(perguntar = true) {
    if (DEBUG) console.log('[periodo] encerrar', { fase });
    if (perguntar) { const ok = confirm(`Confirma encerrar ${labelFaseAmigavel(fase)}?`); if (!ok) return; }
    setRodando(false); sfxWhistleEnd(); ensureCrowdLoop(false);
    if (fase === "1T") { setFaseComDuracao("2T", { silentStart: true }); return; }
    if (fase === "2T") {
      if (isAvulso) {
        if (golsA === golsB) {
          if (desempate === "prorrogacao") { setFaseComDuracao("PR1", { silentStart: true }); return; }
          if (desempate === "penaltis") { setFase("PEN"); return; }
          setEncerrada(true); showToast("🏁 Amistoso encerrado (empate)."); return;
        }
        setEncerrada(true); showToast("🏁 Amistoso encerrado."); return;
      }
      if (!isMataMata) { salvarVinculado(true); return; }
      if (precisaDesempateApos2T()) {
        if (camp?.prorrogacao) { showToast("⏱️ Fim do 2º tempo! Vamos para a prorrogação."); setFaseComDuracao("PR1", { silentStart: true }); return; }
        showToast("⏱️ Fim do 2º tempo! Vamos para os pênaltis."); enterPenaltis(getQtdPenCamp()); return;
      }
      salvarVinculado(true); return;
    }
    if (fase === "PR1") { setFaseComDuracao("PR2", { silentStart: true }); return; }
    if (fase === "PR2") {
      if (isAvulso) {
        if (golsA === golsB) { showToast("⏱️ Prorrogação encerrada. Vamos aos pênaltis."); enterPenaltis(getQtdPenCamp()); return; }
        setEncerrada(true); setRodando(false); sfxWhistleEnd(); setSegRestantes(0); showToast("🏁 Partida encerrada (avulso)."); return;
      }
      if (isMataMata) { const agg = placarAgregado(); if (agg.a === agg.b) { enterPenaltis(getQtdPenCamp()); return; } }
      salvarVinculado(true); return;
    }
  }

  function encerrarPartidaImediata() {
    // BLOQUEIO: não permite encerrar se pênaltis estão em andamento e ainda não finalizaram
    if (fase === "PEN" && !penFinished) {
      showToast("⚠️ Pênaltis em andamento. Conclua a série (ou as alternadas) para encerrar.");
      sfxClick();
      return;
    }
    window.clearInterval(intervalRef.current);
    setRodando(false); setEncerrada(true); setSegRestantes(0); setPenFinished(true); setShowAvulsoEdit(false); sfxWhistleEnd(); showToast("🏁 Partida encerrada (avulso).");
  }

  function resetPeriodo() {
    const secs = (fase === "1T" || fase === "2T") ? getDurTempoCamp()*60 : getDurProrroCamp()*60;
    setSegRestantes(secs); setRodando(false); sfxClick();
  }

  function resetPenalties() {
  setPenA(0); setPenB(0);
  setPenAMiss(0); setPenBMiss(0);
  setPenTurn("A");
  setPenAlt(false);
  setPenFinished(false);
}

function finalizarPartidaPenaltis(snapshot) {
  // Só encerra se houver vencedor. Se estiver empatado, força alternadas.
  const a = penA; const b = penB;
  if (a === b) {
    setPenFinished(false);
    setPenAlt(true);
    setPenTurn('A');
    showToast('⚠️ Empate nos pênaltis. Iniciando alternadas.');
    return;
  }
  setPenFinished(true);
  setEncerrada(true);
  sfxWhistleEnd();
  if (!isAvulso) salvarVinculado(true, snapshot || {});
}

// Finaliza automaticamente quando a série de pênaltis termina
useEffect(() => {
  if (penFinished && !encerrada) {
    finalizarPartidaPenaltis();
  }
}, [penFinished, encerrada]);

// Watchdog: se por qualquer razão penFinished ficar true com empate, retoma alternadas
useEffect(() => {
  if (fase === 'PEN' && !encerrada && penFinished && penA === penB) {
    setPenFinished(false);
    setPenAlt(true);
    setPenTurn('A');
  }
}, [fase, encerrada, penFinished, penA, penB]);

function registrarPenalti(team, convertido) {
  if (penFinished || encerrada) return;
  if (team !== penTurn) return;

  // calcula incrementos e aplica atualização local
  const incA = team === 'A' && convertido ? 1 : 0;
  const incB = team === 'B' && convertido ? 1 : 0;

  if (team === 'A') {
    convertido ? setPenA(v => v + 1) : setPenAMiss(v => v + 1);
  } else {
    convertido ? setPenB(v => v + 1) : setPenBMiss(v => v + 1);
  }

  // valores após esta cobrança
  const nextA = penA + incA;
  const nextB = penB + incB;

  const aTaken = penA + penAMiss + (team === 'A' ? 1 : 0);
  const bTaken = penB + penBMiss + (team === 'B' ? 1 : 0);

  if (!penAlt) {
    const remA = qtdPen - aTaken;
    const remB = qtdPen - bTaken;
    // vitória antecipada ainda na série regular
    if ((nextA - penB) > remB || (nextB - penA) > remA) { setPenFinished(true); return; }
    // fim da série regular
    if (aTaken >= qtdPen && bTaken >= qtdPen) {
      if (nextA !== nextB) { setPenFinished(true); return; }
      // empate: alternadas
      setPenAlt(true);
      setPenTurn('A');
      return;
    }
  } else {
    // alternadas: após cada par (A e B), checar diferença
    if (aTaken === bTaken && nextA !== nextB) { setPenFinished(true); return; }
  }

  // alterna vez
  setPenTurn(prev => (prev === 'A' ? 'B' : 'A'));
}

  // ===== Render =====
  const tevePenaltis = (penA + penB + penAMiss + penBMiss) > 0;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCfg, setPickerCfg] = useState({ team: 'A', slot: 'cor1', label: '', value: '#ffffff' });

  const openColorPicker = (team, slot, label, value) => {
    setPickerCfg({ team, slot, label, value });
    setPickerOpen(true);
  };
  const applyPickedColor = (hex) => {
    if (pickerCfg.team === 'A') {
      if (pickerCfg.slot === 'cor1') setCorA1(hex);
      else if (pickerCfg.slot === 'cor2') setCorA2(hex);
      else setCorADetalhe(hex);
    } else {
      if (pickerCfg.slot === 'cor1') setCorB1(hex);
      else if (pickerCfg.slot === 'cor2') setCorB2(hex);
      else setCorBDetalhe(hex);
    }
    setPickerOpen(false);
  };

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-placar-nav-override','1');
    // Esconde QUALQUER header global, exceto o que tiver nosso atributo
    styleEl.innerHTML = `
      body.aa-hide-global-navbar header:not([data-placar-nav]) {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    document.body.classList.add('aa-hide-global-navbar');
    return () => {
      document.body.classList.remove('aa-hide-global-navbar');
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div className="container">
      {/* Navbar próprio do Placar */}
      <header data-placar-nav style={ui.navFixed}>
        <div style={ui.navInner}>
          <div style={ui.navSide} onClick={() => navigate('/')} role="button" aria-label="Ir para a Home">
            <img src={logo} alt="AureoArtes" style={ui.navLogo} />
          </div>
          <div style={ui.navCenter}>
            <span style={ui.navTitle}>{isAvulso ? 'Amistoso' : (camp?.nome || 'Campeonato')}</span>
          </div>
          <div style={{ ...ui.navSide, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => navigate(-1)} aria-label="Voltar" style={ui.navBackBtn}>
              ←
            </button>
            {isAvulso && (
              <button className="btn" onClick={() => setShowAvulsoEdit(v => !v)} aria-label="Editar amistoso" style={ui.navBackBtn}>✎</button>
            )}
          </div>
        </div>
      </header>

      {/* Spacer para não sobrepor o conteúdo */}
      <div style={ui.navSpacer} />

      {/* Editor Avulso */}
      {isAvulso && showAvulsoEdit && (
        <div className="card" style={{ ...ui.cardPadMt20, ...ui.cardFullWidth }}>
          <div className="row" style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div className="row" style={{ gap: 8, alignItems:'center' }}>
              <label className="label">Duração de cada tempo (min.)</label>
              <input type="number" className="input" min={1} max={45} value={durTempo} onChange={e => { const v = Math.max(1, Number(e.target.value)||10); setDurTempo(v); if ((fase === "1T" || fase === "2T") && !rodando) setSegRestantes(v * 60); }} style={{ maxWidth: 100 }} />
            </div>
            <div className="row" style={{ gap: 8, alignItems:'center' }}>
              <label className="label">Desempate</label>
              <select className="input" value={desempate} onChange={e => setDesempate(e.target.value)} style={{ maxWidth: 200 }}>
                <option value="amistoso">Amistoso (pode empatar)</option>
                <option value="prorrogacao">Prorrogação e Penaltis</option>
                <option value="penaltis">Somente Pênaltis</option>
              </select>
            </div>
            <div className="row" style={{ gap: 8, alignItems:'center' }}>
              <label className="label">Prorrogação (min.)</label>
              <input type="number" className="input" min={1} max={15} value={durProrro} onChange={e => { const v = Math.max(1, Number(e.target.value)||5); setDurProrro(v); if ((fase === "PR1" || fase === "PR2") && !rodando) setSegRestantes(v * 60); }} style={{ maxWidth: 100 }} />
            </div>
            <div className="row" style={{ gap: 8, alignItems:'center' }}>
              <label className="label">Pênaltis regulares</label>
              <input type="number" className="input" min={1} max={5} value={qtdPen} onChange={e => setQtdPen(Math.max(1, Number(e.target.value)||5))} style={{ maxWidth: 100 }} />
            </div>
          </div>
          {/* Espaço entre seções */}
          <div style={{ height: 16 }} />

          <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="label">Time A</label>
              <input type="text" className="input" value={timeA.nome} maxLength={20} onChange={e => setTimeA(t => ({ ...t, nome: e.target.value }))} />
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <label className="label">Sigla</label>
                <input type="text" className="input" style={{ maxWidth: 100 }} value={timeA.abrev} maxLength={5} onChange={e => setTimeA(t => ({ ...t, abrev: e.target.value }))} />
              </div>
              <div className="row" style={ui.colorRow}>
                <label className="label">Cores</label>
                <button type="button" aria-label="Cor 1 A"
                  style={ui.colorDot(corA1)}
                  onClick={() => openColorPicker('A','cor1','Cor 1', corA1)} />
                <button type="button" aria-label="Cor 2 A"
                  style={ui.colorDot(corA2)}
                  onClick={() => openColorPicker('A','cor2','Cor 2', corA2)} />
                <button type="button" aria-label="Cor Detalhe A"
                  style={ui.colorDot(corADetalhe)}
                  onClick={() => openColorPicker('A','detalhe','Cor Detalhe', corADetalhe)} />
              </div>
            </div>
            <div>
              <label className="label">Time B</label>
              <input type="text" className="input" value={timeB.nome} maxLength={20} onChange={e => setTimeB(t => ({ ...t, nome: e.target.value }))} />
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <label className="label">Sigla</label>
                <input type="text" className="input" style={{ maxWidth: 100 }} value={timeB.abrev} maxLength={5} onChange={e => setTimeB(t => ({ ...t, abrev: e.target.value }))} />
              </div>
              <div className="row" style={ui.colorRow}>
                <label className="label">Cores</label>
                <button type="button" aria-label="Cor 1 B"
                  style={ui.colorDot(corB1)}
                  onClick={() => openColorPicker('B','cor1','Cor 1', corB1)} />
                <button type="button" aria-label="Cor 2 B"
                  style={ui.colorDot(corB2)}
                  onClick={() => openColorPicker('B','cor2','Cor 2', corB2)} />
                <button type="button" aria-label="Cor Detalhe B"
                  style={ui.colorDot(corBDetalhe)}
                  onClick={() => openColorPicker('B','detalhe','Cor Detalhe', corBDetalhe)} />
              </div>
            </div>
          </div>

          {/* Overlay Color Picker */}
          {pickerOpen && (
            <div style={ui.overlay} onClick={() => setPickerOpen(false)}>
              <div style={ui.modal} onClick={(e) => e.stopPropagation()}>
                <div className="row" style={{ justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
                  <div className="label" style={{ fontWeight: 900 }}>
                    Time - {pickerCfg.team}
                  </div>
                  <button className="btn btn--orange" onClick={() => setPickerOpen(false)}>Fechar</button>
                </div>
                <ColorSwatchSelect
                  label={pickerCfg.label}
                  value={pickerCfg.value}
                  onChange={applyPickedColor}
                />
              </div>
            </div>
          )}

          <div className="row" style={{ ...ui.rowCenter12, marginTop: 12 }}>
            <button className="btn btn--orange" onClick={() => setShowAvulsoEdit(false)}>Fechar edição</button>
          </div>
        </div>
      )}

      {/* Times + Placar */}
      <div style={{ ...ui.boardGrid, ...(isMobilePortrait ? ui.boardGridMobile : null) }}>
        {(isMataMata && perna === 2) && (
          <div style={ui.aggregateBox}>
            <div style={ui.aggregateTitle}>Agregado</div>
            <div style={ui.aggregateScore}>
              ({placarAgregado().a}x{placarAgregado().b})
            </div>
          </div>
        )}
        <div style={{ ...ui.iconCell, ...(isMobilePortrait ? ui.iconCellMobile : null) }}>{renderTeamIcon(withColors(timeA, corA1, corA2, corADetalhe))}</div>
        <div style={{ ...ui.iconCell, ...(isMobilePortrait ? ui.iconCellMobile : null) }}>{renderTeamIcon(withColors(timeB, corB1, corB2, corBDetalhe))}</div>
        <div style={{ ...ui.teamNameBar, background: corA1, color: corADetalhe, textShadow: getContrastShadow(corADetalhe) }}>{timeA.nome}</div>
        <div style={{ ...ui.teamNameBar, background: corB1, color: corBDetalhe, textShadow: getContrastShadow(corBDetalhe) }}>{timeB.nome}</div>
        <div style={{ ...ui.teamThinBar, background: corA2 }} />
        <div style={{ ...ui.teamThinBar, background: corB2 }} />
        <div style={ui.scoreCell}><ScoreCardA value={golsA} onDec={() => { setGolsA(v => Math.max(0, v - 1)); sfxClick(); }} onInc={() => { setGolsA(v => v + 1); sfxWhistleGoal(); sfxCrowdCheer(); }} bg={corA1} textColor={corADetalhe} textShadow={getContrastShadow(corADetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait} /></div>
        <div style={ui.scoreCell}><ScoreCardB value={golsB} onDec={() => { setGolsB(v => Math.max(0, v - 1)); sfxClick(); }} onInc={() => { setGolsB(v => v + 1); sfxWhistleGoal(); sfxCrowdCheer(); }} bg={corB1} textColor={corBDetalhe} textShadow={getContrastShadow(corBDetalhe)} showControls={!encerrada && fase !== 'PEN'} compact={isMobilePortrait} /></div>
      </div>

      <div style={{ marginTop: isMobilePortrait ? -40 : -60 }}>
        <img src={logo} alt="AureoArtes" style={{ ...ui.logoBelowImg, ...(isMobilePortrait ? { height: 40 } : null) }} />
      </div>
      <div style={ui.orangeLineWide} />
      <div className="placar-timer" style={{ marginBottom: 12 }}><div className="placar-timer__value">{fmt(segRestantes)}</div></div>
     
      {toastMsg && (<div className={`placar-toast ${isMobilePortrait ? "placar-toast--top" : ""}`}>{toastMsg}</div>)}

      {/* ===== Seção Períodos ===== */}
      {!encerrada && fase !== "PEN" && (
        <div className="card" style={{...ui.cardCentered, ...ui.cardFullWidth}}>
          <div className={`placar-period${isMobilePortrait ? " placar-period--sm" : ""}`}>{labelFaseAmigavel(fase)}</div>
          <div className="row" style={ui.rowCenter8}>
            {!rodando ? (
              <button className="btn btn--primary" onClick={() => { setShowAvulsoEdit(false); setRodando(true); sfxWhistleStart(); ensureCrowdLoop(true); }} style={isMobilePortrait ? ui.btnSm : undefined}>Iniciar</button>
            ) : (
              <button className="btn btn--primary" onClick={() => { setRodando(false); sfxEndSimple(); ensureCrowdLoop(false); }} style={isMobilePortrait ? ui.btnSm : undefined}>Pausar</button>
            )}
            <button className="btn btn--muted" onClick={resetPeriodo} style={isMobilePortrait ? ui.btnSm : undefined}>{isMobilePortrait ? "Reiniciar" : "Reiniciar período"}</button>
            <button className="btn btn--muted" onClick={() => encerrarPeriodo(true)} style={isMobilePortrait ? ui.btnSm : undefined}>{isMobilePortrait ? "Encerrar" : "Encerrar período"}</button>
          </div>
        </div>
      )}
      {/* Espaço entre seções */}
      {!encerrada && fase !== "PEN" && (<div style={{ height: 4 }} />)}
            
      {/* ===== Seção Penaltis ===== */}
      {(fase === "PEN" || (encerrada && tevePenaltis)) && (
        <div className="card" style={{ ...ui.cardPadCenter, ...ui.cardFullWidth }}>
          <div style={ui.penTitle}>
            {penAlt ? "Pênaltis — Cobranças alternadas" : `Pênaltis — Cobranças regulares ${qtdPen}`}
          </div>

          <div className="row" style={ui.rowCenter12}>
            <div style={ui.penTeamBox(corA1, corADetalhe, corA2)}>
              <div>{timeA.nome}</div>
              <div style={ui.penScoreLine}>⚽ {penA} • ❌ {penAMiss}</div>
            </div>
            <div style={ui.penTeamBox(corB1, corBDetalhe, corB2)}>
              <div>{timeB.nome}</div>
              <div style={ui.penScoreLine}>⚽ {penB} • ❌ {penBMiss}</div>
            </div>
          </div>

          {!penFinished && !encerrada && (
            <>
              <div className="row" style={{ ...ui.rowCenter12, marginTop: 10 }}>
                <div className="badge">Vez: {penTurn === "A" ? timeA.nome : timeB.nome}</div>
              </div>
              <div className="row" style={{ ...ui.rowCenter12, marginTop: 8 }}>
                <button
                  className="btn btn--primary"
                  style={ui.penBtn}
                  onClick={() => registrarPenalti(penTurn, true)}
                >
                  ⚽ Gol
                </button>
                <button
                  className="btn btn--muted"
                  style={ui.penBtn}
                  onClick={() => registrarPenalti(penTurn, false)}
                >
                  ❌ Errou
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {/* Espaço entre seções */}
      {(fase === "PEN" || (encerrada && tevePenaltis)) && (<div style={{ height: 4 }} />)}
      {/* ===== Seção Partida Encerrada ===== */}
      {encerrada && (<div className="card" style={{...ui.cardCenteredStrong, ...ui.cardFullWidth}}>Partida Encerrada</div>)}
      {/* Espaço entre seções */}
      {encerrada && (<div style={{ height: 4 }} />)}
      {/* ===== Seção inferior: Local/Data + Toggles + Ações ===== */}
      <div className="card" style={{ ...ui.cardPadMt20, ...ui.cardFullWidth, marginTop: 16 }}>
        <div className="row" style={ui.localGrid}>
          <input type="text" className="input" placeholder="Local" value={local} onChange={e => setLocal(e.target.value)} />
          <input type="datetime-local" className="input" value={dataHora} onChange={e => setDataHora(e.target.value)} />
        </div>
        
        <div className="row" style={ui.rowCenter12}>
          {!isAvulso && (<button className="btn" style={ui.btnOrange} onClick={salvarLocalHorario}>Salvar Local</button>)}
          <button className="btn btn--danger" onClick={reiniciarPartida}>Reiniciar Partida</button>
          <button className="btn btn--danger" onClick={() => isAvulso ? encerrarPartidaImediata() : (canEnd && salvarVinculado(true))} disabled={(fase === "PEN" && !penFinished) || (!isAvulso && !canEnd)}>Encerrar Partida</button>
          <button className="btn btn--muted" onClick={() => navigate(-1)}>Voltar</button>
        </div>

        <div className="row" style={{ ...ui.rowCenter12, flexWrap: 'wrap', marginBottom: 8 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} /> Sons de apito
          </label>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={crowdOn} onChange={(e) => setCrowdOn(e.target.checked)} /> Torcida (ambiente)
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="label">Volume:</span>
            <input type="range" min={0} max={1} step={0.05} value={soundVol} onChange={(e) => setSoundVol(Number(e.target.value))} style={{ width: 160 }} />
          </div>
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
const COL_W   = "clamp(140px, 42vw, 360px)";
const GAP     = 16;
const ICON_SIZE = 140;
const NAV_H = 56;

const ui = {
  cardFullWidth: { maxWidth: `calc(${COL_W} * 2 + 28px)`, margin: "0 auto" },
  cardPad: { padding: 14, marginTop: 12 },
  cardPadCenter: { padding: 16, marginTop: 12, textAlign: "center" },
  cardCentered: { padding: 16, marginTop: 12, textAlign: "center" },
  cardCenteredStrong: { padding: 16, marginTop: 12, textAlign: "center", fontWeight: 800 },
  cardPadMt20: { padding: 16, marginTop: 20 },

  avulsoGrid: { gap: 14, flexWrap: "wrap" },
  rowGap8: { gap: 8 },
  rowCenter8: { gap: 8, justifyContent: "center" },
  rowCenter12: { gap: 12, justifyContent: "center" },
  labelBold: { fontWeight: 900, marginBottom: 8 },
  labelInline: { alignSelf: "center" },
  numSmall: { width: 100 },
  sigla: { width: 80, textTransform: "uppercase", textAlign: "center", fontWeight: 800 },
  mt10: { marginTop: 10 },
  mt14: { marginTop: 14 },
  boardGrid: { display: "grid", gridTemplateColumns: `repeat(2, ${COL_W})`, gridTemplateRows: "160px auto 6px auto", justifyContent: "center", alignItems: "end", columnGap: 28, rowGap: 0, margin: "-24px auto 16px", width: "100%", maxWidth: `calc(${COL_W} * 2 + 28px)`, position: "relative" },
  boardGridMobile: { gridTemplateRows: "130px auto 6px auto", columnGap: 18, margin: "-18px auto 12px" },
  iconCell: { display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: -12, zIndex: 2 },
  iconCellMobile: { marginBottom: -16, transform: "scale(0.85)", transformOrigin: "bottom center" },
  teamNameBar: { width: "100%", boxSizing: "border-box", fontWeight: 900, fontSize: 22, padding: "14px 16px", borderRadius: "16px 16px 0 0", textAlign: "center", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  teamThinBar: { width: "100%", height: 8 },
  scoreCell: { width: COL_W, display: "block" },
  scoreShell:  { width: "100%" },
  scoreBox: { width: "100%", minWidth: "100%", maxWidth: "100%", boxSizing: "border-box", color: "#fff", borderRadius: "0 0 16px 16px", padding: "16px 16px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), 0 10px 22px rgba(0,0,0,.22)", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.1))", border: "1px solid rgba(255,255,255,.06)" },
  scoreBoxCompact: { minHeight: 150, padding: "10px 10px" },
  scoreValue: { fontSize: "clamp(72px, 9vw, 128px)", lineHeight: 1, fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' },
  scoreValueCompact: { fontSize: "clamp(64px, 8vw, 112px)" },
  scoreBtnsWrap: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8 },
  logoBelowImg: { height: 58, display: "block", margin: "0 auto 0" },
  orangeLineWide: { height: 10, background: "#ff7a00", width: "100%", maxWidth: `calc(${COL_W} * 2 + 28px)`, margin: "0 auto" },
  penTitle: { marginBottom: 8, fontWeight: 800, fontSize: 18, color: "#ff7a00" },
  penTeamBox: (bg, fg, br) => ({
    background: bg,
    color: fg,
    textShadow: getContrastShadow(fg),
    border: "2px solid",
    borderColor: br,
    padding: "8px 12px",
    borderRadius: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 160,
    textAlign: "center",
    fontWeight: 800,
  }),
  penBtn: { padding: "10px 14px", fontSize: 16, minWidth: 100 },
  penScoreLine: { fontWeight: 800, marginTop: 4 },
  localGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  btnOrange: { background: "#ff7a00", color: "#fff" },
  iconCellSpacer: {},
  aggregateBox: {
    position: "absolute",
    top: "15%",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "6px 10px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 4px 14px rgba(0,0,0,.12)",
    border: "1px solid #ffd6ad",
    zIndex: 4
  },
  aggregateTitle: {
    fontSize:  `calc(${COL_W} / 22)`,
    lineHeight: 1,
    fontWeight: 800,
    color: "#ff7a00",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  aggregateScore: {
    fontSize: `calc(${COL_W} / 12)`,
    lineHeight: 1.1,
    fontWeight: 900
  },
  navFixed: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: 'linear-gradient(90deg, #ff6a00, #ff7e2d)',
    boxShadow: '0 8px 20px rgba(0,0,0,.15)',
    borderBottom: '1px solid rgba(0,0,0,.06)',
  },
  navInner: {
    display: 'grid',
    gridTemplateColumns: '56px 1fr 80px',
    alignItems: 'center',
    gap: 8,
    maxWidth: `calc(${COL_W} * 2 + 28px)`,
    margin: '0 auto',
    height: NAV_H,
    padding: '0 8px',
  },
  navSide: { display:'flex', alignItems:'center', height:'100%', padding:'0 6px' },
  navLogo: { height: 40, display:'block', cursor:'pointer', borderRadius: 12,  background: "rgba(255,255,255,0.95)", padding: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
  navCenter: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
  navTitle: { fontWeight: 900, fontSize: 18, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:'#fff' },
  navSpacer: { height: NAV_H + 2 },
  navBackBtn: { marginRight: 6, background: '#f3f4f6', color:'#FB8C00', fontSize:20, lineHeight:1, border:'none', cursor:'pointer' },
  
  // Cores A/B editor
    colorRow: { gap: 8, alignItems:'center', marginTop: 10 },
    colorDot: (hex) => ({
      width: 28, height: 28, borderRadius: '50%',
      background: hex, border: '2px solid rgba(0,0,0,.15)',
      boxShadow: '0 1px 2px rgba(0,0,0,.08)', cursor: 'pointer'
    }),

    // Overlay modal para color picker
    overlay: {
      position:'fixed', inset: 0, background:'rgba(0,0,0,.35)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding: 16, zIndex: 1100
    },
    modal: {
      width: 'min(280px, 92vw)', background:'#fff',
      borderRadius: 14, padding: 14,
      boxShadow: '0 18px 40px rgba(0,0,0,.25)',
      border:'1px solid rgba(0,0,0,.06)'
    },


};
