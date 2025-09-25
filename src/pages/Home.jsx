// v1.2.0.2 — Home: última partida com times via .in(), abreviacao no mobile/vertical
import { Link } from "react-router-dom";
import TeamIcon from "../components/TeamIcon";
import StoreBanner from "../components/StoreBanner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/** Detecta mobile/vertical */
function useIsMobileVertical() {
  const query = "(max-width: 640px) and (orientation: portrait)";
  const getMatch = () =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(query).matches
      : false;

  const [isMobileVertical, setIsMobileVertical] = useState(getMatch());

  useEffect(() => {
    if (!("matchMedia" in window)) return;
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobileVertical(e.matches);

    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener?.(handler);

    const onResize = () => setIsMobileVertical(getMatch());
    window.addEventListener("resize", onResize);

    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener?.(handler);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return isMobileVertical;
}

export default function Home() {
  const [session, setSession] = useState(null);
  const [lastMatch, setLastMatch] = useState(null); // { campeonatoNome, timeA, timeB, golsA, golsB, penA?, penB?, dataHora, local }
  const [loadingMatch, setLoadingMatch] = useState(false);
  const isMobileVertical = useIsMobileVertical();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) =>
      setSession(sess || null)
    );
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const logged = !!session?.user;

  const formatWhen = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return { data, hora };
  };

  useEffect(() => {
    if (!logged) {
      setLastMatch(null);
      return;
    }
    let cancelled = false;

    async function loadLastMatch() {
      try {
        setLoadingMatch(true);

        // 1) Última partida encerrada
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
              "penaltis_time_a",   // se não existir no schema, veremos fallback
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

        let p = partida;

        // Fallback se as colunas de pênaltis não existirem
        if (errPartida) {
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
          p = partidaNoPens;
        }

        if (!p) {
          if (!cancelled) setLastMatch(null);
          return;
        }

        // 2) Campeonato
        const { data: camp, error: errCamp } = await supabase
          .from("campeonatos")
          .select("id, nome")
          .eq("id", p.campeonato_id)
          .maybeSingle();
        if (errCamp) console.warn("Erro ao buscar campeonato:", errCamp);

        // 3) Times (batida única com .in e trazendo também 'sigla')
        const ids = [p.time_a_id, p.time_b_id].filter(Boolean);
        let tA = null, tB = null;

        if (ids.length) {
          const { data: teams, error: errTeams } = await supabase
            .from("times")
            .select("id, nome, abreviacao, cor1, cor2, cor_detalhe")
            .in("id", ids);

          if (errTeams) console.warn("Erro ao buscar times:", errTeams);

          if (Array.isArray(teams) && teams.length) {
            tA = teams.find((t) => t.id === p.time_a_id) || null;
            tB = teams.find((t) => t.id === p.time_b_id) || null;
          }
        }

        setLastMatch({
          campeonatoNome: camp?.nome || "Prévia do jogo",
          golsA: p.gols_time_a ?? 0,
          golsB: p.gols_time_b ?? 0,
          penA: p.penaltis_time_a ?? null,
          penB: p.penaltis_time_b ?? null,
          timeA: tA
            ? { nome: tA.nome, abreviacao: tA.abreviacao, cor1: tA.cor1, cor2: tA.cor2, cor_detalhe: tA.cor_detalhe }
            : { nome: "Time A", abreviacao: "A" },
          timeB: tB
            ? { nome: tB.nome, abreviacao: tB.abreviacao, cor1: tB.cor1, cor2: tB.cor2, cor_detalhe: tB.cor_detalhe }
            : { nome: "Time B", abreviacao: "B" },
          dataHora: p.data_hora || p.criado_em,
          local: p.local || "Local não informado",
        });

      } catch (e) {
        console.warn("loadLastMatch error:", e);
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

  const quando = useMemo(
    () => (lastMatch?.dataHora ? formatWhen(lastMatch.dataHora) : null),
    [lastMatch?.dataHora]
  );

  const showName = (t) => {
    if (!t) return "";
    if (isMobileVertical && t.abreviacao) return t.abreviacao;
    return t.nome || "";
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#FFF6EF,#FFE7D4)" }}>
      {/* HERO */}
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
            {/* Esquerda */}
            <div>
              <h1 className="page-header__title" style={{ marginBottom: 6, color: "#fff" }}>
                Abra o placar e jogue já
              </h1>
              <p className="page-header__subtitle" style={{ maxWidth: 680, color: "#fff" }}>
                Use agora para um <strong>amistoso</strong> ou inicie a partir de uma <strong>partida do seu campeonato</strong>.
              </p>
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <Link to="/placar" className="btn btn--muted" style={{ padding: "12px 18px", fontWeight: 800 }}>
                  Abrir placar
                </Link>
              </div>
            </div>

            {/* Direita: Prévia */}
            <div className="card" style={{ padding: 18, borderColor: "#ffddb8", background: "#fff9f3", color: "#2c1a11" }}>
              <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 16, letterSpacing: 0.2 }}>
                {logged && !loadingMatch && lastMatch?.campeonatoNome ? lastMatch.campeonatoNome : "Prévia do jogo"}
              </div>

              {/* Linha 2 */}
              {logged && !loadingMatch && lastMatch ? (
                <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div className="row" style={{ alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamIcon
                      team={{ cor1: lastMatch.timeA?.cor1, cor2: lastMatch.timeA?.cor2, cor_detalhe: lastMatch.timeA?.cor_detalhe }}
                      size={28}
                    />
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {showName(lastMatch.timeA) || "Time A"}
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
                    <span
                      style={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "right",
                      }}
                    >
                      {showName(lastMatch.timeB) || "Time B"}
                    </span>
                    <TeamIcon
                      team={{ cor1: lastMatch.timeB?.cor1, cor2: lastMatch.timeB?.cor2, cor_detalhe: lastMatch.timeB?.cor_detalhe }}
                      size={28}
                    />
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
            title: "Times Vidrilha 45 mm",
            subtitle: "Coleções clássicas e personalizadas",
            href: "https://www.aureoartes.com.br/vidrilha-45mm-selecoes",
            imageUrl: "/img/store/oferta1-vidrilha.webp",
            bg: "linear-gradient(135deg,#FFE6CC,#FFF2E5)",
            border: "#ffd6ad",
            badge: "Artesanal",
            alt: "Linha Vidrilha 45 mm — times artesanais"
          },
          {
            key: "oferta2",
            title: "Acrílico Cristal",
            subtitle: "Robusto, do clássico ao contemporâneo",
            href: "https://www.aureoartes.com.br/times-de-acrilico-cristal",
            imageUrl: "/img/store/oferta2-acrilico.webp",
            bg: "linear-gradient(135deg,#FFF5E8,#FFE4CC)",
            border: "#ffddb8",
            badge: "Feito à mão",
            alt: "Times em acrílico cristal"
          },
          {
            key: "oferta3",
            title: "Futebol de Botão",
            subtitle: "Aprenda a jogar",
            href: "https://www.aureoartes.com.br/pagina/como-jogar.html",
            imageUrl: "/img/store/oferta3-como-jogar.webp",
            bg: "linear-gradient(135deg,#FFE0C2,#FFF2E5)",
            border: "#ffcfa6",
            badge: "Oferta",
            alt: "Guia — como jogar futebol de botão"
          }
        ]}
        intervalMs={6000}
      />

      {/* ACESSOS */}
      {logged ? (
        <section className="container" style={{ padding: "20px 16px 8px" }}>
          <div className="grid grid-2">
            <div className="card card--soft" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Times</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Gerencie escudos, cores e elencos.</div>
              <Link to="/times" className="btn btn--orange" style={{ fontWeight: 700 }}>Meus times</Link>
            </div>
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

      {/* Rodapé */}
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
