import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import PageHeader from "../components/PageHeader";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

const CATEGORIAS = [
  "Futebol de Botão",
  "Futebol de Campo",
  "Futsal",
  "Society",
];

const FORMATOS = [
  { value: "pontos_corridos", label: "Pontos Corridos" },
  { value: "grupos", label: "Grupos" },
  { value: "mata_mata", label: "Mata-mata" },
];

export default function Campeonatos() {
  // plano / limite
  const [maxTimesPlano, setMaxTimesPlano] = useState(16);

  // form
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [formato, setFormato] = useState("pontos_corridos");
  const [numeroEquipes, setNumeroEquipes] = useState("");
  const [idaVolta, setIdaVolta] = useState(false);

  const [numeroGrupos, setNumeroGrupos] = useState("");
  const [avancamPorGrupo, setAvancamPorGrupo] = useState("");

  const [duracaoTempo, setDuracaoTempo] = useState(10);
  const [prorrogacao, setProrrogacao] = useState(false); // só para mata-mata (inclui mata-mata pós-grupos)
  const [duracaoProrrogacao, setDuracaoProrrogacao] = useState(5);
  const [qtdPenaltis, setQtdPenaltis] = useState(5);

  const [editandoId, setEditandoId] = useState(null);

  // listagem
  const [itens, setItens] = useState([]);
  const [sortBy, setSortBy] = useState("alpha"); // alpha | recent | oldest

  useEffect(() => {
    fetchPlanoMax();
    fetchCampeonatos();
  }, []);

  async function fetchPlanoMax() {
    // 1) busca usuario (plano_id)
    const { data: user, error: e1 } = await supabase
      .from("usuarios")
      .select("plano_id")
      .eq("id", USUARIO_ID)
      .single();

    if (e1 || !user?.plano_id) {
      setMaxTimesPlano(16); // fallback
      return;
    }

    // 2) busca plano -> max_times
    const { data: plano, error: e2 } = await supabase
      .from("planos")
      .select("max_times")
      .eq("id", user.plano_id)
      .single();

    if (!e2 && plano?.max_times) {
      setMaxTimesPlano(plano.max_times);
    } else {
      setMaxTimesPlano(16);
    }
  }

  async function fetchCampeonatos() {
    const { data, error } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("criado_em", { ascending: false });

    if (!error) setItens(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setNome("");
    setCategoria("Futebol de Botão");
    setFormato("pontos_corridos");
    setNumeroEquipes("");
    setIdaVolta(false);
    setNumeroGrupos("");
    setAvancamPorGrupo("");
    setDuracaoTempo(10);
    setProrrogacao(false);
    setDuracaoProrrogacao(5);
    setQtdPenaltis(5);
  }

  // ======== Validações de negócio =========
  function validate() {
    // limites gerais
    const nEquipes = parseInt(numeroEquipes || "0", 10);
    if (!nome.trim()) return "Informe o nome do campeonato.";
    if (!nEquipes || nEquipes < 1) return "Informe o número de equipes.";
    if (nEquipes > maxTimesPlano)
      return `Seu plano permite no máximo ${maxTimesPlano} times.`;

    // duração dos tempos (2..45)
    const t = parseInt(duracaoTempo, 10);
    if (isNaN(t) || t < 2 || t > 45) return "Duração de cada tempo deve estar entre 2 e 45 minutos.";

    // prorrogação (2..15) ou igual à duração do tempo (você pediu até 15 ou duração da partida;
    // aqui interpretamos como duração do tempo, mantendo 2..15. Ajusto se quiser permitir =duracaoTempo)
    if (prorrogacao) {
      const tp = parseInt(duracaoProrrogacao, 10);
      if (isNaN(tp) || tp < 2 || tp > Math.min(15, t))
        return "Duração da prorrogação deve ser entre 2 e 15 e não maior que a duração do tempo.";
    }

    // pênaltis (1..5)
    const qp = parseInt(qtdPenaltis, 10);
    if (isNaN(qp) || qp < 1 || qp > 5) return "Quantidade de pênaltis deve ser entre 1 e 5.";

    // regras por formato
    if (formato === "pontos_corridos") {
      if (nEquipes < 4) return "Pontos corridos exige no mínimo 4 times.";
      // ok; ida/volta já está no form
    }

    if (formato === "grupos") {
      const ng = parseInt(numeroGrupos || "0", 10);
      const av = parseInt(avancamPorGrupo || "0", 10);

      if (!ng || ng < 2) return "Formato em grupos exige no mínimo 2 grupos.";
      // min 3 times por grupo
      if (nEquipes < ng * 3)
        return `Com ${ng} grupos, é necessário no mínimo ${ng * 3} times (mínimo 3 por grupo).`;

      // regra de avanço: min 1 e máximo (menor grupo - 1)
      const menorGrupo = Math.floor(nEquipes / ng); // aprox; se quiser dividir exato depois
      const maxAvanco = Math.max(1, menorGrupo - 1);
      if (!av || av < 1) return "Avanços por grupo deve ser no mínimo 1.";
      if (av > maxAvanco)
        return `Avanços por grupo deve ser no máximo ${maxAvanco}, considerando o grupo com menos times.`;

      // prorrogação/pênaltis aplicam-se somente na fase mata-mata (após grupos)
    }

    if (formato === "mata_mata") {
      if (nEquipes < 4) return "Mata-mata exige no mínimo 4 times.";
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(`❌ ${err}`);
      return;
    }

    const payload = {
      usuario_id: USUARIO_ID,
      nome,
      categoria,
      formato,
      numero_equipes: numeroEquipes ? parseInt(numeroEquipes, 10) : null,
      ida_volta: !!idaVolta,
      numero_grupos: formato === "grupos" ? (numeroGrupos ? parseInt(numeroGrupos, 10) : null) : null,
      avancam_por_grupo:
        formato === "grupos" ? (avancamPorGrupo ? parseInt(avancamPorGrupo, 10) : null) : null,
      duracao_tempo: parseInt(duracaoTempo, 10),
      prorrogacao: formato !== "pontos_corridos" ? !!prorrogacao : false,
      duracao_prorrogacao:
        formato !== "pontos_corridos" && prorrogacao
          ? parseInt(duracaoProrrogacao, 10)
          : null,
      qtd_penaltis: parseInt(qtdPenaltis, 10),
    };

    if (editandoId) {
      const { error } = await supabase
        .from("campeonatos")
        .update(payload)
        .eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar campeonato");
      alert("✅ Campeonato atualizado!");
    } else {
      const { error } = await supabase.from("campeonatos").insert([payload]);
      if (error) return alert("❌ Erro ao cadastrar campeonato");
      alert("✅ Campeonato cadastrado!");
    }

    resetForm();
    fetchCampeonatos();
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este campeonato?")) return;
    const { error } = await supabase.from("campeonatos").delete().eq("id", id);
    if (!error) setItens((prev) => prev.filter((c) => c.id !== id));
  }

  function handleEdit(c) {
    setEditandoId(c.id);
    setNome(c.nome || "");
    setCategoria(c.categoria || "Futebol de Botão");
    setFormato(c.formato || "pontos_corridos");
    setNumeroEquipes(c.numero_equipes ?? "");
    setIdaVolta(!!c.ida_volta);
    setNumeroGrupos(c.numero_grupos ?? "");
    setAvancamPorGrupo(c.avancam_por_grupo ?? "");
    setDuracaoTempo(c.duracao_tempo ?? 10);
    setProrrogacao(!!c.prorrogacao);
    setDuracaoProrrogacao(c.duracao_prorrogacao ?? 5);
    setQtdPenaltis(c.qtd_penaltis ?? 5);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const itensOrdenados = useMemo(() => {
    const arr = [...itens];
    if (sortBy === "alpha") {
      arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    } else if (sortBy === "recent") {
      arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    } else if (sortBy === "oldest") {
      arr.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    }
    return arr;
  }, [itens, sortBy]);

  const helperPlano = `Seu plano permite no máx. ${maxTimesPlano} times por campeonato.`;

  return (
    <div>
      <PageHeader
        title="Campeonatos"
        subtitle="Defina o formato, categorias e regras (tempo, prorrogação, pênaltis)."
      />

      <div className="container" style={{ padding: 20 }}>
        <div className="grid" style={{ gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          {/* FORM */}
          <form onSubmit={handleSubmit} className="card p-6 sticky" style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{editandoId ? "Editar Campeonato" : "Novo Campeonato"}</h2>

            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label className="label">Categoria</label>
              <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Formato</label>
                <select
                  className="select"
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                >
                  {FORMATOS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Nº de equipes</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={maxTimesPlano}
                  value={numeroEquipes}
                  onChange={(e) => setNumeroEquipes(e.target.value)}
                  placeholder={`Até ${maxTimesPlano}`}
                  required
                />
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  {helperPlano}
                </div>
              </div>
            </div>

            {/* Campos específicos por formato */}
            {formato === "pontos_corridos" && (
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Ida e volta?</label>
                <div className="row">
                  <input
                    id="ida-volta"
                    type="checkbox"
                    checked={idaVolta}
                    onChange={(e) => setIdaVolta(e.target.checked)}
                  />
                  <label htmlFor="ida-volta">Sim</label>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Mínimo de 4 times. Sem prorrogação/pênaltis na fase de pontos corridos.
                </div>
              </div>
            )}

            {formato === "grupos" && (
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">Nº de grupos</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    value={numeroGrupos}
                    onChange={(e) => setNumeroGrupos(e.target.value)}
                    placeholder="Mín. 2"
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">Avançam por grupo</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={avancamPorGrupo}
                    onChange={(e) => setAvancamPorGrupo(e.target.value)}
                    placeholder="Mín. 1"
                    required
                  />
                </div>
                <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--muted)" }}>
                  • Mínimo 3 times por grupo • Avanço máximo = (menor grupo - 1).<br />
                  • Prorrogação/Pênaltis só na fase mata-mata posterior.
                </div>
              </div>
            )}

            {formato === "mata_mata" && (
              <div className="field" style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Mínimo de 4 times. Chaveamento ajusta para múltiplos de 4 (ou 2 se necessário).
                </div>
              </div>
            )}

            {/* Regras de tempo / prorrogação / pênaltis */}
            <div className="grid grid-2" style={{ gap: 12, marginTop: 8 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Duração de cada tempo (min)</label>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={45}
                  value={duracaoTempo}
                  onChange={(e) => setDuracaoTempo(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: 10 }}>
                <label className="label">Pênaltis (cobranças regulares)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={5}
                  value={qtdPenaltis}
                  onChange={(e) => setQtdPenaltis(e.target.value)}
                />
              </div>
            </div>

            {/* Prorrogação (somente formatos que têm mata-mata) */}
            {formato !== "pontos_corridos" && (
              <div className="grid grid-2" style={{ gap: 12, marginTop: 8 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">Prorrogação na mata-mata?</label>
                  <div className="row">
                    <input
                      id="prorrogacao"
                      type="checkbox"
                      checked={prorrogacao}
                      onChange={(e) => setProrrogacao(e.target.checked)}
                    />
                    <label htmlFor="prorrogacao">Sim</label>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">Duração da prorrogação (min)</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={15}
                    value={duracaoProrrogacao}
                    onChange={(e) => setDuracaoProrrogacao(e.target.value)}
                    disabled={!prorrogacao}
                  />
                </div>
              </div>
            )}

            <div className="row mt-3" style={{ gap: 8 }}>
              <button className="btn btn--primary" type="submit">
                {editandoId ? "Atualizar Campeonato" : "Salvar Campeonato"}
              </button>
              {editandoId && (
                <button type="button" onClick={resetForm} className="btn btn--muted">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* LISTA / CONTROLES */}
          <div className="grid" style={{ gap: 16 }}>
            <div
              className="card card--soft p-6"
              style={{
                padding: 16,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0 }}>Meus Campeonatos</h2>
                <span className="badge">{itensOrdenados.length}</span>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <label className="label" htmlFor="ordem" style={{ margin: 0 }}>
                  Ordenar:
                </label>
                <select
                  id="ordem"
                  className="select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: "8px 10px" }}
                >
                  <option value="alpha">Ordem alfabética</option>
                  <option value="recent">Mais recente</option>
                  <option value="oldest">Mais antigo</option>
                </select>
              </div>
            </div>

            {itensOrdenados.length === 0 ? (
              <div className="card p-6" style={{ padding: 16 }}>
                <p>Nenhum campeonato cadastrado ainda.</p>
              </div>
            ) : (
              <ul className="card p-6" style={{ padding: 0 }}>
                {itensOrdenados.map((c) => {
                  const labelFormato =
                    FORMATOS.find((f) => f.value === c.formato)?.label || c.formato;
                  return (
                    <li
                      key={c.id}
                      style={{
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 800 }}>{c.nome}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {c.categoria} — {labelFormato} — {c.numero_equipes} equipes
                          {c.formato === "grupos" && c.numero_grupos
                            ? ` — ${c.numero_grupos} grupos / ${c.avancam_por_grupo} avançam`
                            : ""}
                          {c.formato === "pontos_corridos" && c.ida_volta ? " — ida e volta" : ""}
                          {" — tempo: "}{c.duracao_tempo}m
                          {c.formato !== "pontos_corridos" && c.prorrogacao
                            ? ` — prorrogação: ${c.duracao_prorrogacao}m`
                            : ""}
                          {" — pênaltis: "}{c.qtd_penaltis}
                        </div>
                      </div>

                      <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                        {/* Futuro: configurar times / gerar tabela */}
                        {/* <button className="btn btn--orange" style={{ padding: "6px 10px", fontSize: 12 }}>Configurar times</button>
                        <button className="btn btn--orange" style={{ padding: "6px 10px", fontSize: 12 }}>Gerar tabela</button> */}
                        <button
                          onClick={() => handleEdit(c)}
                          className="btn btn--orange"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="btn btn--red"
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
