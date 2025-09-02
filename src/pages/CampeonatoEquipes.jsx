// src/pages/CampeonatoEquipes.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

/* =========================
   Helpers gerais / util
   ========================= */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function novaChaveId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "chave-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function etapaFromCount(n) {
  if (n === 2) return "final";
  if (n === 4) return "semifinal";
  if (n === 8) return "quartas";
  if (n === 16) return "oitavas";
  return "eliminatorias";
}
function grupoIndexToChar(idx) {
  if (!idx || Number.isNaN(idx)) return "";
  return String.fromCharCode(64 + Number(idx)); // 1->A, 2->B...
}
function grupoCharToIndex(ch) {
  if (!ch) return null;
  const u = String(ch).trim().toUpperCase();
  const code = u.charCodeAt(0) - 64;
  return code > 0 && code < 27 ? code : null;
}
function labelFormato(v) {
  if (v === "pontos_corridos") return "Pontos Corridos";
  if (v === "grupos") return "Grupos";
  if (v === "mata_mata") return "Mata-mata";
  return v;
}

/* =========================
   Geradores de confrontos
   ========================= */

// 1) Pontos Corridos — round-robin, NUNCA mata-mata
function gerarPontosCorridos(teamIds, idaVolta) {
  const ids = [...teamIds];
  let bye = null;
  if (ids.length % 2 === 1) {
    bye = "BYE";
    ids.push(bye);
  }
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];

  const calendario = [];
  for (let r = 0; r < rounds; r++) {
    const rodada = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== bye && away !== bye) {
        rodada.push({
          a: home,
          b: away,
          rodada: r + 1,
          is_mata_mata: false,
          etapa: "pontos_corridos",
          perna: null,
          chave_id: null,
          grupo: null,
        });
      }
    }
    calendario.push(rodada);

    // rotação (método do círculo)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, n - 1, fixed, ...rest);
  }

  const partidas = calendario.flat();

  if (idaVolta) {
    const partidasVolta = partidas.map((p) => ({
      a: p.b,
      b: p.a,
      rodada: p.rodada + rounds,
      is_mata_mata: false,
      etapa: "pontos_corridos",
      perna: null,
      chave_id: null,
      grupo: null,
    }));
    return [...partidas, ...partidasVolta];
  }
  return partidas;
}

// 2) Grupos — round-robin por grupo; NUNCA mata-mata (eliminatórias vêm depois)
function gerarGrupos(teamIds, numGrupos, idaVolta, gruposMapOpcional) {
  const ids = [...teamIds];

  // Se já temos grupos definidos em campeonato_times, respeitamos:
  let gruposArr;
  if (gruposMapOpcional && gruposMapOpcional.size) {
    const buckets = new Map(); // grupoIdx -> ids[]
    gruposMapOpcional.forEach((g, timeId) => {
      const idx = g; // inteiro 1..N
      if (!buckets.has(idx)) buckets.set(idx, []);
      buckets.get(idx).push(timeId);
    });
    gruposArr = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, list]) => list);
  } else {
    // distribuir automaticamente
    const shuffled = shuffle(ids);
    gruposArr = Array.from({ length: numGrupos }, () => []);
    for (let i = 0; i < shuffled.length; i++) {
      gruposArr[i % numGrupos].push(shuffled[i]);
    }
  }

  const partidas = [];
  let rodadaBase = 0;

  gruposArr.forEach((g, idx) => {
    const rr = gerarPontosCorridos(g, idaVolta);
    const rrMap = rr.map((p) => ({
      ...p,
      rodada: p.rodada + rodadaBase,
      etapa: "grupos",
      is_mata_mata: false,
      grupo: idx + 1, // 1=A, 2=B...
    }));
    partidas.push(...rrMap);
    const maxRodadaGrupo = Math.max(0, ...rr.map((x) => x.rodada));
    rodadaBase += maxRodadaGrupo;
  });

  partidas.sort((a, b) => a.rodada - b.rodada);
  return partidas;
}

// 3) Mata-mata — TODAS as partidas são mata-mata; se ida/volta, pareia com mesma chave_id
function gerarMataMata(teamIds, idaVolta) {
  const ids = shuffle(teamIds);
  let current = [...ids];
  const partidas = [];
  let rodada = 1;

  function isPowerOfTwo(x) { return x && (x & (x - 1)) === 0; }

  // Preliminares para chegar em potência de 2
  while (!isPowerOfTwo(current.length)) {
    const etapaNome = etapaFromCount(current.length);
    const nova = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        const a = current[i], b = current[i + 1];
        const chave = novaChaveId();
        addConfronto(partidas, rodada, a, b, idaVolta, etapaNome, chave);
        nova.push(`VENC_${rodada}_${i / 2}`);
      } else {
        // bye
        nova.push(current[i]);
      }
    }
    current = nova;
    rodada++;
  }

  // Fase principal (potência de 2)
  while (current.length > 1) {
    const etapaNome = etapaFromCount(current.length);
    const nova = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i], b = current[i + 1];
      const chave = novaChaveId();
      addConfronto(partidas, rodada, a, b, idaVolta, etapaNome, chave);
      nova.push(`VENC_${rodada}_${i / 2}`);
    }
    current = nova;
    rodada++;
  }

  return partidas;

  function addConfronto(list, rodadaNum, a, b, volta, etapaNome, chaveId) {
    if (!volta) {
      list.push({
        a, b, rodada: rodadaNum,
        is_mata_mata: true,
        etapa: etapaNome,
        perna: null,
        chave_id: chaveId,
        grupo: null,
      });
      return;
    }
    // Ida (perna 1)
    list.push({
      a, b, rodada: rodadaNum,
      is_mata_mata: true,
      etapa: etapaNome,
      perna: 1,
      chave_id: chaveId,
      grupo: null,
    });
    // Volta (perna 2) invertendo o mando
    list.push({
      a: b, b: a, rodada: rodadaNum,
      is_mata_mata: true,
      etapa: etapaNome,
      perna: 2,
      chave_id: chaveId,
      grupo: null,
    });
  }
}

/* =========================
   Página
   ========================= */
export default function CampeonatoEquipes() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [camp, setCamp] = useState(null);

  const [meusTimes, setMeusTimes] = useState([]);
  const [campTimes, setCampTimes] = useState([]); // [{id, time_id, nome, abreviacao, grupoIndex}]

  const [ordem, setOrdem] = useState("alfabetica");
  const [processando, setProcessando] = useState(false);

  // Carregar campeonato + times
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: c } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("id", campeonatoId)
        .single();
      setCamp(c || null);

      const { data: ts } = await supabase
        .from("times")
        .select("id, usuario_id, nome, abreviacao, cor1, cor2, cor_detalhe, categoria, criado_em")
        .eq("usuario_id", USUARIO_ID)
        .order("nome", { ascending: true });
      setMeusTimes(ts || []);

      const { data: cts } = await supabase
        .from("campeonato_times")
        .select("id, campeonato_id, time_id, grupo")
        .eq("campeonato_id", campeonatoId);

      const mapa = new Map((ts || []).map((t) => [t.id, t]));
      const lista = (cts || []).map((ct) => {
        const t = mapa.get(ct.time_id);
        return {
          id: ct.id,
          time_id: ct.time_id,
          nome: t?.nome || "(time removido)",
          abreviacao: t?.abreviacao || "",
          grupoIndex: grupoCharToIndex(ct.grupo),
        };
      });
      setCampTimes(lista);

      setLoading(false);
    })();
  }, [campeonatoId]);

  const numGrupos = useMemo(() => camp?.numero_grupos || 0, [camp]);
  const isGrupos = camp?.formato === "grupos";
  const isPontos = camp?.formato === "pontos_corridos";
  const isMataMata = camp?.formato === "mata_mata";
  const idaVolta = !!camp?.ida_volta;

  // Ordenação
  const meusTimesOrdenados = useMemo(() => {
    const arr = [...(meusTimes || [])];
    if (ordem === "alfabetica") arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    if (ordem === "mais_recente") arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    return arr;
  }, [meusTimes, ordem]);

  /* ===== Ações: adicionar/remover/editar grupo ===== */

  async function addTimeAoCampeonato(timeId) {
    try {
      if (!timeId) return;
      const jaExiste = Array.isArray(campTimes) && campTimes.some((x) => x?.time_id === timeId);
      if (jaExiste) return;

      const payload = { campeonato_id: campeonatoId, time_id: timeId, grupo: null };

      let inserted = null;
      {
        const { data, error } = await supabase
          .from("campeonato_times")
          .insert([payload])
          .select()
          .single();
        if (error) {
          // fallback (RLS pode bloquear returning)
          const { data: fallback, error: e2 } = await supabase
            .from("campeonato_times")
            .select("*")
            .eq("campeonato_id", campeonatoId)
            .eq("time_id", timeId)
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (e2) throw error;
          inserted = fallback || null;
        } else {
          inserted = data || null;
        }
      }

      if (!inserted) {
        alert("❌ Não foi possível confirmar a inserção.");
        return;
      }

      const timeInfo = Array.isArray(meusTimes) ? meusTimes.find((t) => t.id === timeId) : null;

      setCampTimes((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        return [
          ...base,
          {
            id: inserted.id || null,
            time_id: timeId,
            nome: timeInfo?.nome || "(sem nome)",
            abreviacao: timeInfo?.abreviacao || "",
            grupoIndex: null,
          },
        ];
      });
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao adicionar time ao campeonato.");
    }
  }

  async function removerTimeDoCampeonato(ctId) {
    try {
      if (!ctId) return;
      const ok = confirm("Remover este time do campeonato?");
      if (!ok) return;
      const { error } = await supabase.from("campeonato_times").delete().eq("id", ctId);
      if (error) throw error;
      setCampTimes((prev) => (Array.isArray(prev) ? prev.filter((x) => x?.id !== ctId) : []));
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao remover time do campeonato.");
    }
  }

  async function setGrupo(ctId, idx) {
    try {
      const val = idx ? parseInt(idx, 10) : null;
      const ch = val ? grupoIndexToChar(val) : null;
      const { error } = await supabase.from("campeonato_times").update({ grupo: ch }).eq("id", ctId);
      if (error) throw error;
      setCampTimes((prev) =>
        (Array.isArray(prev) ? prev : []).map((x) => (x?.id === ctId ? { ...x, grupoIndex: val } : x))
      );
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao atualizar grupo.");
    }
  }

  /* ===== Validações ===== */
  function validarMinimos() {
    const qtd = (campTimes || []).length;

    if (isPontos) {
      if (qtd < 4) return "Pontos corridos exigem no mínimo 4 times.";
      return null;
    }

    if (isMataMata) {
      if (qtd < 4) return "Mata-mata exige no mínimo 4 times.";
      return null;
    }

    if (isGrupos) {
      if (numGrupos < 2) return "Fase de grupos exige no mínimo 2 grupos.";
      // buckets por grupo
      const buckets = new Map();
      (campTimes || []).forEach((ct) => {
        const idx = ct?.grupoIndex || 1;
        if (!buckets.has(idx)) buckets.set(idx, []);
        buckets.get(idx).push(ct?.time_id);
      });
      if (buckets.size < 2) return "Distribua os times em pelo menos 2 grupos.";
      for (const [, arr] of buckets) {
        if ((arr || []).length < 3) return "Cada grupo deve ter no mínimo 3 times.";
      }
      return null;
    }

    return "Formato de campeonato inválido.";
  }

  /* ===== Gerar Tabela ===== */
  async function gerarTabela() {
    const erro = validarMinimos();
    if (erro) {
      alert("❌ " + erro);
      return;
    }

    const ok = confirm("Gerar a Tabela de Partidas? Isto apagará partidas já existentes deste campeonato.");
    if (!ok) return;

    try {
      setProcessando(true);

      // 1) Zera partidas existentes
      await supabase.from("partidas").delete().eq("campeonato_id", campeonatoId);

      // 2) Monta confrontos conforme formato
      let partidas = [];
      if (isPontos) {
        const ids = (campTimes || []).map((x) => x.time_id);
        partidas = gerarPontosCorridos(ids, idaVolta);
      } else if (isGrupos) {
        const gruposMap = new Map();
        (campTimes || []).forEach((ct) => {
          const idx = ct?.grupoIndex || 1;
          gruposMap.set(ct.time_id, idx);
        });
        const ids = (campTimes || []).map((x) => x.time_id);
        partidas = gerarGrupos(ids, numGrupos, idaVolta, gruposMap);
      } else if (isMataMata) {
        const ids = (campTimes || []).map((x) => x.time_id);
        partidas = gerarMataMata(ids, idaVolta);
      }

      // 3) Insere no banco com metadados
      const rows = (partidas || []).map((p) => ({
        campeonato_id: campeonatoId,
        rodada: p.rodada,
        time_a_id: p.a,
        time_b_id: p.b,

        // estado inicial
        gols_time_a: 0,
        gols_time_b: 0,
        prorrogacao: false, // coluna sem acento
        penaltis_time_a: null,
        penaltis_time_b: null,
        data_hora: null,
        local: null,
        encerrada: false,

        // metadados
        is_mata_mata: !!p.is_mata_mata,
        etapa: p.etapa || null,
        perna: p.perna ?? null,
        chave_id: p.chave_id || null,
        grupo: p.grupo ?? null,
      }));

      if (!rows.length) {
        alert("Nenhuma partida foi gerada com os parâmetros atuais.");
        setProcessando(false);
        return;
      }

      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("partidas").insert(slice);
        if (error) throw error;
      }

      alert("✅ Tabela gerada com sucesso!");
      navigate(`/campeonatos/${campeonatoId}/partidas`);
    } catch (e) {
      console.error(e);
      alert("❌ Erro ao gerar a tabela.");
    } finally {
      setProcessando(false);
    }
  }

  /* ===== Render ===== */
  if (loading || !camp) {
    return (
      <div className="container">
        <div className="card" style={{ padding: 14 }}>Carregando…</div>
      </div>
    );
  }

  const maxTimesInfo = "(máx. conforme plano do usuário)";

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Equipes do Campeonato</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {camp.nome} — {camp.categoria} — {labelFormato(camp.formato)} — {idaVolta ? "Ida e Volta" : "Jogo único"}<br />
              {isGrupos ? `Grupos: ${numGrupos}` : "Sem grupos"} — {maxTimesInfo}
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Link to={`/campeonatos`} className="btn btn--muted">Voltar</Link>
            <Link to={`/campeonatos/${campeonatoId}/partidas`} className="btn btn--muted">Partidas</Link>
          </div>
        </div>
      </div>

      {/* Painel principal: Catálogo + Times do campeonato */}
      <div className="grid grid-2">
        {/* Meus times */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Meus Times</h3>
            <div className="row" style={{ gap: 8 }}>
              <label className="label" style={{ margin: 0 }}>Ordenar:</label>
              <select className="select" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                <option value="alfabetica">Ordem alfabética</option>
                <option value="mais_recente">Mais recente</option>
              </select>
            </div>
          </div>

          <ul className="list" style={{ marginTop: 8 }}>
            {(meusTimesOrdenados || []).map((t) => {
              const ja = Array.isArray(campTimes) && campTimes.some((x) => x?.time_id === t?.id);
              return (
                <li key={t?.id || Math.random()} className="list__item">
                  <div className="list__left">
                    <div className="palette-dot" style={{ background: t?.cor1 || "#fff" }}></div>
                    <div className="palette-dot" style={{ background: t?.cor2 || "#000" }}></div>
                    <div>
                      <div className="list__title">{t?.nome || "(sem nome)"}</div>
                      <div className="list__subtitle">{t?.abreviacao || "—"}</div>
                    </div>
                  </div>
                  <div>
                    <button
                      className="btn btn--orange"
                      disabled={ja}
                      onClick={() => addTimeAoCampeonato(t?.id)}
                    >
                      {ja ? "Adicionado" : "Adicionar"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Times no campeonato */}
        <div className="card" style={{ padding: 14 }}>
          <h3 style={{ margin: 0 }}>
            Times no Campeonato {(Array.isArray(campTimes) ? campTimes.length : 0)}
          </h3>

          {!Array.isArray(campTimes) || campTimes.length === 0 ? (
            <p className="text-muted" style={{ marginTop: 8 }}>Nenhum time adicionado ainda.</p>
          ) : (
            <ul className="list" style={{ marginTop: 8 }}>
              {campTimes.map((ct) => {
                if (!ct) return null;
                return (
                  <li key={ct.id || `${ct.time_id}-${Math.random()}`} className="list__item">
                    <div className="list__left">
                      <div>
                        <div className="list__title">{ct.nome || "(sem nome)"}</div>
                        <div className="list__subtitle">{ct.abreviacao || "—"}</div>
                      </div>
                    </div>

                    <div className="row" style={{ gap: 8 }}>
                      {isGrupos && (
                        <select
                          className="select"
                          value={ct.grupoIndex || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGrupo(ct.id, val ? parseInt(val, 10) : null);
                          }}
                          style={{ width: 110 }}
                        >
                          <option value="">Grupo…</option>
                          {Array.from({ length: numGrupos || 0 }, (_, i) => i + 1).map((idx) => (
                            <option key={idx} value={idx}>Grupo {grupoIndexToChar(idx)}</option>
                          ))}
                        </select>
                      )}
                      <button
                        className="btn btn--red"
                        onClick={() => (ct.id ? removerTimeDoCampeonato(ct.id) : null)}
                        disabled={!ct.id}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Gerar tabela */}
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn--orange" onClick={gerarTabela} disabled={processando}>
              {processando ? "Gerando..." : "Gerar Tabela de Partidas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
