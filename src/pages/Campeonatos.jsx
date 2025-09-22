// v1.2.1.0 — Campeonatos
// Header alinhado ao padrão de Jogadores.jsx; ações ajustadas; botões Partidas/Chaves/Tabela conforme regras
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";
import TeamIcon from "../components/TeamIcon";
import { useAuth } from "@/auth/AuthProvider";

function labelFormato(v) {
  if (v === "pontos_corridos") return "Pontos Corridos";
  if (v === "grupos") return "Grupos";
  if (v === "mata_mata") return "Mata-mata";
  return v || "—";
}

export default function Campeonatos() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { ownerId, loading: authLoading } = useAuth();

  // Dados
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenacao, setOrdenacao] = useState("alfabetica");

  // Conjuntos para habilitar botões por tipo de partidas
  const [campIdsComPartidas, setCampIdsComPartidas] = useState(new Set());
  const [campIdsMataMata, setCampIdsMataMata] = useState(new Set());
  const [campIdsLiga, setCampIdsLiga] = useState(new Set());
  const [finishedByCamp, setFinishedByCamp] = useState(new Map());
  const [totalByCamp, setTotalByCamp] = useState(new Map());

  // ====== Form (criação/edição) ======
  const [abrirCadastro, setAbrirCadastro] = useState(false);
  const [editando, setEditando] = useState(null);

  const [nome, setNome] = useState("");
  const [idaVolta, setIdaVolta] = useState(false);
  const [categoriaId, setCategoriaId] = useState("a7579001-e48e-4018-9c0a-a24cce0b4e6c");
  const [categorias, setCategorias] = useState([]);
  const [formato, setFormato] = useState("pontos_corridos");
  const [numeroEquipes, setNumeroEquipes] = useState(4);
  const [duracaoTempo, setDuracaoTempo] = useState(10);
  const [numeroGrupos, setNumeroGrupos] = useState(2);
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(1);
  const [prorrogacao, setProrrogacao] = useState(false);
  const [duracaoProrrogacao, setDuracaoProrrogacao] = useState(5);
  const [qtdPenaltis, setQtdPenaltis] = useState(5);

  // menu mobile
  const [openMenuId, setOpenMenuId] = useState(null);

  // Renderização condicional por viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler); else mq.addListener(handler);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', handler); else mq.removeListener(handler); };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!ownerId) {
      setLista([]);
      setCampIdsComPartidas(new Set());
      setCampIdsMataMata(new Set());
      setCampIdsLiga(new Set());
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);

      // Lista de campeonatos com join da categoria
      const { data: camps, error } = await supabase
        .from("campeonatos")
        .select("*, categorias:categoria_id(descricao)")
        .eq("usuario_id", ownerId);

      // Lista de categorias para o select (id/descricao)
      const { data: cats } = await supabase
        .from("categorias")
        .select("id, descricao")
        .order("descricao", { ascending: true });
      setCategorias(cats || []);

      if (error) {
        setLista([]);
        setCampIdsComPartidas(new Set());
        setCampIdsMataMata(new Set());
        setCampIdsLiga(new Set());
        setLoading(false);
        return;
      }

      setLista(camps || []);

      const ids = (camps || []).map((c) => c.id);
      if (ids.length) {
        const { data: ps } = await supabase
          .from("partidas")
          .select("campeonato_id, is_mata_mata, encerrada")
          .in("campeonato_id", ids);
        const all = ps || [];
        setCampIdsComPartidas(new Set(all.map((p) => p.campeonato_id)));
        setCampIdsMataMata(new Set(all.filter(p => p.is_mata_mata === true).map(p => p.campeonato_id)));
        setCampIdsLiga(new Set(all.filter(p => !p.is_mata_mata).map(p => p.campeonato_id)));
        // map de encerradas/total por campeonato
        const finished = new Map();
        const totals = new Map();
        for (const p of all) {
          totals.set(p.campeonato_id, (totals.get(p.campeonato_id) || 0) + 1);
          if (p.encerrada) finished.set(p.campeonato_id, (finished.get(p.campeonato_id) || 0) + 1);
        }
        setFinishedByCamp(finished);
        setTotalByCamp(totals);
      } else {
        setCampIdsComPartidas(new Set());
        setCampIdsMataMata(new Set());
        setCampIdsLiga(new Set());
      }
      setLoading(false);
    })();
  }, [authLoading, ownerId]);

  const listaOrdenada = useMemo(() => {
    const arr = [...(lista || [])];
    if (ordenacao === "alfabetica")
      return arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    if (ordenacao === "mais_recente")
      return arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    if (ordenacao === "mais_antigo")
      return arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    return arr;
  }, [lista, ordenacao]);

  const hasPartidas = (campId) => campIdsComPartidas.has(campId);
  const hasMataMata = (campId) => campIdsMataMata.has(campId);
  const hasLiga = (campId) => campIdsLiga.has(campId);

  function statusTeam(campId) {
    const total = totalByCamp.get(campId) || 0;
    const fin = finishedByCamp.get(campId) || 0;
    // Paleta AureoArtes
    const RED = "#FF3B30";     // nenhum encerrado (inclui sem partidas)
    const GREEN = "#00A65A";   // todas encerradas
    const YELLOW = "#FFC107";  // misto
    const WHITE = "#FFFFFF";   // detalhe

    if (fin === 0) return { cor1: RED, cor2: RED, cor_detalhe: WHITE };
    if (fin === total && total > 0) return { cor1: GREEN, cor2: GREEN, cor_detalhe: WHITE };
    return { cor1: YELLOW, cor2: YELLOW, cor_detalhe: WHITE };
  };

  function resetForm() {
    setEditando(null);
    setNome("");
    setIdaVolta(false);
    setCategoriaId("a7579001-e48e-4018-9c0a-a24cce0b4e6c");
    setFormato("pontos_corridos");
    setNumeroEquipes(4);
    setDuracaoTempo(10);
    setNumeroGrupos(2);
    setAvancamPorGrupo(1);
    setProrrogacao(false);
    setDuracaoProrrogacao(5);
    setQtdPenaltis(5);
  }

  function abrirEditar(c) {
    setEditando(c);
    setNome(c?.nome || "");
    setIdaVolta(!!c?.ida_volta);
    setCategoriaId(c?.categoria_id || "a7579001-e48e-4018-9c0a-a24cce0b4e6c");
    setFormato(c?.formato || "pontos_corridos");
    setNumeroEquipes(c?.numero_equipes ?? 4);
    setDuracaoTempo(c?.duracao_tempo ?? 10);
    setNumeroGrupos(c?.numero_grupos ?? 2);
    setAvancamPorGrupo(c?.avancam_por_grupo ?? 1);
    setProrrogacao(!!c?.prorrogacao);
    setDuracaoProrrogacao(c?.duracao_prorrogacao ?? 5);
    setQtdPenaltis(c?.qtd_penaltis ?? 5);
    setAbrirCadastro(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function salvarNovo() {
    // validação simples
    if (!nome.trim()) return alert("❌ Informe o nome");
    if (!categoriaId) return alert("❌ Selecione a categoria");
    if (!Number(numeroEquipes) || Number(numeroEquipes) < 4) return alert("❌ Número de equipes inválido");
    if (!Number(duracaoTempo) || Number(duracaoTempo) < 2 || Number(duracaoTempo) > 45) return alert("❌ Duração inválida (2–45)");
    if (formato === "grupos") {
      if (!Number(numeroGrupos) || Number(numeroGrupos) < 2) return alert("❌ Quantidade de grupos inválida");
      if (!Number(avancamPorGrupo) || Number(avancamPorGrupo) < 1) return alert("❌ Avançam por grupo inválido");
      if (!Number(numeroEquipes) || Number(numeroEquipes) < 6) return alert("❌ Número de equipes inválido");
    }
    // validação da prorrogação 1–15
    if (formato !== "pontos_corridos" && prorrogacao) {
      if (!Number(duracaoProrrogacao) || Number(duracaoProrrogacao) < 1 || Number(duracaoProrrogacao) > 15) {
        return alert("❌ Duração da prorrogação inválida (1–15)");
      }
    }

    const base = {
      usuario_id: ownerId,
      nome: nome.trim(),
      categoria_id: categoriaId,
      formato,
      numero_equipes: Number(numeroEquipes),
      ida_volta: !!idaVolta,
      duracao_tempo: Number(duracaoTempo),
      prorrogacao: !!prorrogacao,
      duracao_prorrogacao: (formato !== "pontos_corridos" && prorrogacao) ? Number(duracaoProrrogacao) : null,
      qtd_penaltis: (formato !== "pontos_corridos") ? Number(qtdPenaltis) : 5,
      numero_grupos: (formato === "grupos") ? Number(numeroGrupos) : null,
      avancam_por_grupo: (formato === "grupos") ? Number(avancamPorGrupo) : null,
    };

    const { data, error } = await supabase
      .from("campeonatos")
      .insert([base])
      .select()
      .single();

    if (error) return alert("❌ Erro ao salvar");

    // refresh lista
    const { data: camps } = await supabase
      .from("campeonatos")
      .select("*, categorias:categoria_id(descricao)")
      .eq("usuario_id", ownerId);
    setLista(camps || []);

    setAbrirCadastro(false);
    alert("✅ Campeonato criado!");

    if (data?.id) {
      navigate(`/campeonatos/${data.id}/equipes`);
    }
  }
  
  // salvar edição
  async function salvarEdicao() {
    if (!editando?.id) return;

    // mesma validação do novo
    if (!nome.trim()) return alert("❌ Informe o nome");
    if (!categoriaId) return alert("❌ Selecione a categoria");
    if (!Number(numeroEquipes) || Number(numeroEquipes) < 4) return alert("❌ Número de equipes inválido");
    if (!Number(duracaoTempo) || Number(duracaoTempo) < 2 || Number(duracaoTempo) > 45) return alert("❌ Duração inválida (2–45)");
    if (formato === "grupos") {
      if (!Number(numeroGrupos) || Number(numeroGrupos) < 2) return alert("❌ Quantidade de grupos inválida");
      if (!Number(avancamPorGrupo) || Number(avancamPorGrupo) < 1) return alert("❌ Avançam por grupo inválido");
      if (!Number(numeroEquipes) || Number(numeroEquipes) < 4) return alert("❌ Número de equipes inválido");
    }
    // validação da prorrogação 1–15
    if (formato !== "pontos_corridos" && prorrogacao) {
      if (!Number(duracaoProrrogacao) || Number(duracaoProrrogacao) < 1 || Number(duracaoProrrogacao) > 15) {
        return alert("❌ Duração da prorrogação inválida (1–15)");
      }
    }

    const payload = {
      nome: nome.trim(),
      categoria_id: categoriaId,
      formato,
      numero_equipes: Number(numeroEquipes),
      ida_volta: !!idaVolta,
      duracao_tempo: Number(duracaoTempo),
      prorrogacao: !!prorrogacao,
      duracao_prorrogacao: (formato !== "pontos_corridos" && prorrogacao) ? Number(duracaoProrrogacao) : null,
      qtd_penaltis: (formato !== "pontos_corridos") ? Number(qtdPenaltis) : 5,
      numero_grupos: (formato === "grupos") ? Number(numeroGrupos) : null,
      avancam_por_grupo: (formato === "grupos") ? Number(avancamPorGrupo) : null,
    };

    const { data, error } = await supabase
      .from("campeonatos")
      .update(payload)
      .eq("id", editando.id)
      .select("*, categorias:categoria_id(descricao)")
      .single();

    if (error) return alert("❌ Erro ao atualizar");

    // atualiza a lista sem refetch completo
    setLista(prev => prev.map(x => x.id === data.id ? data : x));
    setAbrirCadastro(false);
    setEditando(null);
    alert("✅ Campeonato atualizado!");
  }

  function abrirEquipesAtual() {
    if (!editando?.id) return;
    navigate(`/campeonatos/${editando.id}/equipes`);
  }

  async function excluirAtual() {
    if (!editando?.id) return;
    if (!confirm(`Excluir campeonato "${editando.nome}"?`)) return;
    const { error } = await supabase.from("campeonatos").delete().eq("id", editando.id);
    if (error) {
      alert("❌ Erro ao excluir campeonato.");
      return;
    }
    setLista(prev => prev.filter(x => x.id !== editando.id));
    setAbrirCadastro(false);
    setEditando(null);
    alert("✅ Campeonato excluído!");
  }

  // ====== Estados ======
  if (authLoading) {
    return (
      <div className="container"><div className="card">Carregando autenticação…</div></div>
    );
  }
  if (loading) {
    return (
      <div className="container"><div className="card">Carregando…</div></div>
    );
  }

  return (
    <div className="container">
      {/* Header ajustado ao padrão Jogadores.jsx */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* ESQUERDA: título/subtítulo */}
          <div style={{ minWidth: 220, flex: "1 1 320px" }}>
            <h1 style={{ margin: 0 }}>Campeonatos</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Crie, edite e gerencie seus campeonatos.
            </div>
          </div>

          {/* DIREITA: controles empilhados */}
          <div
            className="col"
            style={{ minWidth: 260, maxWidth: 360, flex: "0 1 360px", gap: 8 }}
          >
            <label className="label" style={{ margin: 0 }}>Ordenar:</label>
            <select
              className="select"
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="alfabetica">Ordem alfabética</option>
              <option value="mais_recente">Mais recente</option>
              <option value="mais_antigo">Mais antigo</option>
            </select>

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                className="btn btn--orange"
                onClick={() => { resetForm(); setAbrirCadastro(true); setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth"}),0); }}
              >
                + Novo Campeonato
              </button>
              <button className="btn btn--muted" onClick={() => navigate(-1)}>← Voltar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário (drawer/modal simples) */}
      {abrirCadastro && (
        <div ref={formRef} className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="collapsible__title">
              {editando ? "Editar Campeonato" : "Cadastrar Campeonato"}
            </div>
          </div>

          <div className="grid grid-2">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e)=>setNome(e.target.value)} />
            </div>

            <div>
              <label className="label">Categoria</label>
              <select className="select" value={categoriaId} onChange={(e)=>setCategoriaId(e.target.value)}>
                <option value="">Selecione…</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.descricao}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Formato</label>
              <select className="select" value={formato} onChange={(e)=>setFormato(e.target.value)}>
                <option value="pontos_corridos">Pontos Corridos</option>
                <option value="grupos">Grupos</option>
                <option value="mata_mata">Mata-mata</option>
              </select>
            </div>

            <div>
              <label className="label">Nº de equipes</label>
              <input className="input" type="number" min={4} 
                value={numeroEquipes} 
                onChange={(e)=>setNumeroEquipes(e.target.value)}
                style={{maxWidth:140}}
              />
            </div>

            <div>
              <label className="label">Ida e volta?</label>
              <input type="checkbox" className="checkbox" checked={idaVolta} onChange={(e)=>setIdaVolta(e.target.checked)} />
            </div>

            <div>
              <label className="label">Duração do tempo (min)</label>
              <input className="input" type="number" min={2} max={45} 
                value={duracaoTempo} 
                onChange={(e)=>setDuracaoTempo(e.target.value)} 
                style={{maxWidth:140}}
              />
            </div>

            {formato === "grupos" && (
              <>
                <div>
                  <label className="label">Nº de grupos</label>
                  <input className="input" type="number" min={2} 
                    value={numeroGrupos} 
                    onChange={(e)=>setNumeroGrupos(e.target.value)}
                    style={{maxWidth:140}}
                  />
                </div>
                <div>
                  <label className="label">Avançam por grupo</label>
                  <input className="input" type="number" min={1} 
                    value={avancamPorGrupo} 
                    onChange={(e)=>setAvancamPorGrupo(e.target.value)} 
                    style={{maxWidth:140}}
                  />
                </div>
              </>
            )}

            {formato !== "pontos_corridos" && (
              <>
                <div>
                  <label className="label">Prorrogação?</label>
                  <input type="checkbox" className="checkbox" checked={prorrogacao} onChange={(e)=>setProrrogacao(e.target.checked)} />
                </div>
                <div>
                  <label className="label">Duração prorrogação (1–15 min)</label>
                  <input className="input" type="number" min={1}  max={15}
                    value={duracaoProrrogacao} 
                    onChange={(e)=>setDuracaoProrrogacao(e.target.value)} 
                    disabled={!prorrogacao} 
                    style={{maxWidth:140}}
                  />
                </div>
                <div>
                  <label className="label">Qtde. pênaltis regulares (1-5)</label>
                  <input className="input" type="number" min={1} max={5} 
                    value={qtdPenaltis} 
                    onChange={(e)=>setQtdPenaltis(e.target.value)} 
                    style={{maxWidth:140}}
                  />
                </div>
              </>
            )}
          </div>

          {/* Ações do formulário: esquerda = salvar/cancelar; direita = Equipes + Excluir (apenas ao editar) */}
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn--orange"
                onClick={editando ? salvarEdicao : salvarNovo}
              >
                {editando ? "Salvar alterações" : "Salvar Campeonato"}
              </button>
              <button
                className="btn btn--muted"
                onClick={() => { setAbrirCadastro(false); setEditando(null); }}
              >
                Cancelar
              </button>
            </div>

            {editando && (
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn--primary" onClick={abrirEquipesAtual}>Equipes</button>
                <button className="btn btn--red" onClick={excluirAtual}>Excluir</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="card" style={{ padding: 0 }}>
        {listaOrdenada.length === 0 ? (
          <div className="list__item">Nenhum campeonato cadastrado.</div>
        ) : (
          <ul className="list">
            {listaOrdenada.map((c) => (
              <li key={c.id} className="list__item">
                <div className="list__left" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TeamIcon team={statusTeam(c.id)} size={isMobile ? 28 : 22} title="Status do campeonato" />
                  </span>
                  <div>
                    <div className="list__title">{c.nome}</div>
                    <div className="list__subtitle" style={isMobile ? { maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : {}}>
                      {labelFormato(c.formato)} • {c.numero_equipes} equipes • {c.categorias?.descricao || "—"} • {c.ida_volta ? "ida e volta" : "somente ida"}
                    </div>
                  </div>
                </div>
                {/* Desktop actions */}
                {!isMobile && (
                  <div className="list__right" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {/* Partidas sempre que houver quaisquer partidas */}
                    <button
                      className="btn btn--orange"
                      onClick={() => navigate(`/campeonatos/${c.id}/partidas`)}
                      disabled={!hasPartidas(c.id)}
                    >
                      Partidas
                    </button>

                    {/* Destaques por tipo de partidas existentes */}
                    {hasMataMata(c.id) && (
                      <button className="btn btn--orange" onClick={() => navigate(`/campeonatos/${c.id}/chaveamento`)}>Chaves</button>
                    )}
                    {hasLiga(c.id) && (
                      <button className="btn btn--orange" onClick={() => navigate(`/campeonatos/${c.id}/classificacao`)}>Tabela</button>
                    )}

                    <button className="btn btn--muted" onClick={() => abrirEditar(c)}>Editar</button>
                  </div>
                )}
                {/* Mobile actions */}
                {isMobile && (
                  <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }}>
                    <MenuAcoesNarrow
                      id={c.id}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={[
                        { label: "Partidas", className: "btn btn--orange", onClick: () => navigate(`/campeonatos/${c.id}/partidas`), disabled: !hasPartidas(c.id) },
                        ...(hasMataMata(c.id) ? [{ label: "Chaves", className: "btn btn--orange", onClick: () => navigate(`/campeonatos/${c.id}/chaveamento`) }] : []),
                        ...(hasLiga(c.id) ? [{ label: "Tabela", className: "btn btn--orange", onClick: () => navigate(`/campeonatos/${c.id}/classificacao`) }] : []),
                        { label: "Editar", className: "btn btn--muted", onClick: () => abrirEditar(c) }
                      ]}
                    />

                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
