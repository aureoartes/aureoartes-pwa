// src/pages/Campeonatos.jsx (atualizado)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

// Helpers
function labelFormato(v) {
  if (v === "pontos_corridos") return "Pontos Corridos";
  if (v === "grupos") return "Grupos";
  if (v === "mata_mata") return "Mata-mata";
  return v || "—";
}
function clamp(n, min, max) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

/* ========== Action Menu (mobile) ========== */
function ActionMenu({ onEditar, onExcluir, onEquipes, onTabela, onPartidas }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDoc(e) {
      const panel = document.querySelector(".action-menu__panel");
      if (!panel) return;
      if (!panel.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  return (
    <div className="action-menu">
      <button className="btn btn--orange" onClick={() => setOpen((o) => !o)}>Ações ▾</button>
      {open && (
        <div className="action-menu__panel">
          <button className="action-menu__item" onClick={() => { setOpen(false); onEquipes(); }}>Equipes</button>
          <button className="action-menu__item" onClick={() => { setOpen(false); onTabela(); }}>Tabela</button>
          <button className="action-menu__item" onClick={() => { setOpen(false); onPartidas(); }}>Partidas</button>
          <button className="action-menu__item" onClick={() => { setOpen(false); onEditar(); }}>Editar</button>
          <button className="action-menu__item action-menu__item--danger" onClick={() => { setOpen(false); onExcluir(); }}>Excluir</button>
        </div>
      )}
    </div>
  );
}

export default function Campeonatos() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [ordenacao, setOrdenacao] = useState("alfabetica");
  const [loading, setLoading] = useState(true);

  // Cadastro/edição
  const [abrirCadastro, setAbrirCadastro] = useState(false); // agora inicia oculto
  const [editandoId, setEditandoId] = useState(null);
  const [temPartidas, setTemPartidas] = useState(false);

  // Partidas por campeonato (para habilitar Tabela/Partidas)
  const [campIdsComPartidas, setCampIdsComPartidas] = useState(new Set());

  // Passo 1
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [formato, setFormato] = useState("pontos_corridos");
  const [numeroEquipes, setNumeroEquipes] = useState(4);
  const [idaVolta, setIdaVolta] = useState(false);
  const [passo1Confirmado, setPasso1Confirmado] = useState(false);

  // Passo 2
  const [duracaoTempo, setDuracaoTempo] = useState(10);
  const [prorrogacao, setProrrogacao] = useState(false);
  const [duracaoProrrogacao, setDuracaoProrrogacao] = useState(5);
  const [qtdPenaltis, setQtdPenaltis] = useState(5);
  const [numeroGrupos, setNumeroGrupos] = useState(2);
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(1);

  const isPontos = formato === "pontos_corridos";
  const isGrupos = formato === "grupos";
  const isMataMata = formato === "mata_mata";

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Carrega campeonatos do usuário
      const { data: camps } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("usuario_id", USUARIO_ID);
      setLista(camps || []);

      // Carrega se há partidas por campeonato (para travas dos botões)
      const ids = (camps || []).map((c) => c.id);
      if (ids.length) {
        const { data: ps } = await supabase
          .from("partidas")
          .select("campeonato_id")
          .in("campeonato_id", ids);
        const setIds = new Set((ps || []).map((p) => p.campeonato_id));
        setCampIdsComPartidas(setIds);
      } else {
        setCampIdsComPartidas(new Set());
      }

      setLoading(false);
    })();
  }, []);

  const listaOrdenada = useMemo(() => {
    const arr = [...(lista || [])];
    if (ordenacao === "alfabetica") {
      arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    } else if (ordenacao === "mais_recente") {
      arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    } else {
      arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    }
    return arr;
  }, [lista, ordenacao]);

  function resetForm() {
    setEditandoId(null);
    setTemPartidas(false);
    setPasso1Confirmado(false);
    setNome("");
    setCategoria("Futebol de Botão");
    setFormato("pontos_corridos");
    setNumeroEquipes(4);
    setIdaVolta(false);
    setDuracaoTempo(10);
    setProrrogacao(false);
    setDuracaoProrrogacao(5);
    setQtdPenaltis(5);
    setNumeroGrupos(2);
    setAvancamPorGrupo(1);
  }

  async function handleEditar(c) {
    resetForm();
    setEditandoId(c.id);
    setAbrirCadastro(true); // abre cadastro apenas ao editar

    // Passo 1
    setNome(c.nome || "");
    setCategoria(c.categoria || "Futebol de Botão");
    setFormato(c.formato || "pontos_corridos");
    setNumeroEquipes(c.numero_equipes || 4);
    setIdaVolta(!!c.ida_volta);

    // Passo 2
    setDuracaoTempo(c.duracao_tempo || 10);
    setProrrogacao(!!c.prorrogacao);
    setDuracaoProrrogacao(c.duracao_prorrogacao || 5);
    setQtdPenaltis(c.qtd_penaltis ?? 5);
    setNumeroGrupos(c.numero_grupos || 2);
    setAvancamPorGrupo(c.avancam_por_grupo || 1);

    // Checar se tem partidas vinculadas
    const { count } = await supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .eq("campeonato_id", c.id);
    setTemPartidas((count || 0) > 0);
  }

  async function handleExcluir(c) {
    const ok = confirm(`Excluir campeonato "${c.nome}"? As partidas vinculadas serão removidas.`);
    if (!ok) return;
    const { error } = await supabase.from("campeonatos").delete().eq("id", c.id);
    if (error) {
      alert("❌ Erro ao excluir.");
      return;
    }
    setLista((prev) => prev.filter((x) => x.id !== c.id));
  }

  function validarPasso1() {
    if (!nome.trim()) return "Informe o nome do campeonato.";
    if (isPontos && numeroEquipes < 4) return "Pontos corridos exigem no mínimo 4 equipes.";
    if (isMataMata && numeroEquipes < 4) return "Mata-mata exige no mínimo 4 equipes.";
    if (isGrupos) {
      if (numeroGrupos < 2) return "Fase de grupos exige no mínimo 2 grupos.";
      if (numeroEquipes < 6) return "Para grupos, use no mínimo 6 equipes (ex.: 2 grupos de 3).";
      if (avancamPorGrupo < 1) return "Avançam por grupo deve ser pelo menos 1.";
      const minPorGrupo = 3;
      if (Math.floor(numeroEquipes / numeroGrupos) < minPorGrupo) {
        return `Cada grupo deve ter no mínimo ${minPorGrupo} equipes (ajuste nº de equipes ou de grupos).`;
      }
    }
    return null;
  }

  function confirmarPasso1() {
    const erro = validarPasso1();
    if (erro) { alert("❌ " + erro); return; }
    setPasso1Confirmado(true);
  }

  function cancelarEdicao() {
    resetForm();
    setAbrirCadastro(false); // fecha cadastro
  }

  async function handleSalvarCampeonato() {
    const tempo = clamp(duracaoTempo, 2, 45);
    const prorroga = !!prorrogacao;
    const durPror = clamp(duracaoProrrogacao, 2, Math.max(15, tempo));
    const pen = clamp(qtdPenaltis, 1, 5);

    const payload = {
      usuario_id: USUARIO_ID,
      nome: nome.trim(),
      categoria,
      formato,
      numero_equipes: Number(numeroEquipes),
      ida_volta: !!idaVolta,
      duracao_tempo: tempo,
      prorrogacao: prorroga,
      duracao_prorrogacao: prorroga ? durPror : null,
      qtd_penaltis: pen,
      numero_grupos: isGrupos ? Number(numeroGrupos) : null,
      avancam_por_grupo: isGrupos ? Number(avancamPorGrupo) : null,
    };

    if (editandoId) {
      const { error } = await supabase.from("campeonatos").update(payload).eq("id", editandoId);
      if (error) { alert("❌ Erro ao atualizar."); return; }
      const { data } = await supabase.from("campeonatos").select("*").eq("usuario_id", USUARIO_ID);
      setLista(data || []);
      alert("✅ Campeonato atualizado!");
    } else {
      const { data, error } = await supabase.from("campeonatos").insert([payload]).select().single();
      if (error) { alert("❌ Erro ao salvar."); return; }
      setLista((prev) => [data, ...(prev || [])]);
      alert("✅ Campeonato criado!");
    }

    cancelarEdicao();
  }

  // Campos desabilitados quando tem partidas
  const lockFormato = temPartidas;
  const lockNumEquipes = temPartidas;
  const lockIdaVolta = temPartidas;
  const lockGrupos = temPartidas;

  const hasPartidas = (campId) => campIdsComPartidas.has(campId);

  return (
    <div className="container">
      {/* Header + ordenação */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Campeonatos</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
              Crie, edite e gerencie seus campeonatos. Liste equipes e partidas.
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <label className="label" style={{ margin: 0 }}>Ordenar:</label>
            <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
              <option value="alfabetica">Ordem alfabética</option>
              <option value="mais_recente">Mais recente</option>
              <option value="mais_antigo">Mais antigo</option>
            </select>
            <button className="btn btn--orange" onClick={() => { resetForm(); setAbrirCadastro(true); }}>
              Novo Campeonato
            </button>
          </div>
        </div>
      </div>

      {/* Cadastro/edição — AGORA 100% OCULTO QUANDO fechar */}
      {abrirCadastro && (
        <div className="card collapsible" style={{ marginBottom: 12 }}>
          <button className="collapsible__header" onClick={() => setAbrirCadastro((v) => !v)} aria-expanded={abrirCadastro}>
            <div>
              <div className="collapsible__title">{editandoId ? "Editar Campeonato" : "Cadastrar Campeonato"}</div>
              <div className="collapsible__subtitle">Preencha o passo 1, confirme, e depois conclua no passo 2.</div>
            </div>
            <div className={`chevron ${abrirCadastro ? "chevron--up" : ""}`} />
          </button>

          {abrirCadastro && (
            <div className="collapsible__body">
              {/* Passo 1 */}
              <div className="card card--soft" style={{ padding: 12, marginBottom: 10, opacity: 1 }}>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Passo 1</h3>
                <div className="grid grid-2">
                  <div className="field">
                    <label className="label">Nome</label>
                    <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Categoria</label>
                    <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                      <option>Futebol de Botão</option>
                      <option>Futebol de Campo</option>
                      <option>Futsal</option>
                      <option>Society</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Formato</label>
                    <select className="select" value={formato} onChange={(e) => setFormato(e.target.value)} disabled={lockFormato}>
                      <option value="pontos_corridos">Pontos Corridos</option>
                      <option value="grupos">Grupos</option>
                      <option value="mata_mata">Mata-mata</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Número de equipes</label>
                    <input type="number" className="input" min={isPontos || isMataMata ? 4 : 6} value={numeroEquipes} onChange={(e) => setNumeroEquipes(Number(e.target.value))} disabled={lockNumEquipes} />
                  </div>
                  <div className="field">
                    <label className="label">Ida e volta?</label>
                    <select className="select" value={idaVolta ? "sim" : "nao"} onChange={(e) => setIdaVolta(e.target.value === "sim")} disabled={lockIdaVolta}>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </div>
                  {isGrupos && (
                    <>
                      <div className="field">
                        <label className="label">Quantidade de grupos</label>
                        <input type="number" className="input" min={2} value={numeroGrupos} onChange={(e) => setNumeroGrupos(Number(e.target.value))} disabled={lockGrupos} />
                      </div>
                      <div className="field">
                        <label className="label">Avançam por grupo</label>
                        <input type="number" className="input" min={1} value={avancamPorGrupo} onChange={(e) => setAvancamPorGrupo(Number(e.target.value))} disabled={lockGrupos} />
                      </div>
                    </>
                  )}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  {!passo1Confirmado ? (
                    <button className="btn btn--orange" onClick={confirmarPasso1}>Confirmar Passo 1</button>
                  ) : (
                    <span className="badge">Passo 1 confirmado</span>
                  )}
                </div>
              </div>

              {/* Passo 2 */}
              <div className="card card--soft" style={{ padding: 12, opacity: passo1Confirmado ? 1 : 0.5, pointerEvents: passo1Confirmado ? "auto" : "none" }}>
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>Passo 2</h3>
                <div className="grid grid-2">
                  <div className="field">
                    <label className="label">Duração de cada tempo (min)</label>
                    <input type="number" className="input" min={2} max={45} value={duracaoTempo} onChange={(e) => setDuracaoTempo(clamp(e.target.value, 2, 45))} />
                  </div>
                  {(isMataMata || isGrupos) && (
                    <div className="field">
                      <label className="label">Prorrogação no mata-mata?</label>
                      <select className="select" value={prorrogacao ? "sim" : "nao"} onChange={(e) => setProrrogacao(e.target.value === "sim")}> 
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </div>
                  )}
                  {isGrupos && (
                    <>
                      <div className="field">
                        <label className="label">Quantidade de grupos</label>
                        <input className="input" type="number" min={2} value={numeroGrupos} onChange={(e) => setNumeroGrupos(Number(e.target.value))} disabled={lockGrupos} />
                      </div>
                      <div className="field">
                        <label className="label">Avançam por grupo</label>
                        <input className="input" type="number" min={1} value={avancamPorGrupo} onChange={(e) => setAvancamPorGrupo(Number(e.target.value))} disabled={lockGrupos} />
                      </div>
                    </>
                  )}
                  {(isMataMata || isGrupos) && (
                    <>
                      <div className="field">
                        <label className="label">Duração da prorrogação (min)</label>
                        <input type="number" className="input" min={2} max={Math.max(15, duracaoTempo)} value={duracaoProrrogacao} onChange={(e) => setDuracaoProrrogacao(clamp(e.target.value, 2, Math.max(15, duracaoTempo)))} disabled={!prorrogacao} />
                      </div>
                      <div className="field">
                        <label className="label">Quantidade de penaltis regulares</label>
                        <input type="number" className="input" min={1} max={5} value={qtdPenaltis} onChange={(e) => setQtdPenaltis(clamp(e.target.value, 1, 5))} />
                      </div>
                    </>
                  )}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn btn--orange" onClick={handleSalvarCampeonato}>{editandoId ? "Salvar" : "Criar Campeonato"}</button>
                  <button className="btn btn--muted" onClick={cancelarEdicao}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="card" style={{ padding: 0 }}>
        <ul className="list">
          {loading ? (
            <li className="list__item"><div>Carregando…</div></li>
          ) : (listaOrdenada || []).length === 0 ? (
            <li className="list__item"><div className="text-muted">Nenhum campeonato cadastrado.</div></li>
          ) : (
            listaOrdenada.map((c) => {
              const tem = hasPartidas(c.id);
              return (
                <li key={c.id} className="list__item">
                  <div className="list__left" style={{ minWidth: 0 }}>
                    <div>
                      <div className="list__title">{c.nome}</div>
                      <div className="list__subtitle">{c.categoria} · {labelFormato(c.formato)} · {c.numero_equipes} equipes</div>
                    </div>
                  </div>

                  {/* Ações no desktop */}
                  <div className="row hide-sm" style={{ gap: 8 }}>
                    <button className="btn btn--orange" onClick={() => handleEditar(c)}>Editar</button>
                    <button className="btn btn--red" onClick={() => handleExcluir(c)}>Excluir</button>
                    <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/equipes`)}>Equipes</button>
                    {/* NOVO: Tabela entre Equipes e Partidas */}
                    <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/classificacao`)} disabled={!tem} title={tem ? "Ver Tabela" : "Gere partidas para habilitar"}>Tabela</button>
                    <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/partidas`)} disabled={!tem} title={tem ? "Ver Partidas" : "Gere partidas para habilitar"}>Partidas</button>
                  </div>

                  {/* Ações no mobile (menu compacto) */}
                  <div className="show-sm">
                    <ActionMenu
                      onEditar={() => handleEditar(c)}
                      onExcluir={() => handleExcluir(c)}
                      onEquipes={() => navigate(`/campeonatos/${c.id}/equipes`)}
                      onTabela={() => (tem ? navigate(`/campeonatos/${c.id}/classificacao`) : alert("Gere partidas para habilitar"))}
                      onPartidas={() => (tem ? navigate(`/campeonatos/${c.id}/partidas`) : alert("Gere partidas para habilitar"))}
                    />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
