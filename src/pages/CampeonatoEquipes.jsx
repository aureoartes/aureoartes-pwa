// src/pages/CampeonatoEquipes.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function CampeonatoEquipes() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [camp, setCamp] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set()); // time_ids
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // carrega campeonato + limites
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("id", campeonatoId)
        .single();
      setCamp(c || null);

      if (c) {
        // times do usuário na MESMA categoria do campeonato
        const { data: times } = await supabase
          .from("times")
          .select("*")
          .eq("usuario_id", USUARIO_ID)
          .eq("categoria", c.categoria)
          .order("nome", { ascending: true });
        setAllTimes(times || []);

        // times já vinculados
        const { data: vincs } = await supabase
          .from("campeonato_times")
          .select("time_id")
          .eq("campeonato_id", campeonatoId);
        const setSel = new Set((vincs || []).map((v) => v.time_id));
        setSelecionados(setSel);
      }
    })();
  }, [campeonatoId]);

  const maxTimes = camp?.numero_equipes || 0;
  const faltam = Math.max(0, maxTimes - selecionados.size);

  function toggleTime(tid) {
    const clone = new Set(selecionados);
    if (clone.has(tid)) clone.delete(tid);
    else {
      if (clone.size >= maxTimes) {
        alert(`Limite atingido: ${maxTimes} equipes.`);
        return;
      }
      clone.add(tid);
    }
    setSelecionados(clone);
  }

  async function salvarParticipantes() {
    if (!camp) return;
    setSaving(true);
    try {
      // remove todos e reinsere (simples e robusto)
      await supabase.from("campeonato_times").delete().eq("campeonato_id", campeonatoId);
      if (selecionados.size > 0) {
        const rows = Array.from(selecionados).map((time_id) => ({
          campeonato_id: campeonatoId,
          time_id,
        }));
        const { error } = await supabase.from("campeonato_times").insert(rows);
        if (error) throw error;
      }
      alert("Participantes salvos!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar participantes.");
    } finally {
      setSaving(false);
    }
  }

  // Util: embaralhar
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ====== Geração de tabela por formato ======
  async function gerarTabela() {
    if (!camp) return;
    if (selecionados.size < (camp.formato === "pontos_corridos" ? 4 : 4)) {
      alert("Quantidade mínima de equipes não atingida para este formato.");
      return;
    }
    if (selecionados.size !== camp.numero_equipes) {
      const ok = confirm(
        `Você selecionou ${selecionados.size} times, mas o campeonato está configurado para ${camp.numero_equipes}. Continuar mesmo assim?`
      );
      if (!ok) return;
    }

    setGenerating(true);
    try {
      // Limpa partidas anteriores do campeonato (opcional/seguro)
      await supabase.from("partidas").delete().eq("campeonato_id", campeonatoId);

      const timesSel = allTimes.filter((t) => selecionados.has(t.id));
      const ids = shuffle(timesSel.map((t) => t.id));

      let partidas = [];
      if (camp.formato === "pontos_corridos") {
        partidas = gerarPontosCorridos(ids, camp.ida_volta);
      } else if (camp.formato === "grupos") {
        partidas = gerarGrupos(ids, camp.numero_grupos || 2, camp.ida_volta);
      } else if (camp.formato === "mata_mata") {
        partidas = gerarMataMata(ids, camp.ida_volta);
      }

      if (partidas.length === 0) {
        alert("Nenhuma partida gerada. Verifique os parâmetros.");
        return;
      }

      // Insere em public.partidas
      const rows = partidas.map((p) => ({
        campeonato_id: campeonatoId,
        rodada: p.rodada,
        time_a_id: p.a,
        time_b_id: p.b,
        // gols defaults já são 0 no banco
        prorrogação: false, // sua coluna na tabela foi renomeada para "prorrogacao"
        prorrogacao: false,
        data_hora: null,
        local: null,
        encerrada: false,
      }));

      // Corrige nome da coluna "prorrogacao" (sem acento)
      rows.forEach((r) => {
        delete r["prorrogação"];
        r["prorrogacao"] = false;
      });

      const { error } = await supabase.from("partidas").insert(rows);
      if (error) throw error;

      alert(`✅ Geramos ${rows.length} partidas!`);
      navigate("/campeonatos");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar a tabela.");
    } finally {
      setGenerating(false);
    }
  }

  // ===== Algoritmos =====
  // 1) Pontos Corridos (Round-robin de Berger; lida com ímpar com 'bye')
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
        if (home !== bye && away !== bye) rodada.push({ a: home, b: away });
      }
      calendario.push(rodada);

      // rotação (método círculo)
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr.splice(0, n - 1, fixed, ...rest);
    }

    // gera lista com rodada numerada
    const partidas = [];
    let rodadaNum = 1;
    calendario.forEach((rod) => {
      rod.forEach((j) => partidas.push({ rodada: rodadaNum, ...j }));
      rodadaNum++;
    });

    if (idaVolta) {
      // jogos de volta invertendo mando
      const partidasVolta = partidas.map((p) => ({
        rodada: p.rodada + rounds,
        a: p.b,
        b: p.a,
      }));
      return [...partidas, ...partidasVolta];
    }
    return partidas;
  }

  // 2) Grupos (divide em grupos ~iguais; todos contra todos no grupo)
  function gerarGrupos(teamIds, numGrupos, idaVolta) {
    const ids = [...teamIds];
    // embaralha
    const shuffled = shuffle(ids);
    // divide em numGrupos baldes
    const grupos = Array.from({ length: numGrupos }, () => []);
    for (let i = 0; i < shuffled.length; i++) {
      grupos[i % numGrupos].push(shuffled[i]);
    }

    const partidas = [];
    let baseRodada = 1;
    grupos.forEach((g) => {
      const jogos = gerarPontosCorridos(g, idaVolta); // reaproveita round-robin
      // remapeia as rodadas para não conflitar (empilha as rodadas dos grupos)
      jogos.forEach((j) => partidas.push({ rodada: j.rodada + baseRodada - 1, a: j.a, b: j.b }));
      baseRodada += Math.max(...jogos.map((j) => j.rodada), 0);
    });

    return partidas.sort((x, y) => x.rodada - y.rodada);
  }

  // 3) Mata-mata (ajusta p/ múltiplos de 4; preliminar se necessário; ida/volta opcional)
  function gerarMataMata(teamIds, idaVolta) {
    // regra: “a segunda rodada deve ter nº de times múltiplo de 4”
    const ids = shuffle(teamIds);
    let current = [...ids];
    const partidas = [];
    let rodada = 1;

    // se não for potência de 2, cria eliminatórias preliminares até chegar em múltiplo de 4 na próxima fase
    function nextPow2(x) {
      let p = 1;
      while (p < x) p <<= 1;
      return p;
    }

    // fase preliminar se necessário (por ex: 5, 6, 10, etc.)
    while (current.length & (current.length - 1)) {
      // se não é potência de 2, remove 2 de cada vez formando uma partida preliminar
      const a = current.pop();
      const b = current.pop();
      addJogo(partidas, rodada, a, b, idaVolta);
      // vencedor fictício entra na próxima (aqui não sabemos o id; na prática o placar definirá)
      // Para cadastro da chave agora, registramos só as partidas; a progressão real ocorre no resultado.
      if (current.length % 2 === 1) rodada++;
    }

    // agora current.length é potência de 2
    while (current.length > 1) {
      const novaFase = [];
      for (let i = 0; i < current.length; i += 2) {
        const a = current[i];
        const b = current[i + 1];
        addJogo(partidas, rodada, a, b, idaVolta);
        // placeholder de vencedor
        novaFase.push(`VENC_${rodada}_${i / 2}`);
      }
      current = novaFase;
      rodada++;
    }

    return partidas;

    function addJogo(list, r, a, b, volta) {
      list.push({ rodada: r, a, b });
      if (volta) list.push({ rodada: r + 1000, a: b, b: a }); // 1000 desloca “rodada de volta” só para ordenar depois
    }
  }

  if (!camp) return <div className="container"><div className="card" style={{padding:16}}>Carregando…</div></div>;

  return (
    <div className="container">
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0 }}>{camp.nome}</h1>
            <div className="text-muted" style={{ fontSize: 13 }}>
              {camp.categoria} — {camp.formato.replace("_", " ")} — máximo {camp.numero_equipes} equipes
            </div>
          </div>
          <Link to="/campeonatos" className="btn btn--muted">Voltar</Link>
        </div>
      </div>

      <div className="grid">
        {/* Box seleção de equipes */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Participantes ({selecionados.size}/{maxTimes})</h3>
            <button className="btn btn--orange" onClick={salvarParticipantes} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Participantes"}
            </button>
          </div>
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            {allTimes.length === 0 && (
              <div className="text-muted">Você ainda não tem times nesta categoria.</div>
            )}
            {allTimes.map((t) => {
              const sel = selecionados.has(t.id);
              return (
                <label key={t.id} className="card" style={{ padding: 12, cursor: "pointer", borderColor: sel ? "#FB8C00" : undefined }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="text-strong">{t.nome}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{t.abreviacao}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleTime(t.id)}
                    />
                  </div>
                </label>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div className="badge">Faltam {faltam}</div>
          </div>
        </div>

        {/* Box geração */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Gerador Automático</h3>
            <button
              className="btn btn--primary"
              onClick={gerarTabela}
              disabled={generating || selecionados.size < 2}
              title="Gera a tabela de jogos conforme o formato e as regras do campeonato"
            >
              {generating ? "Gerando..." : "Gerar Tabela de Partidas"}
            </button>
          </div>
          <p className="text-muted" style={{ marginTop: 8, fontSize: 13 }}>
            Sorteio interno aleatório nesta versão. Depois adicionamos “refazer sorteio” e realocação manual (plano Full).
          </p>
        </div>
      </div>
    </div>
  );
}
