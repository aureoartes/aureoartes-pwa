// v1.2.0.0 — exibir ultima partida (dinâmica se houver)
// Atualizado: prévia do jogo mostra a última partida encerrada do usuário autenticado
import { Link } from "react-router-dom";
import TeamIcon from "../components/TeamIcon";
import StoreBanner from "../components/StoreBanner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [session, setSession] = useState(null);
  const [lastMatch, setLastMatch] = useState(null); // { campeonatoNome, timeA, timeB, golsA, golsB, penA?, penB?, dataHora, local }
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const logged = !!session?.user;

  // Util: formata data/hora (pt-BR)
  const formatWhen = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { data, hora };
  };

  // Carrega última partida encerrada do usuário autenticado
  useEffect(() => {
    if (!logged) {
      setLastMatch(null);
      return;
    }
    let cancelled = false;
    async function loadLastMatch() {
      try {
        setLoadingMatch(true);

        // 1) Busca a última partida encerrada (prioriza data_hora; se nula, usa criado_em)
        const { data: partida, error: errPartida } = await supabase
          .from("partidas")
          .select(
            [
              "id",
              "campeonato_id",
              "time_a_id",
              "time_b_id",
              "gols_time_a",
              "gols_time_b",
              // Campos de pênaltis são opcionais no schema atual; se não existirem, o select('*') evitaria erro,
              // mas aqui tentamos de forma defensiva. Se o schema não tiver, o Supabase pode errar.
              // Caso encontrar erro de coluna, basta remover as duas linhas abaixo.
              "penaltis_time_a",
              "penaltis_time_b",
              "data_hora",
              "criado_em",
              "local",
              "encerrada",
            ].join(",")
          )
          .eq("encerrada", true)
          .order("data_hora", { ascending: false, nullsFirst: false })
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (errPartida) {
          // fallback: tenta novamente sem as colunas de pênaltis (caso não existam no schema)
          const { data: partidaNoPens, error: err2 } = await supabase
            .from("partidas")
            .select(
              [
                "id",
                "campeonato_id",
                "time_a_id",
                "time_b_id",
                "gols_time_a",
                "gols_time_b",
                "data_hora",
                "criado_em",
                "local",
                "encerrada",
              ].join(",")
            )
            .eq("encerrada", true)
            .order("data_hora", { ascending: false, nullsFirst: false })
            .order("criado_em", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (err2 || !partidaNoPens) {
            if (!cancelled) setLastMatch(null);
            return;
          }
          // Continua com objeto sem pênaltis
          const p = partidaNoPens;

          // 2) Busca campeonato
          const { data: camp } = await supabase
            .from("campeonatos")
            .select("id, nome")
            .eq("id", p.campeonato_id)
            .maybeSingle();

          // 3) Busca times
          const [{ data: tA }, { data: tB }] = await Promise.all([
            supabase.from("times").select("id, nome, cor1, cor2, cor_detalhe").eq("id", p.time_a_id).maybeSingle(),
            supabase.from("times").select("id, nome, cor1, cor2, cor_detalhe").eq("id", p.time_b_id).maybeSingle(),
          ]);

          if (!cancelled) {
            setLastMatch({
              campeonatoNome: camp?.nome || "Prévia do jogo",
              golsA: p.gols_time_a ?? 0,
              golsB: p.gols_time_b ?? 0,
              penA: null,
              penB: null,
              timeA: tA
                ? { nome: tA.nome, cor1: tA.cor1, cor2: tA.cor2, cor_detalhe: tA.cor_detalhe }
                : { nome: "Time A" },
              timeB: tB
                ? { nome: tB.nome, cor1: tB.cor1, cor2: tB.cor2, cor_detalhe: tB.cor_detalhe }
                : { nome: "Time B" },
              dataHora: p.data_hora || p.criado_em,
              local: p.local || "Local não informado",
            });
          }
          return;
        }

        if (!partida) {
          if (!cancelled) setLastMatch(null);
          return;
        }

        // 2) Busca campeonato
        const { data: camp } = await supabase
          .from("campeonatos")
          .select("id, nome")
          .eq("id", partida.campeonato_id)
          .maybeSingle();

        // 3) Busca times
        const [{ data: tA }, { data: tB }] = await Promise.all([
          supabase.from("times").select("id, nome, cor1, cor2, cor_detalhe").eq("id", partida.time_a_id).maybeSingle(),
          supabase.from("times").select("id, nome, cor1, cor2, cor_detalhe").eq("id", partida.time_b_id).maybeSingle(),
        ]);

        if (!cancelled) {
          setLastMatch({
            campeonatoNome: camp?.nome || "Prévia do jogo",
            golsA: partida.gols_time_a ?? 0,
            golsB: partida.gols_time_b ?? 0,
            penA: partida.penaltis_time_a ?? null,
            penB: partida.penaltis_time_b ?? null,
            timeA: tA
              ? { nome: tA.nome, cor1: tA.cor1, cor2: tA.cor2, cor_detalhe: tA.cor_detalhe }
              : { nome: "Time A" },
            timeB: tB
              ? { nome: tB.nome, cor1: tB.cor1, cor2: tB.cor2, cor_detalhe: tB.cor_detalhe }
              : { nome: "Time B" },
            dataHora: partida.data_hora || partida.criado_em,
            local: partida.local || "Local não informado",
          });
        }
      } catch (_err) {
        if (!cancelled) setLastMatch(null);
      } finally {
        if (!cancelled) setLoadingMatch(false);
      }
    }
    loadLastMatch();
    return () => {
      cancelled = true;
    };
  }, [logged]);

  const quando = useMemo(() => (lastMatch?.dataHora ? formatWhen(lastMatch.dataHora) : null), [lastMatch?.dataHora]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#FFF6EF,#FFE7D4)" }}>
      {/* HERO – tons de laranja, CTA único */}
      <section
        className="page-header"
        style={{
          background: "linear-gradient(135deg,#FF8A3D 0%, #FF6A00 45%, #FF9455 100%)",
          marginBottom: 0,
          color: "#fff",
        }}
      >
        <div className="container">
          <div className="grid grid-2">
            {/* Lado esquerdo: título e CTA do placar */}
            <div>
              <h1 className="page-header__title" style={{ marginBottom: 6, color: "#fff" }}>Abra o placar e jogue já</h1>
              <p className="page-header__subtitle" style={{ maxWidth: 680, color: "#fff" }}>
                Use agora para um <strong>amistoso</strong> ou inicie a partir de uma <strong>partida do seu campeonato</strong>.
              </p>
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <Link to="/placar" className="btn btn--muted" style={{ padding: "12px 18px", fontWeight: 800 }}>
                  Abrir placar
                </Link>
              </div>
            </div>

            {/* Lado direito: prévia (dinâmica se logado e houver partida; senão, mock ilustrativo) */}
            <div className="card" style={{ padding: 18, borderColor: "#ffddb8", background: "#fff9f3", color: "#2c1a11" }}>
              <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 16, letterSpacing: 0.2 }}>
                {logged && !loadingMatch && lastMatch?.campeonatoNome
                  ? lastMatch.campeonatoNome
                  : "Prévia do jogo"}
              </div>

              {/* Linha 2 */}
              {logged && !loadingMatch && lastMatch ? (
                <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamIcon team={{ cor1: lastMatch.timeA?.cor1, cor2: lastMatch.timeA?.cor2, cor_detalhe: lastMatch.timeA?.cor_detalhe }} size={28} />
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lastMatch.timeA?.nome || "Time A"}
                    </span>
                    {Number.isFinite(lastMatch.penA) && lastMatch.penA !== null ? (
                      <span style={{ fontSize: 12, color: "#7a5643" }}> ({lastMatch.penA})</span>
                    ) : null}
                  </div>

                  <div className="row" style={{ alignItems: "baseline", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>{lastMatch.golsA}</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>x</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>{lastMatch.golsB}</span>
                  </div>

                  <div className="row" style={{ alignItems: "center", gap: 8, minWidth: 0, justifyContent: "flex-end" }}>
                    {Number.isFinite(lastMatch.penB) && lastMatch.penB !== null ? (
                      <span style={{ fontSize: 12, color: "#7a5643" }}>({lastMatch.penB}) </span>
                    ) : null}
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right" }}>
                      {lastMatch.timeB?.nome || "Time B"}
                    </span>
                    <TeamIcon team={{ cor1: lastMatch.timeB?.cor1, cor2: lastMatch.timeB?.cor2, cor_detalhe: lastMatch.timeB?.cor_detalhe }} size={28} />
                  </div>
                </div>
              ) : (
                // Fallback ilustrativo
                <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <TeamIcon team={{ cor1: "#FFD400", cor2: "#1B5E20", cor_detalhe: "#0D47A1" }} size={28} />
                    <span style={{ fontWeight: 700 }}>Brasil</span>
                  </div>
                  <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>2</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>x</span>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>1</span>
                  </div>
                  <div className="row" style={{ alignItems: "center", gap: 8 }}>
                    <TeamIcon team={{ cor1: "#FFFFFF", cor2: "#2196F3", cor_detalhe: "#111111" }} size={28} />
                    <span style={{ fontWeight: 700 }}>Argentina</span>
                  </div>
                </div>
              )}

              {/* Linha 3 */}
              <div style={{ fontSize: 12, color: "#7a5643", marginTop: 8 }}>
                {logged && !loadingMatch && lastMatch && quando
                  ? `${quando.data} • ${quando.hora} • ${lastMatch.local || "Local não informado"}`
                  : "12/09/2025 • 18:00 • Estádio da Amizade"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOJA */}
      <StoreBanner
        items={[
          {
            key: "oferta1",
            title: "Times artesanais",
            subtitle: "Coleções clássicas e personalizadas",
            href: "https://www.aureoartes.com.br/",
            bg: "linear-gradient(135deg,#FFE6CC,#FFF2E5)",
            border: "#ffd6ad",
            badge: "Novidades",
          },
          {
            key: "oferta2",
            title: "Acessórios",
            subtitle: "Palhetas, dadinhos e goleiros",
            href: "https://www.aureoartes.com.br/",
            bg: "linear-gradient(135deg,#FFF5E8,#FFE4CC)",
            border: "#ffddb8",
          },
          {
            key: "oferta3",
            title: "Promoções da semana",
            subtitle: "Ofertas por tempo limitado",
            href: "https://www.aureoartes.com.br/",
            bg: "linear-gradient(135deg,#FFE0C2,#FFF2E5)",
            border: "#ffcfa6",
            badge: "Oferta",
          },
        ]}
        intervalMs={6000}
      />

      {/* ACESSOS – Times e Campeonatos condicionais */}
      {logged ? (
        <section className="container" style={{ padding: "20px 16px 8px" }}>
          <div className="grid grid-2">
            {/* Times */}
            <div className="card card--soft" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Times</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Gerencie escudos, cores e elencos.</div>
              <Link to="/times" className="btn btn--orange" style={{ fontWeight: 700 }}>Meus times</Link>
            </div>

            {/* Campeonatos */}
            <div className="card card--soft" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Campeonatos</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Crie tabelas e acompanhe fases.</div>
              <Link to="/campeonatos" className="btn btn--orange" style={{ fontWeight: 700 }}>Meus campeonatos</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="container" style={{ padding: "20px 16px 8px" }}>
          <div className="card card--soft" style={{ padding: 16, textAlign: "center" }}>
            <p style={{ margin: 0, marginBottom: 8 }}>Faça login para acessar seus <strong>Times</strong> e <strong>Campeonatos</strong>.</p>
            <Link to="/login" className="btn btn--primary" style={{ fontWeight: 700 }}>Entrar</Link>
          </div>
        </section>
      )}

      {/* Rodapé discreto */}
      <div
        role="contentinfo"
        className="mt-auto w-full flex justify-center items-center py-3 text-xs"
        style={{ fontSize: 11, color: "var(--muted)" }}
      >
        <span className="text-center">
          © {new Date().getFullYear()} AureoArtes. Todos os direitos reservados.
          <span className="ml-2">Versão {import.meta.env.VITE_APP_VERSION || "1.1.0"}</span>
        </span>
      </div>
    </div>
  );
}
