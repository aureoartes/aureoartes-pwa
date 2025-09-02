// src/pages/CampeonatoEquipes.jsx (atualizado)
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import TeamIcon from "../components/TeamIcon";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

export default function CampeonatoEquipes() {
  const { id: campeonatoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [campeonato, setCampeonato] = useState(null);

  const [timesUsuario, setTimesUsuario] = useState([]); // todos os times do usuário
  const [selecionados, setSelecionados] = useState([]); // linhas de campeonato_times com join no time
  const [regioes, setRegioes] = useState([]);
  const [regiaoFiltroId, setRegiaoFiltroId] = useState("");

  // Busca inicial
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        carregarCampeonato(),
        carregarTimesUsuario(),
        carregarSelecionados(),
        carregarRegioes(),
      ]);
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
    // pega vínculo + times (cores, nome, abreviação…)
    const { data } = await supabase
      .from("campeonato_times")
      .select(`
        id,
        time_id,
        grupo,
        times:time_id (
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
      .eq("usuario_id", USUARIO_ID)
      .order("descricao", { ascending: true });
    setRegioes(data || []);
  }

  const timeIdsSelecionados = useMemo(
    () => new Set(selecionados.map((s) => s.time_id)),
    [selecionados]
  );

  const disponiveisFiltrados = useMemo(() => {
    let arr = timesUsuario.filter((t) => !timeIdsSelecionados.has(t.id));
    if (regiaoFiltroId) arr = arr.filter((t) => t.regiao_id === regiaoFiltroId);
    // ordem alfabética
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
    const { data, error } = await supabase
      .from("campeonato_times")
      .insert([{ campeonato_id: campeonatoId, time_id: time.id, grupo: null }])
      .select()
      .single();
    if (error) {
      alert("❌ Erro ao adicionar equipe.");
      return;
    }
    setSelecionados((prev) => [
      ...prev,
      { ...data, times: time }
    ]);
  }

  async function removerTime(vinculoId) {
    const ok = confirm("Remover este time do campeonato?");
    if (!ok) return;
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

  async function gerarPartidas() {
    // Aqui entra a chamada que você preferir:
    // 1) RPC Postgres: await supabase.rpc('gerar_partidas', { campeonato_id: campeonatoId })
    // 2) Edge Function: await fetch('/functions/v1/gerar_partidas', { method: 'POST', body: JSON.stringify({ campeonatoId }) })
    // 3) Lado cliente: navegar para tela de partidas e gerar por lá
    // Por enquanto, vamos apenas navegar para a tela de partidas.
    navigate(`/campeonatos/${campeonatoId}/partidas`);
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
            <Link to={`/campeonatos/${campeonatoId}/classificacao`} className="btn btn--muted">Ver tabela</Link>
            <button
              className="btn btn--primary"
              onClick={gerarPartidas}
              disabled={!podeGerarPartidas}
              title={podeGerarPartidas ? "Gerar partidas do campeonato" : "Habilita quando o número de equipes selecionadas for igual ao configurado"}
            >
              Gerar partidas
            </button>
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
        {/* Coluna: Meus times (disponíveis) */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Meus times</h3>
            {/* Filtro de região */}
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
            {loading ? (
              <li className="list__item"><div>Carregando…</div></li>
            ) : disponiveisFiltrados.length === 0 ? (
              <li className="list__item">
                <div className="text-muted">Nenhum time disponível {regiaoFiltroId ? "nesta região." : "no momento."}</div>
              </li>
            ) : (
              disponiveisFiltrados.map((t) => (
                <li key={t.id} className="list__item">
                  <div className="list__left">
                    <TeamIcon team={{ cor1: t.cor1, cor2: t.cor2, cor_detalhe: t.cor_detalhe }} size={22} title={t.nome} />
                    <div>
                      <div className="list__title">{t.nome}</div>
                      <div className="list__subtitle">
                        {t.abreviacao || "—"} · {t.categoria || "—"}
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

        {/* Coluna: Selecionados no campeonato */}
        <div className="card" style={{ padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Times do campeonato ({selecionados.length}/{campeonato?.numero_equipes || 0})</h3>
          <ul className="list" style={{ marginTop: 10 }}>
            {loading ? (
              <li className="list__item"><div>Carregando…</div></li>
            ) : selecionados.length === 0 ? (
              <li className="list__item">
                <div className="text-muted">Nenhum time adicionado ainda.</div>
              </li>
            ) : (
              selecionados
                .slice()
                .sort((a, b) => (a?.times?.nome || "").localeCompare(b?.times?.nome || ""))
                .map((s) => (
                  <li key={s.id} className="list__item">
                    <div className="list__left">
                      <TeamIcon
                        team={{ cor1: s.times?.cor1, cor2: s.times?.cor2, cor_detalhe: s.times?.cor_detalhe }}
                        size={22}
                        title={s.times?.nome}
                      />
                      <div>
                        <div className="list__title">{s.times?.nome || "Time"}</div>
                        <div className="list__subtitle">
                          {s.times?.abreviacao || "—"} · {s.times?.categoria || "—"}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn--red" onClick={() => removerTime(s.id)}>
                      Remover
                    </button>
                  </li>
                ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
