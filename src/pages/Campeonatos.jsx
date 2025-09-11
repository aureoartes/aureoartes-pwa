// src/pages/Campeonatos.jsx — (V1)
// Ajuste: título e subtítulo em blocos separados no mobile
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import MenuAcoesNarrow from "../components/MenuAcoesNarrow";
import { USUARIO_ID } from "../config/appUser";

function labelFormato(v) {
  if (v === "pontos_corridos") return "Pontos Corridos";
  if (v === "grupos") return "Grupos";
  if (v === "mata_mata") return "Mata-mata";
  return v || "—";
}

export default function Campeonatos() {
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordenacao, setOrdenacao] = useState("alfabetica");
  const [campIdsComPartidas, setCampIdsComPartidas] = useState(new Set());

  const [abrirCadastro, setAbrirCadastro] = useState(false);
  const [editando, setEditando] = useState(null);

  const [nome, setNome] = useState("");
  const [idaVolta, setIdaVolta] = useState(false);
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [formato, setFormato] = useState("pontos_corridos");
  const [numeroEquipes, setNumeroEquipes] = useState(4);
  const [duracaoTempo, setDuracaoTempo] = useState(10);
  const [numeroGrupos, setNumeroGrupos] = useState(2);
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(1);
  const [prorrogacao, setProrrogacao] = useState(false);
  const [duracaoProrrogacao, setDuracaoProrrogacao] = useState(5);
  const [qtdPenaltis, setQtdPenaltis] = useState(5);

  // menu mobile controlado
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: camps } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("usuario_id", USUARIO_ID);
      setLista(camps || []);

      const ids = (camps || []).map((c) => c.id);
      if (ids.length) {
        const { data: ps } = await supabase
          .from("partidas")
          .select("campeonato_id")
          .in("campeonato_id", ids);
        setCampIdsComPartidas(new Set((ps || []).map((p) => p.campeonato_id)));
      } else {
        setCampIdsComPartidas(new Set());
      }
      setLoading(false);
    })();
  }, []);

  const listaOrdenada = useMemo(() => {
    const arr = [...(lista || [])];
    if (ordenacao === "alfabetica") return arr.sort((a, b) => (a?.nome || "").localeCompare(b?.nome || ""));
    if (ordenacao === "mais_recente") return arr.sort((a, b) => (b?.criado_em || "").localeCompare(a?.criado_em || ""));
    if (ordenacao === "mais_antigo") return arr.sort((a, b) => (a?.criado_em || "").localeCompare(b?.criado_em || ""));
    return arr;
  }, [lista, ordenacao]);

  const hasPartidas = (campId) => campIdsComPartidas.has(campId);

  function resetForm() {
    setEditando(null);
    setNome("");
    setIdaVolta(false);
    setCategoria("Futebol de Botão");
    setFormato("pontos_corridos");
    setNumeroEquipes(4);
    setDuracaoTempo(10);
    setNumeroGrupos(2);
    setAvancamPorGrupo(1);
    setProrrogacao(false);
    setDuracaoProrrogacao(5);
    setQtdPenaltis(5);
  }

  function abrirNovo() {
    resetForm();
    setAbrirCadastro(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function abrirEditar(c) {
    setEditando(c);
    setNome(c.nome ?? "");
    setIdaVolta(!!c.ida_volta);
    setCategoria(c.categoria ?? "Futebol de Botão");
    setFormato(c.formato ?? "pontos_corridos");
    setNumeroEquipes(c.numero_equipes ?? 4);
    setDuracaoTempo(c.duracao_tempo ?? 10);
    setNumeroGrupos(c.numero_grupos ?? 2);
    setAvancamPorGrupo(c.avancam_por_grupo ?? 1);
    setProrrogacao(!!c.prorrogacao);
    setDuracaoProrrogacao(c.duracao_prorrogacao ?? 5);
    setQtdPenaltis(c.qtd_penaltis ?? 5);
    setAbrirCadastro(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  async function excluir(c) {
    if (!confirm(`Excluir campeonato "${c.nome}"?`)) return;
    await supabase.from("campeonatos").delete().eq("id", c.id);
    setLista((prev) => prev.filter((x) => x.id !== c.id));
  }

  function validar() {
    if (!nome.trim()) return "Informe o nome";
    if (!Number(numeroEquipes) || Number(numeroEquipes) < 2) return "Número de equipes inválido";
    if (!Number(duracaoTempo) || Number(duracaoTempo) < 2 || Number(duracaoTempo) > 45) return "Duração inválida (2–45)";
    if (formato === "grupos") {
      if (!Number(numeroGrupos) || Number(numeroGrupos) < 2) return "Quantidade de grupos inválida";
      if (!Number(avancamPorGrupo) || Number(avancamPorGrupo) < 1) return "Avançam por grupo inválido";
    }
    if (formato !== "pontos_corridos") {
      if (prorrogacao && (!Number(duracaoProrrogacao) || Number(duracaoProrrogacao) < 2)) return "Duração da prorrogação inválida";
      if (!Number(qtdPenaltis) || Number(qtdPenaltis) < 1 || Number(qtdPenaltis) > 5) return "Pênaltis deve ser 1–5";
    }
    return null;
  }

  async function salvar() {
    const erro = validar();
    if (erro) return alert("❌ " + erro);

    const base = {
      usuario_id: USUARIO_ID,
      nome: nome.trim(),
      categoria,
      formato,
      numero_equipes: Number(numeroEquipes),
      ida_volta: !!idaVolta,
      duracao_tempo: Number(duracaoTempo),
      prorrogacao: !!prorrogacao,
      duracao_prorrogacao: (formato !== "pontos_corridos" && prorrogacao) ? Number(duracaoProrrogacao) : null,
      qtd_penaltis: (formato !== "pontos_corridos") ? Number(qtdPenaltis) : 5,
    };
    const payload = (formato === "grupos")
      ? { ...base, numero_grupos: Number(numeroGrupos), avancam_por_grupo: Number(avancamPorGrupo) }
      : base;

    if (editando?.id) {
      const { error } = await supabase.from("campeonatos").update(payload).eq("id", editando.id);
      if (error) return alert("❌ Erro ao atualizar");
      alert("✅ Campeonato atualizado!");
     } else {
      const { data, error } = await supabase
        .from("campeonatos")
        .insert([payload])
        .select()
        .single();
      if (error) return alert("❌ Erro ao salvar");
      alert("✅ Campeonato criado!");
      if (data?.id) {
        navigate(`/campeonatos/${data.id}/equipes`);
        return;
      }
    }
    const { data } = await supabase.from("campeonatos").select("*").eq("usuario_id", USUARIO_ID);
    setLista(data || []);
    setAbrirCadastro(false);
    setEditando(null);
  }

  return (
    <div className="container">
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Campeonatos</h1>
            <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>Crie, edite e gerencie seus campeonatos.</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <label className="label" style={{ margin: 0 }}>Ordenar:</label>
            <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)}>
              <option value="alfabetica">Ordem alfabética</option>
              <option value="mais_recente">Mais recente</option>
              <option value="mais_antigo">Mais antigo</option>
            </select>
            <button className="btn btn--orange" onClick={abrirNovo}>+ Novo Campeonato</button>
          </div>
        </div>
      </div>

      {abrirCadastro && (
        <div ref={formRef} className="card" style={{ marginBottom: 12, padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div className="collapsible__title">{editando ? "Editar Campeonato" : "Cadastrar Campeonato"}</div>
          </div>
          <div className="grid grid-2">
            {/* Linha 1 */}
            <div className="field">
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Ida e Volta?</label>
              <select className="select" value={idaVolta ? "sim" : "nao"} onChange={(e) => setIdaVolta(e.target.value === "sim")}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>

            {/* Linha 2 */}
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
              <select className="select" value={formato} onChange={(e) => setFormato(e.target.value)}>
                <option value="pontos_corridos">Pontos Corridos</option>
                <option value="grupos">Grupos</option>
                <option value="mata_mata">Mata-mata</option>
              </select>
            </div>

            {/* Linha 3 */}
            <div className="field">
              <label className="label">Quantidade de Equipes</label>
              <input type="number" className="input" min={2} value={numeroEquipes} onChange={(e) => setNumeroEquipes(Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="label">Duração de Cada Tempo (min)</label>
              <input type="number" className="input" min={2} max={45} value={duracaoTempo} onChange={(e) => setDuracaoTempo(Number(e.target.value))} />
            </div>

            {/* Linha 4 — apenas grupos */}
            {formato === "grupos" && (
              <>
                <div className="field">
                  <label className="label">Quantidade de Grupos</label>
                  <input type="number" className="input" min={2} value={numeroGrupos} onChange={(e) => setNumeroGrupos(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label className="label">Avançam por Grupo</label>
                  <input type="number" className="input" min={1} value={avancamPorGrupo} onChange={(e) => setAvancamPorGrupo(Number(e.target.value))} />
                </div>
              </>
            )}

            {/* Linha 5 — grupos e mata-mata */}
            {(formato === "grupos" || formato === "mata_mata") && (
              <>
                <div className="field">
                  <label className="label">Prorrogação?</label>
                  <select className="select" value={prorrogacao ? "sim" : "nao"} onChange={(e) => setProrrogacao(e.target.value === "sim")}>
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Duração da prorrogação (min)</label>
                  <input type="number" className="input" min={2} value={duracaoProrrogacao} onChange={(e) => setDuracaoProrrogacao(Number(e.target.value))} disabled={!prorrogacao} />
                </div>
              </>
            )}

            {/* Linha 6 — grupos e mata-mata */}
            {(formato === "grupos" || formato === "mata_mata") && (
              <div className="field">
                <label className="label">Quantidade de pênaltis regulares</label>
                <input type="number" className="input" min={1} max={5} value={qtdPenaltis} onChange={(e) => setQtdPenaltis(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn--orange" onClick={salvar}>{editando ? "Salvar" : "Criar Campeonato"}</button>
            <button className="btn btn--muted" onClick={() => { setAbrirCadastro(false); setEditando(null); }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <ul className="list">
          {loading ? (
            <li className="list__item"><div>Carregando…</div></li>
          ) : (listaOrdenada || []).length === 0 ? (
            <li className="list__item"><div className="text-muted">Nenhum campeonato cadastrado.</div></li>
          ) : (
            listaOrdenada.map((c) => {
              const tem = hasPartidas(c.id);
              const isMataMata = c.formato === "mata_mata";
              const showTabela = !isMataMata;
              const showPartidas = isMataMata;
              return (
                <li key={c.id} className="list__item" style={{ paddingTop: 4, paddingBottom: 4, minHeight: "unset" }}>
                  <div className="list__left" style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }}>
                    <div className="list__title" style={{ textAlign: "left", marginBottom: 2, display: "block", width: "100%", fontSize: "1rem" }}>{c.nome}</div>
                    <div className="list__subtitle" style={{ fontSize: "0.8rem", color: "#555", textAlign: "left", marginTop: 2, display: "block", width: "100%" }}>
                      {c.categoria} · {labelFormato(c.formato)} · {c.numero_equipes} equipes
                    </div>
                  </div>

                  {/* Desktop actions */}
                  <div className="row hide-sm" style={{ gap: 6 }}>
                    <button className="btn btn--orange" onClick={() => abrirEditar(c)}>Editar</button>
                    <button className="btn btn--red" onClick={() => excluir(c)}>Excluir</button>
                    <button className="btn btn--muted btn--sm" onClick={() => navigate(`/campeonatos/${c.id}/equipes`)}>Equipes</button>
                    {showTabela && (
                      <button className="btn btn--muted btn--sm" onClick={() => navigate(`/campeonatos/${c.id}/classificacao`)} disabled={!tem}>Tabela</button>
                    )}
                    {showPartidas && (
                      <button className="btn btn--muted btn--sm" onClick={() => navigate(`/campeonatos/${c.id}/partidas`)} disabled={!tem}>Partidas</button>
                    )}
                  </div>

                  {/* Mobile actions */}
                  <div className="show-sm">
                    <MenuAcoesNarrow
                      id={c.id}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={[
                        { label: "Equipes", onClick: () => navigate(`/campeonatos/${c.id}/equipes`) },
                        showTabela ? { label: "Tabela", disabled: !tem, onClick: () => tem && navigate(`/campeonatos/${c.id}/classificacao`) } : null,
                        showPartidas ? { label: "Partidas", disabled: !tem, onClick: () => tem && navigate(`/campeonatos/${c.id}/partidas`) } : null,
                        { label: "Editar", onClick: () => abrirEditar(c) },
                        { label: "Excluir", variant: "red", onClick: () => excluir(c) },
                      ].filter(Boolean)}
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
