// src/pages/Campeonatos.jsx
import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import CollapsibleSection from "../components/CollapsibleSection.jsx";

const USUARIO_ID = "9a5ccd47-d252-4dbc-8e67-79b3258b199a";

const CATEGORIAS = ["Futebol de Botão", "Futebol de Campo", "Futsal", "Society"];
const FORMATOS = [
  { value: "pontos_corridos", label: "Pontos Corridos" },
  { value: "grupos", label: "Grupos" },
  { value: "mata_mata", label: "Mata-mata" },
];

export default function Campeonatos() {
  const [maxTimesPlano, setMaxTimesPlano] = useState(16);

  // PASSO 1
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Futebol de Botão");
  const [formato, setFormato] = useState("pontos_corridos");
  const [numeroEquipes, setNumeroEquipes] = useState("");
  const [idaVolta, setIdaVolta] = useState(false); // agora para todos os formatos

  // PASSO 2
  const [duracaoTempo, setDuracaoTempo] = useState(10);
  const [prorrogacao, setProrrogacao] = useState(false); // (mata_mata, grupos)
  const [numeroGrupos, setNumeroGrupos] = useState("");  // (grupos)
  const [avancamPorGrupo, setAvancamPorGrupo] = useState(""); // (grupos)
  const [duracaoProrrogacao, setDuracaoProrrogacao] = useState(5); // (se prorrogacao)
  const [qtdPenaltis, setQtdPenaltis] = useState(5); // 1..5

  // fluxo
  const [step, setStep] = useState(1); // 1 ou 2
  const [formOpen, setFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [hasPartidas, setHasPartidas] = useState(false);

  // lista
  const [itens, setItens] = useState([]);
  const [sortBy, setSortBy] = useState("alpha");

  useEffect(() => { fetchPlanoMax(); fetchCampeonatos(); }, []);

  async function fetchPlanoMax() {
    const { data: user } = await supabase
      .from("usuarios")
      .select("plano_id")
      .eq("id", USUARIO_ID)
      .single();

    if (!user?.plano_id) { setMaxTimesPlano(16); return; }

    const { data: plano } = await supabase
      .from("planos")
      .select("max_times")
      .eq("id", user.plano_id)
      .single();

    setMaxTimesPlano(plano?.max_times || 16);
  }

  async function fetchCampeonatos() {
    const { data } = await supabase
      .from("campeonatos")
      .select("*")
      .eq("usuario_id", USUARIO_ID)
      .order("criado_em", { ascending: false });

    setItens(data || []);
  }

  function resetForm() {
    setEditandoId(null);
    setHasPartidas(false);
    setStep(1);
    setNome("");
    setCategoria("Futebol de Botão");
    setFormato("pontos_corridos");
    setNumeroEquipes("");
    setIdaVolta(false);

    setDuracaoTempo(10);
    setProrrogacao(false);
    setNumeroGrupos("");
    setAvancamPorGrupo("");
    setDuracaoProrrogacao(5);
    setQtdPenaltis(5);
  }

  // validações
  function validateStep1() {
    const n = parseInt(numeroEquipes || "0", 10);
    if (!nome.trim()) return "Informe o nome do campeonato.";
    if (!n || n < 1) return "Informe o número de equipes.";
    if (n > maxTimesPlano) return `Seu plano permite no máximo ${maxTimesPlano} times.`;

    if (formato === "pontos_corridos" && n < 4) return "Pontos corridos exige no mínimo 4 times.";
    if (formato === "mata_mata" && n < 4) return "Mata-mata exige no mínimo 4 times.";
    if (formato === "grupos" && n < 6) return "Para formato em grupos, informe ao menos 6 equipes.";
    return null;
  }

  function validateStep2() {
    const t = parseInt(duracaoTempo, 10);
    if (isNaN(t) || t < 2 || t > 45) return "Duração de cada tempo deve estar entre 2 e 45 minutos.";

    if (formato === "grupos") {
      const n = parseInt(numeroEquipes || "0", 10);
      const ng = parseInt(numeroGrupos || "0", 10);
      const av = parseInt(avancamPorGrupo || "0", 10);

      if (!ng || ng < 2) return "Formato em grupos exige no mínimo 2 grupos.";
      if (n < ng * 3) return `Com ${ng} grupos, é necessário no mínimo ${ng * 3} times (mínimo 3 por grupo).`;

      const menorGrupo = Math.floor(n / ng);
      const maxAvanco = Math.max(1, menorGrupo - 1);
      if (!av || av < 1) return "Avançam por grupo deve ser no mínimo 1.";
      if (av > maxAvanco) return `Avançam por grupo deve ser no máximo ${maxAvanco}, considerando o grupo com menos times.`;
    }

    if ((formato === "mata_mata" || formato === "grupos") && prorrogacao) {
      const tp = parseInt(duracaoProrrogacao, 10);
      if (isNaN(tp) || tp < 2 || tp > Math.min(15, t))
        return "Duração da prorrogação deve ser entre 2 e 15 e não maior que a duração do tempo.";
    }

    const qp = parseInt(qtdPenaltis, 10);
    if (isNaN(qp) || qp < 1 || qp > 5) return "Quantidade de pênaltis regulares deve ser entre 1 e 5.";

    return null;
  }

  function confirmStep1() {
    const err = validateStep1();
    if (err) return alert(`❌ ${err}`);
    setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validateStep2();
    if (err) return alert(`❌ ${err}`);

    const payload = {
      usuario_id: USUARIO_ID,
      nome,
      categoria,
      formato,
      numero_equipes: numeroEquipes ? parseInt(numeroEquipes, 10) : null,
      ida_volta: !!idaVolta,
      numero_grupos: formato === "grupos" ? (numeroGrupos ? parseInt(numeroGrupos, 10) : null) : null,
      avancam_por_grupo: formato === "grupos" ? (avancamPorGrupo ? parseInt(avancamPorGrupo, 10) : null) : null,
      duracao_tempo: parseInt(duracaoTempo, 10),
      prorrogacao: (formato === "mata_mata" || formato === "grupos") ? !!prorrogacao : false,
      duracao_prorrogacao:
        (formato === "mata_mata" || formato === "grupos") && prorrogacao
          ? parseInt(duracaoProrrogacao, 10)
          : null,
      qtd_penaltis: parseInt(qtdPenaltis, 10),
    };

    if (editandoId) {
      const { error } = await supabase.from("campeonatos").update(payload).eq("id", editandoId);
      if (error) return alert("❌ Erro ao atualizar campeonato");
      alert("✅ Campeonato atualizado!");
    } else {
      const { error } = await supabase.from("campeonatos").insert([payload]);
      if (error) return alert("❌ Erro ao cadastrar campeonato");
      alert("✅ Campeonato cadastrado!");
    }

    resetForm();
    await fetchCampeonatos();
    setFormOpen(false);
  }

  async function checkHasPartidas(campeonatoId) {
    try {
      const { count, error } = await supabase
        .from("partidas")
        .select("id", { count: "exact", head: true })
        .eq("campeonato_id", campeonatoId);
      if (error) setHasPartidas(false);
      else setHasPartidas((count || 0) > 0);
    } catch {
      setHasPartidas(false);
    }
  }

  function handleEdit(c) {
    setEditandoId(c.id);

    // Passo 1
    setNome(c.nome || "");
    setCategoria(c.categoria || "Futebol de Botão");
    setFormato(c.formato || "pontos_corridos");
    setNumeroEquipes(c.numero_equipes ?? "");
    setIdaVolta(!!c.ida_volta);

    // Passo 2
    setDuracaoTempo(c.duracao_tempo ?? 10);
    setProrrogacao(!!c.prorrogacao);
    setNumeroGrupos(c.numero_grupos ?? "");
    setAvancamPorGrupo(c.avancam_por_grupo ?? "");
    setDuracaoProrrogacao(c.duracao_prorrogacao ?? 5);
    setQtdPenaltis(c.qtd_penaltis ?? 5);

    setFormOpen(true);
    setStep(1);              // ⇦ Ao editar: Passo 1 habilitado, Passo 2 “desabilitado” visualmente
    checkHasPartidas(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este campeonato?")) return;
    const { error } = await supabase.from("campeonatos").delete().eq("id", id);
    if (!error) setItens((prev) => prev.filter((c) => c.id !== id));
  }

  const itensOrdenados = useMemo(() => {
    const arr = [...itens];
    if (sortBy === "alpha") arr.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (sortBy === "recent") arr.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    if (sortBy === "oldest") arr.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    return arr;
  }, [itens, sortBy]);

  const labelFormato = (v) => FORMATOS.find((f) => f.value === v)?.label || v;

  // Bloqueio quando JÁ existe partidas
  const lock = editandoId && hasPartidas;
  const isEdit = !!editandoId;

  return (
    <div className="container">
      <div className="grid">
        {/* HEADER */}
        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0 }}>Campeonatos</h1>
              <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                Crie, edite e defina o formato e regras.
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="label" htmlFor="ordem" style={{ margin: 0 }}>Ordenar:</label>
              <select id="ordem" className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="alpha">Ordem alfabética</option>
                <option value="recent">Mais recente</option>
                <option value="oldest">Mais antigo</option>
              </select>
            </div>
          </div>
        </div>

        {/* FORM */}
        <CollapsibleSection
          title={editandoId ? "Editar Campeonato" : "Novo Campeonato"}
          subtitle="Preencha em 2 passos: dados gerais e, depois, regras do jogo"
          open={formOpen}
          onToggle={(o) => { setFormOpen(o); if (!o) { setStep(1); resetForm(); } }}
        >
          {/* PASSO 1 */}
          <div className="card" style={{ padding: 14, opacity: step === 1 ? 1 : 0.65 }}>
            <h3 style={{ marginTop: 0 }}>Passo 1 — Dados gerais</h3>

            <div className="field">
              <label className="label">Nome</label>
              <input
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                // Criando: desabilita no step 2; Editando: sempre habilitado
                disabled={!isEdit && step === 2}
              />
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Categoria</label>
                <select
                  className="select"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  // Criando: desabilita no step 2; Editando: sempre habilitado
                  disabled={!isEdit && step === 2}
                >
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Formato</label>
                <select
                  className="select"
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  // Com partidas: travado; Sem partidas: segue fluxo 2 passos
                  disabled={lock || (!isEdit && step === 2)}
                >
                  {FORMATOS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label className="label">Número de equipes (máx. {maxTimesPlano})</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={maxTimesPlano}
                  value={numeroEquipes}
                  onChange={(e) => setNumeroEquipes(e.target.value)}
                  required
                  disabled={lock || (!isEdit && step === 2)}
                />
              </div>

              <div className="field">
                <label className="label">Ida e volta?</label>
                <div className="row">
                  <input
                    id="ida-volta"
                    type="checkbox"
                    checked={idaVolta}
                    onChange={(e) => setIdaVolta(e.target.checked)}
                    disabled={lock || (!isEdit && step === 2)}
                  />
                  <label htmlFor="ida-volta">Sim</label>
                </div>
              </div>
            </div>

            {step === 1 && (
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn--orange" onClick={confirmStep1}>
                  Confirmar Passo 1
                </button>
                {editandoId && (
                  <button
                    type="button"
                    className="btn btn--muted"
                    onClick={() => setStep(2)}
                  >
                    Ir para Passo 2
                  </button>
                )}
              </div>
            )}
          </div>

          {/* PASSO 2 */}
          <div className="card" style={{ padding: 14, marginTop: 12, opacity: step === 1 ? 0.65 : 1 }}>
            <h3 style={{ marginTop: 0 }}>Passo 2 — Regras do jogo</h3>

            {/* Linha 1 */}
            <div className="grid grid-2">
              <div className="field">
                <label className="label">Duração de cada tempo (min)</label>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={45}
                  value={duracaoTempo}
                  onChange={(e) => setDuracaoTempo(e.target.value)}
                  // Editando: habilitado; Criando: apenas no step 2
                  disabled={!isEdit && step === 1}
                />
              </div>

              {(formato === "mata_mata" || formato === "grupos") && (
                <div className="field">
                  <label className="label">Prorrogação no mata-mata?</label>
                  <div className="row">
                    <input
                      id="prorrogacao"
                      type="checkbox"
                      checked={prorrogacao}
                      onChange={(e) => setProrrogacao(e.target.checked)}
                      disabled={!isEdit && step === 1}
                    />
                    <label htmlFor="prorrogacao">Sim</label>
                  </div>
                </div>
              )}
            </div>

            {/* Linha 2 (somente grupos) */}
            {formato === "grupos" && (
              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Quantidade de grupos</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    value={numeroGrupos}
                    onChange={(e) => setNumeroGrupos(e.target.value)}
                    disabled={step === 1 || lock}
                  />
                </div>
                <div className="field">
                  <label className="label">Avançam por grupo</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={avancamPorGrupo}
                    onChange={(e) => setAvancamPorGrupo(e.target.value)}
                    disabled={step === 1 || lock}
                  />
                </div>
              </div>
            )}

            {/* Linha 3 */}
            <div className="grid grid-2">
              {(formato === "mata_mata" || formato === "grupos") && (
                <div className="field">
                  <label className="label">Duração da prorrogação (min)</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={15}
                    value={duracaoProrrogacao}
                    onChange={(e) => setDuracaoProrrogacao(e.target.value)}
                    // Editando: habilitado quando prorrogacao = true (independe do step);
                    // Criando: somente step 2 e prorrogacao = true.
                    disabled={isEdit ? !prorrogacao : (step === 1 || !prorrogacao)}
                  />
                </div>
              )}

              {(formato === "mata_mata" || formato === "grupos") && (
                <div className="field">
                  <label className="label">Quantidade de pênaltis regulares</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={5}
                    value={qtdPenaltis}
                    onChange={(e) => setQtdPenaltis(e.target.value)}
                    disabled={!isEdit && step === 1}
                  />
                </div>
              )}
            </div>

            {/* Ações finais */}
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button
                className="btn btn--primary"
                type="submit"
                onClick={handleSubmit}
                disabled={step === 1}
              >
                {editandoId ? "Atualizar Campeonato" : "Salvar Campeonato"}
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setFormOpen(false); }}
                className="btn btn--muted"
              >
                Cancelar
              </button>
            </div>

            {editandoId && hasPartidas && (
              <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                * Alguns campos estão bloqueados porque este campeonato já possui partidas vinculadas.
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* LISTA — 2ª linha: categoria, formato, nº equipes */}
        {itensOrdenados.length === 0 ? (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ margin: 0 }}>Nenhum campeonato cadastrado ainda.</p>
          </div>
        ) : (
          <ul className="list card">
            {itensOrdenados.map((c) => {
              const linha2 = [
                c.categoria,
                FORMATOS.find((f) => f.value === c.formato)?.label || c.formato,
                `${c.numero_equipes} equipes`,
              ].filter(Boolean).join(" — ");

              return (
                <li key={c.id} className="list__item">
                  <div className="list__left">
                    <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <div className="list__title" title={c.nome}>{c.nome}</div>
                      <div className="list__subtitle" title={linha2}>{linha2}</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(c)} className="btn btn--orange">Editar</button>
                    <button onClick={() => handleDelete(c.id)} className="btn btn--red">Excluir</button>
                    <a href={`/campeonatos/${c.id}/equipes`} className="btn btn--muted">Equipes</a>
                    <a href={`/campeonatos/${c.id}/partidas`} className="btn btn--muted">Partidas</a>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
