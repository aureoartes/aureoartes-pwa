// src/pages/Campeonatos.jsx — corrigido: MenuAcoesNarrow visível apenas no mobile, sem pílula extra
import { useEffect, useMemo, useState } from "react";
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
  }

  async function abrirEditar(c) {
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
  }

  async function excluir(c) {
    const ok = confirm(`Excluir campeonato "${c.nome}"?`);
    if (!ok) return;
    await supabase.from("campeonatos").delete().eq("id", c.id);
    setLista((prev) => prev.filter((x) => x.id !== c.id));
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
                <li key={c.id} className="list__item">
                  <div className="list__left" style={{ minWidth: 0 }}>
                    <div>
                      <div className="list__title">{c.nome}</div>
                      <div className="list__subtitle">{c.categoria} · {labelFormato(c.formato)} · {c.numero_equipes} equipes</div>
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className="row hide-sm" style={{ gap: 8 }}>
                    <button className="btn btn--orange" onClick={() => abrirEditar(c)}>Editar</button>
                    <button className="btn btn--red" onClick={() => excluir(c)}>Excluir</button>
                    <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/equipes`)}>Equipes</button>
                    {showTabela && (
                      <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/classificacao`)} disabled={!tem}>Tabela</button>
                    )}
                    {showPartidas && (
                      <button className="btn btn--muted" onClick={() => navigate(`/campeonatos/${c.id}/partidas`)} disabled={!tem}>Partidas</button>
                    )}
                  </div>
                  {/* Mobile */}
                  <div className="show-sm" style={{ zIndex: 5 }}>
                    <MenuAcoesNarrow
                      onEditar={() => abrirEditar(c)}
                      onExcluir={() => excluir(c)}
                      onEquipes={() => navigate(`/campeonatos/${c.id}/equipes`)}
                      {...(showTabela ? { onTabela: () => tem ? navigate(`/campeonatos/${c.id}/classificacao`) : alert("Gere partidas para habilitar") } : {})}
                      {...(showPartidas ? { onPartidas: () => tem ? navigate(`/campeonatos/${c.id}/partidas`) : alert("Gere partidas para habilitar") } : {})}
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
