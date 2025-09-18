// v1.1.0 — Campeonato > Equipes — Autenticação Supabase + RLS (ownerId)
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";         // <- named export
import TeamIcon from "../components/TeamIcon";
import { useAuth } from "@/auth/AuthProvider"; // se não usar alias "@", troque para "../auth/AuthProvider"

function normalizeHexColor(c, fallback = "#e0e0e0") {
  if (!c || typeof c !== "string") return fallback;
  let v = c.trim();
  if (!v) return fallback;
  if (!v.startsWith("#")) v = `#${v}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

export default function CampeonatoEquipes() {
  const { ownerId, loading: authLoading } = useAuth();   // ← novo: dono logado
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [campeonato, setCampeonato] = useState(null);

  const [timesUsuario, setTimesUsuario] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const regiaoMap = useMemo(
    () => Object.fromEntries((regioes || []).map(r => [r.id, r.descricao])),
    [regioes]
  );
  const nomeRegiao = (id) => regiaoMap[id] || "—";
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  const [categorias, setCategorias] = useState([]);

  const categoriaMap = useMemo(
    () => Object.fromEntries((categorias || []).map(c => [c.id, c.descricao])),
    [categorias]
  );
  const nomeCategoria = (id, legadoTexto) => categoriaMap[id] || legadoTexto || "—";

  const [temPartidas, setTemPartidas] = useState(false);
  const [todasPartidasEncerradas, setTodasPartidasEncerradas] = useState(false);

  useEffect(() => {
    if (authLoading) return;          // espera resolver auth
    if (!ownerId) {                   // sem usuário => limpa e mostra “vazio”
      setCampeonato(null);
      setTimesUsuario([]);
      setSelecionados([]);
      setRegioes([]);
      setTemPartidas(false);
      setTodasPartidasEncerradas(false);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await Promise.all([
        carregarCampeonato(ownerId),
        carregarTimesUsuario(ownerId),
        carregarSelecionados(),
        carregarRegioes(ownerId),
        carregarCategorias(), 
      ]);
      await checarEstadoPartidas();
      setLoading(false);
    })();
  }, [authLoading, ownerId, campeonatoId]);

  async function carregarCampeonato(owner) {
    // Segurança extra: garante que o campeonato pertence ao dono atual
    const { data, error } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("id", campeonatoId)
      .eq("usuario_id", owner)
      .single();
    if (error) {
      setCampeonato(null);
      return;
    }
    setCampeonato(data || null);
  }

  async function carregarTimesUsuario(owner) {
    const { data, error } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", owner)
      .order("nome", { ascending: true });
    if (error) {
      setTimesUsuario([]);
      return;
    }
    setTimesUsuario(data || []);
  }

  async function carregarSelecionados() {
    const { data, error } = await supabase
      .from("campeonato_times")
      .select(
        `
        id,
        time_id,
        grupo,
        time:time_id ( id, nome, abreviacao, cor1, cor2, cor_detalhe, categoria_id, regiao_id )
      `
      )
      .eq("campeonato_id", campeonatoId);
    if (error) {
      setSelecionados([]);
      return;
    }
    setSelecionados(data || []);
  }

  async function carregarRegioes(owner) {
    const { data, error } = await supabase
      .from("regioes")
      .select("id, descricao")
      .eq("usuario_id", owner)
      .order("descricao", { ascending: true });
    if (error) {
      setRegioes([]);
      return;
    }
    setRegioes(data || []);
  }

  async function carregarCategorias() {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, descricao")
      .order("descricao", { ascending: true });
    if (error) { setCategorias([]); return; }
    setCategorias(data || []);
  }

  async function checarEstadoPartidas() {
    const { count: total } = await supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .eq("campeonato_id", campeonatoId);

    const { count: abertas } = await supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .eq("campeonato_id", campeonatoId)
      .neq("encerrada", true);

    const tem = (total || 0) > 0;
    setTemPartidas(tem);
    setTodasPartidasEncerradas(tem && (abertas || 0) === 0);
  }

  const timeIdsSelecionados = useMemo(
    () => new Set(selecionados.map((s) => s.time_id)),
    [selecionados]
  );

  const disponiveisFiltrados = useMemo(() => {
    let arr = timesUsuario.filter((t) => !timeIdsSelecionados.has(t.id));
    if (regiaoFiltroId) arr = arr.filter((t) => t.regiao_id === regiaoFiltroId);
    arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    return arr;
  }, [timesUsuario, timeIdsSelecionados, regiaoFiltroId]);

  const capacidadeAtingida =
    campeonato && selecionados.length >= (campeonato.numero_equipes || 0);

  const podeGerarPartidas =
    !!campeonato && selecionados.length === (campeonato.numero_equipes || 0);

  async function adicionarTime(time) {
    if (!ownerId) return; // segurança
    if (capacidadeAtingida) {
      alert("Limite de equipes atingido para este campeonato.");
      return;
    }
    if (temPartidas) {
      const okReset = confirm(
        "Já existem partidas geradas. Todas as partidas serão EXCLUÍDAS e uma nova tabela será gerada ao final. Deseja continuar?"
      );
      if (!okReset) return;
      await resetarPartidas();
    }
    const { data, error } = await supabase
      .from("campeonato_times")
      .insert([{ campeonato_id: campeonatoId, time_id: time.id, grupo: null }])
      .select()
      .single();
    if (error) {
      alert("❌ Erro ao adicionar equipe.");
      return;
    }
    setSelecionados((prev) => [...prev, { ...data, time }]);
  }

  async function removerTime(vinculoId) {
    if (temPartidas) {
      const ok = confirm(
        "Este campeonato já tem partidas geradas. TODAS as partidas serão excluídas e uma nova tabela será gerada. Deseja prosseguir?"
      );
      if (!ok) return;
      await resetarPartidas();
    }

    const { error } = await supabase
      .from("campeonato_times")
      .delete()
      .eq("id", vinculoId);
    if (error) {
      alert("❌ Erro ao remover equipe.");
      return;
    }
    setSelecionados((prev) => prev.filter((s) => s.id !== vinculoId));
  }

  async function resetarPartidas() {
    await supabase.from("partidas").delete().eq("campeonato_id", campeonatoId);
    setTemPartidas(false);
    setTodasPartidasEncerradas(false);
  }

  // Distribui grupos por sorteio (Fisher–Yates) e balanceia quociente+resto
  async function distribuirGruposPorSorteio() {
    if (!campeonato) return;
    const formato = (campeonato.formato || "").toLowerCase();
    if (formato !== "grupos") return;

    const nGrupos = Number(campeonato.numero_grupos || 0);
    if (!nGrupos || nGrupos < 1) {
      throw new Error("numero_grupos_invalido");
    }

    const arr = [...(selecionados || [])];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    const total = arr.length;
    const base = Math.floor(total / nGrupos);
    const resto = total % nGrupos;

    let idx = 0;
    const updates = [];
    for (let g = 1; g <= nGrupos; g++) {
      const size = base + (g <= resto ? 1 : 0);
      for (let k = 0; k < size && idx < total; k++, idx++) {
        const vinc = arr[idx];
        if (vinc.grupo !== g) updates.push({ id: vinc.id, grupo: g });
      }
    }

    if (updates.length) {
      await Promise.all(
        updates.map((u) =>
          supabase.from("campeonato_times").update({ grupo: u.grupo }).eq("id", u.id)
        )
      );
      setSelecionados((prev) =>
        prev.map((s) => {
          const u = updates.find((x) => x.id === s.id);
          return u ? { ...s, grupo: u.grupo } : s;
        })
      );
    }
  }

  async function gerarPartidas() {
    if (!podeGerarPartidas) {
      alert("Selecione exatamente o número de equipes configurado para o campeonato.");
      return;
    }
    const formato = (campeonato?.formato || "").toLowerCase();

    if (formato === "grupos") {
      const nGrupos = Number(campeonato?.numero_grupos || 0);
      if (!nGrupos || nGrupos < 1) {
        alert("Defina a quantidade de grupos no cadastro do campeonato antes de gerar partidas.");
        return;
      }
      try {
        await distribuirGruposPorSorteio();
      } catch {
        alert("Não foi possível distribuir os grupos. Verifique a configuração e tente novamente.");
        return;
      }
    }

    const { error } = await supabase.rpc("generate_partidas", {
      p_campeonato_id: campeonatoId,
      p_limpar_abertas: true,
    });
    if (error) {
      alert("❌ Erro ao gerar partidas.");
      return;
    }

    await checarEstadoPartidas();
    if ((campeonato?.formato || "") === "mata_mata") {
      navigate(`/campeonatos/${campeonatoId}/partidas`);
    } else {
      navigate(`/campeonatos/${campeonatoId}/classificacao`);
    }
  }

  const isMataMata = (campeonato?.formato || "") === "mata_mata";
  const showVerTabela = !isMataMata && temPartidas;
  const showVerPartidas = isMataMata && temPartidas;

  if (authLoading) {
    return (
      <div className="container">
        <div className="card"><div>Carregando autenticação…</div></div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container">
        <div className="card"><div>Carregando…</div></div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>
              {campeonato ? `${campeonato.nome} - Equipes` : "Equipes do Campeonato"}
            </h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Adicione ou remova times deste campeonato.
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {showVerTabela && (
              <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${campeonatoId}/classificacao`)}>
                Ver tabela
              </button>
            )}
            {showVerPartidas && (
              <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${campeonatoId}/partidas`)}>
                Ver partidas
              </button>
            )}
            <Link to="/campeonatos" className="btn btn--muted">Voltar</Link>
          </div>
        </div>
        {campeonato && (
          <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Selecionados: <strong>{selecionados.length}</strong> / Necessários: <strong>{campeonato.numero_equipes || 0}</strong>
          </div>
        )}
      </div>

      {/* Duas colunas (INVERTIDAS): esquerda = Meus times / direita = Times do campeonato */}
      <div className="grid grid-2">
        {/* Coluna ESQUERDA: Meus times (disponíveis, NÃO vinculados) */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Meus times</h3>
            <div className="row" style={{ gap: 8 }}>
              <label className="label" style={{ margin: 0 }}>Região:</label>
              <select
                className="select"
                value={regiaoFiltroId}
                onChange={(e) => setRegiaoFiltroId(e.target.value)}
                style={{ minWidth: 160 }}
              >
                <option value="">Todas</option>
                {regioes.map((r) => (
                  <option key={r.id} value={r.id}>{r.descricao}</option>
                ))}
              </select>
            </div>
          </div>

          <ul className="list" style={{ marginTop: 10 }}>
            {disponiveisFiltrados.length === 0 ? (
              <li className="list__item">
                <div className="text-muted">Nenhum time disponível {regiaoFiltroId ? "nesta região." : "no momento."}</div>
              </li>
            ) : (
              disponiveisFiltrados.map((t) => (
                <li key={t.id} className="list__item">
                  <div className="list__left">
                    <TeamIcon
                      team={{
                        cor1: normalizeHexColor(t.cor1),
                        cor2: normalizeHexColor(t.cor2, "#9e9e9e"),
                        cor_detalhe: normalizeHexColor(t.cor_detalhe, "#333333"),
                      }}
                      size={22}
                      title={t.nome}
                    />

                    <div>
                      <div className="list__title">{t.nome}</div>
                      <div className="list__subtitle">
                        {t.abreviacao || "—"} · {t.categoria || "—"} · {nomeCategoria(t.categoria_id, t.categoria)} · {nomeRegiao(t.regiao_id)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn--orange"
                    onClick={() => adicionarTime(t)}
                    disabled={capacidadeAtingida}
                    title={capacidadeAtingida ? "Limite de equipes atingido" : "Adicionar ao campeonato"}
                  >
                    Adicionar
                  </button>
                </li>
              ))
            )}
          </ul>

          {capacidadeAtingida && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Limite de {campeonato?.numero_equipes} equipes atingido.
            </div>
          )}
        </div>

        {/* Coluna DIREITA: Selecionados */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ marginTop: 0 }}>Times do campeonato ({selecionados.length}/{campeonato?.numero_equipes || 0})</h3>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--primary"
                onClick={gerarPartidas}
                disabled={!podeGerarPartidas || temPartidas}
                title={
                  temPartidas
                    ? "Já existem partidas geradas para este campeonato"
                    : !podeGerarPartidas
                      ? "Habilita quando o número de equipes selecionadas for igual ao configurado"
                      : "Gerar partidas no banco"
                }
              >
                Gerar partidas
              </button>
            </div>
          </div>

          <ul className="list" style={{ marginTop: 10 }}>
            {selecionados.length === 0 ? (
              <li className="list__item">
                <div className="text-muted">Nenhum time adicionado ainda.</div>
              </li>
            ) : (
              selecionados
                .slice()
                .sort((a, b) => (a?.time?.nome || "").localeCompare(b?.time?.nome || ""))
                .map((s) => (
                  <li key={s.id} className="list__item">
                    <div className="list__left">
                      <TeamIcon
                        team={{
                          cor1: normalizeHexColor(s.time?.cor1),
                          cor2: normalizeHexColor(s.time?.cor2, "#9e9e9e"),
                          cor_detalhe: normalizeHexColor(s.time?.cor_detalhe, "#333333"),
                        }}
                        size={22}
                        title={s.time?.nome}
                      />
                      <div>
                        <div className="list__title">{s.time?.nome || "Time"}</div>
                        <div className="list__subtitle">
                          {s.time?.abreviacao || "—"} · {s.time?.categoria || "—"} · {nomeCategoria(s.time?.categoria_id, s.time?.categoria)} · {nomeRegiao(s.time?.regiao_id)}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn--red"
                      onClick={() => removerTime(s.id)}
                      disabled={temPartidas}
                      title={
                        temPartidas
                          ? "Este campeonato já possui partidas geradas. Remoções desabilitadas."
                          : "Remover time do campeonato"
                      }
                    >
                      Remover
                    </button>
                  </li>
                ))
            )}
          </ul>

          {todasPartidasEncerradas && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Todas as partidas deste campeonato estão encerradas. Remoções estão desabilitadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
