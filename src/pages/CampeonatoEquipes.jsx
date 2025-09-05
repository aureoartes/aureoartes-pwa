// src/pages/CampeonatoEquipes.jsx — listas no padrão visual simples (ListaCompactaItem), join correto e cores normalizadas
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import TeamIcon from "../components/TeamIcon";
import ListaCompactaItem from "../components/ListaCompactaItem";
import { USUARIO_ID } from "../config/appUser";

// Normaliza cores para HEX com '#', aceita 3/6 dígitos
function normalizeHexColor(c, fallback = "#e0e0e0") {
  if (!c) return fallback;
  let v = String(c).trim();
  if (!v) return fallback;
  if (!v.startsWith("#")) v = `#${v}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}

export default function CampeonatoEquipes() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [campeonato, setCampeonato] = useState(null);

  const [timesUsuario, setTimesUsuario] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [regioes, setRegioes] = useState([]);
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  const [temPartidas, setTemPartidas] = useState(false);
  const [todasPartidasEncerradas, setTodasPartidasEncerradas] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        carregarCampeonato(),
        carregarTimesUsuario(),
        carregarSelecionados(),
        carregarRegioes(),
      ]);
      await checarEstadoPartidas();
      setLoading(false);
    })();
  }, [campeonatoId]);

  async function carregarCampeonato() {
    const { data } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("id", campeonatoId)
      .single();
    setCampeonato(data || null);
  }

  async function carregarTimesUsuario() {
    const { data } = await supabase
      .from("times")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("nome", { ascending: true });
    setTimesUsuario(data || []);
  }

  async function carregarSelecionados() {
    const { data } = await supabase
      .from("campeonato_times")
      .select(`
        id,
        time_id,
        grupo,
        time:time_id (
          id, nome, abreviacao, cor1, cor2, cor_detalhe, categoria, regiao_id
        )
      `)
      .eq("campeonato_id", campeonatoId);
    setSelecionados(data || []);
  }

  async function carregarRegioes() {
    const { data } = await supabase
      .from("regioes")
      .select("id, descricao")
      .order("descricao", { ascending: true });
    setRegioes(data || []);
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

  async function gerarPartidas() {
    if (!podeGerarPartidas) {
      alert("Selecione exatamente o número de equipes configurado para o campeonato.");
      return;
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

      {/* Duas colunas */}
      <div className="grid grid-2">
        {/* Coluna: Meus times */}
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

          {disponiveisFiltrados.length === 0 ? (
            <div className="card" style={{ padding: 14, marginTop: 10 }}>
              <div className="text-muted">Nenhum time disponível {regiaoFiltroId ? "nesta região." : "no momento."}</div>
            </div>
          ) : (
            <ul className="list card" style={{ marginTop: 10 }}>
              {disponiveisFiltrados.map((t) => {
                const icone = (
                  <TeamIcon
                    team={t || { cor1: "#FFFFFF", cor2: "#000000", cor_detalhe: "#999999" }}
                    size={24}
                 />
                );
                const titulo = t.nome;
                const subtitulo = `${t.abreviacao || "—"} · ${t.categoria || "—"}`;
                const acoes = (
                  <button
                    className="btn btn--sm btn--orange"
                    onClick={() => adicionarTime(t)}
                    disabled={capacidadeAtingida}
                    title={capacidadeAtingida ? "Limite de equipes atingido" : "Adicionar ao campeonato"}
                  >
                    Adicionar
                  </button>
                );
                return (
                  <ListaCompactaItem key={t.id} icone={icone} titulo={titulo} subtitulo={subtitulo} acoes={acoes} />
                );
              })}
            </ul>
          )}

          {capacidadeAtingida && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Limite de {campeonato?.numero_equipes} equipes atingido.
            </div>
          )}
        </div>

        {/* Coluna: Times do campeonato */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ marginTop: 0 }}>Times do campeonato ({selecionados.length}/{campeonato?.numero_equipes || 0})</h3>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--primary"
                onClick={gerarPartidas}
                disabled={!podeGerarPartidas}
                title={
                  podeGerarPartidas
                    ? "Gerar partidas no banco"
                    : "Habilita quando o número de equipes selecionadas for igual ao configurado"
                }
              >
                Gerar partidas
              </button>
            </div>
          </div>

          {selecionados.length === 0 ? (
            <div className="card" style={{ padding: 14, marginTop: 10 }}>
              <div className="text-muted">Nenhum time adicionado ainda.</div>
            </div>
          ) : (
            <ul className="list card" style={{ marginTop: 10 }}>
              {selecionados
                .slice()
                .sort((a, b) => (a?.time?.nome || "").localeCompare(b?.time?.nome || ""))
                .map((s) => {
                  const t = s.time || {};
                  const icone = (
                    <TeamIcon
                      team={t || { cor1: "#FFFFFF", cor2: "#000000", cor_detalhe: "#999999" }}
                      size={24}
                    />
                  );
                  const titulo = t.nome || "Time";
                  const subtitulo = `${t.abreviacao || "—"} · ${t.categoria || "—"}`;
                  const acoes = (
                    <button
                      className="btn btn--sm btn--red"
                      onClick={() => removerTime(s.id)}
                      disabled={todasPartidasEncerradas}
                      title={
                        todasPartidasEncerradas
                          ? "Todas as partidas estão encerradas"
                          : "Remover time do campeonato"
                      }
                    >
                      Remover
                    </button>
                  );
                  return (
                    <ListaCompactaItem key={s.id} icone={icone} titulo={titulo} subtitulo={subtitulo} acoes={acoes} />
                  );
                })}
            </ul>
          )}

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
