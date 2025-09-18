// Perfil.jsx — v1.1.1.22 (mensagens estilizadas via theme.css)
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useEnumValues } from "@/utils/useEnumValues";
import "@/styles/theme.css";

// === Planos (UI) – componentes auxiliares ===
function PlanBadge({ kind = "muted", children }) {
  const styles = {
    base: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      fontWeight: 700,
      fontSize: 12,
      borderRadius: 999,
      lineHeight: 1,
      border: "1px solid transparent",
    },
    muted: { background: "#F3F4F6", color: "#6B7280" },
    brand: { background: "var(--brand)", color: "#fff" },
    highlight: { background: "#FFF3E8", color: "var(--brand)", border: "1px solid #FFD4B2" },
  };
  return <span style={{ ...styles.base, ...(styles[kind] || styles.muted) }}>{children}</span>;
}

function PlanCard({
  title,
  price,         // string principal, ex: "R$ 14,90" ou "Grátis"
  priceSuffix,   // ex: "/mês"
  features = [], // array de strings
  ctaLabel = "Assinar",
  onChoose,
  variant = "default", // "default" | "featured" | "premium" | "free"
  badge,               // <PlanBadge>...</PlanBadge>
  cornerRibbon,        // string (ex.: "Mais popular")
  iconBadge            // opcional: node no canto superior direito (ex: ícone desconto)
}) {
  const baseCard = {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 8px 20px rgba(11,37,69,.06)",
    border: "1px solid rgba(11,37,69,.06)",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
    position: "relative",
  };

  const variants = {
    default: {},
    featured: { border: "2px solid var(--brand)", transform: "translateY(-2px)" },
    premium:  { background: "#F8FAFF" },
    free:     { background: "#FFF5EC", border: "1px solid #FFD7BF" },
  };

  const priceStyle = {
    fontFamily: "Montserrat, system-ui, sans-serif",
    fontWeight: 800,
    fontSize: 28,
    color: "var(--text-strong, #0B2545)",
    margin: "6px 0 10px",
  };

  const ribbon = cornerRibbon
    ? {
        position: "absolute",
        top: 10,
        right: -8,
        background: "var(--brand)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: "8px 8px 8px 0",
        boxShadow: "0 4px 12px rgba(255,102,0,.25)",
      }
    : null;

  return (
    <article
      className="card"
      style={{ ...baseCard, ...(variants[variant] || {}) }}
    >
      {cornerRibbon && <div style={ribbon}>{cornerRibbon}</div>}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0, color: "var(--text-strong, #0B2545)" }}>{title}</h3>
        {iconBadge}
      </header>
      {badge && <div style={{ marginBottom: 8 }}>{badge}</div>}

      <div style={priceStyle}>
        {price} {priceSuffix ? <small style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{priceSuffix}</small> : null}
      </div>

      <ul style={{ margin: "8px 0 14px", paddingLeft: 0, listStyle: "none", color: "#374151", lineHeight: 1.6 }}>
        {features.map((f, i) => (
          <li key={i} style={{ margin: "6px 0" }}>• {f}</li>
        ))}
      </ul>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className={variant === "featured" ? "btn btn--primary" : "btn"} onClick={onChoose}>
          {ctaLabel}
        </button>
        <a className="link" href="#comparar" style={{ fontSize: 13, alignSelf: "flex-start" }}>
          Comparar planos
        </a>
      </div>
    </article>
  );
}

const TABS = [
  { key: "preferencias", label: "Preferências" },
  { key: "endereco", label: "Endereço" },
  { key: "seguranca", label: "Segurança" },
  { key: "planos", label: "Planos" },
];

function TabBar({ active, onChange }) {
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);
  const scrollerRef = React.useRef(null);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  function scrollBy(delta) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      {/* scroller */}
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "1px solid var(--line)",
          background: "#fffdfa",
          padding: "8px 8px 0",
          borderRadius: "12px 12px 0 0",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          flexWrap: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            className="btn btn--muted"
            onClick={() => onChange(t.key)}
            style={{
              background: "transparent",
              borderRadius: 0,
              border: 0,
              boxShadow: "none",
              padding: "10px 12px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              borderBottom:
                active === t.key
                  ? "3px solid var(--brand)"
                  : "3px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* fade indicators */}
      {canLeft && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 1,
            width: 24,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(255,253,250,1) 20%, rgba(255,253,250,0) 100%)",
            borderRadius: "12px 0 0 0",
          }}
        />
      )}
      {canRight && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 1,
            width: 24,
            pointerEvents: "none",
            background:
              "linear-gradient(270deg, rgba(255,253,250,1) 20%, rgba(255,253,250,0) 100%)",
            borderRadius: "0 12px 0 0",
          }}
        />
      )}

      {/* chevrons (desktop/tablet) */}
      {canLeft && (
        <button
          type="button"
          className="btn btn--muted"
          onClick={() => scrollBy(-160)}
          aria-label="Rolar guias para a esquerda"
          style={{
            position: "absolute",
            left: 2,
            top: 6,
            bottom: 6,
            padding: "0 6px",
            borderRadius: 8,
            opacity: 0.9,
          }}
        >
          ‹
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="btn btn--muted"
          onClick={() => scrollBy(160)}
          aria-label="Rolar guias para a direita"
          style={{
            position: "absolute",
            right: 2,
            top: 6,
            bottom: 6,
            padding: "0 6px",
            borderRadius: 8,
            opacity: 0.9,
          }}
        >
          ›
        </button>
      )}
    </div>
  );

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  function scrollBy(delta) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 6,
          borderBottom: "1px solid var(--line)",
          background: "#fffdfa",
          padding: "8px 8px 0",
          borderRadius: "12px 12px 0 0",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          flexWrap: "nowrap",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            className="btn btn--muted"
            onClick={() => onChange(t.key)}
            style={{
              background: "transparent",
              borderRadius: 0,
              border: 0,
              boxShadow: "none",
              padding: "10px 12px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              borderBottom:
                active === t.key
                  ? "3px solid var(--brand)"
                  : "3px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {canLeft && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 1,
            width: 24,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(255,253,250,1) 20%, rgba(255,253,250,0) 100%)",
            borderRadius: "12px 0 0 0",
          }}
        />
      )}
      {canRight && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 1,
            width: 24,
            pointerEvents: "none",
            background:
              "linear-gradient(270deg, rgba(255,253,250,1) 20%, rgba(255,253,250,0) 100%)",
            borderRadius: "0 12px 0 0",
          }}
        />
      )}
      {canLeft && (
        <button
          type="button"
          className="btn btn--muted"
          onClick={() => scrollBy(-160)}
          aria-label="Rolar guias para a esquerda"
          style={{
            position: "absolute",
            left: 2,
            top: 6,
            bottom: 6,
            padding: "0 6px",
            borderRadius: 8,
            opacity: 0.9,
          }}
        >
          ‹
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="btn btn--muted"
          onClick={() => scrollBy(160)}
          aria-label="Rolar guias para a direita"
          style={{
            position: "absolute",
            right: 2,
            top: 6,
            bottom: 6,
            padding: "0 6px",
            borderRadius: 8,
            opacity: 0.9,
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}

export default function Perfil() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTab, setSavingTab] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [activeTab, setActiveTab] = useState("preferencias");
  const [categorias, setCategorias] = useState([]);
  const [planoAtualNome, setPlanoAtualNome] = useState("—");

  const [form, setForm] = useState({
    id: "",
    auth_uid: "",
    nome: "",
    email: "",
    avatar_url: "",
    data_nasc: "",
    idioma: "pt-BR",
    paleta_tema: "aureoartes",
    notificacao_app: true,
    notificacao_email: true,
    notificacao_whatsapp: true,
    aceita_marketing: true,
    perfil_publico: true,
    origem_aquisicao: "organico",
    categoria_preferida_id: "",
    time_coracao: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    cep: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    telefone_celular: "",
    plano_id: "",
    data_renovacao: "",
  });

  const [pwd, setPwd] = useState({ atual: "", nova: "", confirma: "" });

  // enum origem_aquisicao -> consumindo do hook centralizado
  const origemEnum = useEnumValues("public.usuario_origem_aquisicao");

  useEffect(() => {
    let sub;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      sub = supabase.auth
        .onAuthStateChange((_e, sess) => setSession(sess || null))
        .data?.subscription;
    })();
    return () => sub?.unsubscribe?.();
  }, []);

  // Carrega categorias
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("categorias")
        .select("id, descricao")
        .order("descricao");
      setCategorias(cats || []);
    })();
  }, []);

  // Resolve plano atual exibindo descricao
  useEffect(() => {
    (async () => {
      if (!form.plano_id) {
        setPlanoAtualNome("—");
        return;
      }
      const { data: p } = await supabase
        .from("planos")
        .select("id, descricao")
        .eq("id", form.plano_id)
        .maybeSingle();
      setPlanoAtualNome(p?.descricao || "—");
    })();
  }, [form.plano_id]);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        setLoading(true);
        const auth_uid = session.user.id;
        const email = session.user.email?.toLowerCase() || "";

        let { data: u } = await supabase
          .from("usuarios")
          .select("*")
          .eq("auth_uid", auth_uid)
          .maybeSingle();

        if (!u && email) {
          const { data: u2 } = await supabase
            .from("usuarios")
            .select("*")
            .ilike("email", email)
            .maybeSingle();
          u = u2 || null;
        }

        if (!u) {
          const { data: created } = await supabase
            .from("usuarios")
            .insert({
              auth_uid,
              email,
              nome: session.user.user_metadata?.nome || "",
            })
            .select("*")
            .single();
          u = created;
        }

        setForm((f) => ({
          ...f,
          ...u,
          email: u.email || email,
          auth_uid: u.auth_uid || auth_uid,
        }));
      } catch (err) {
        setError(err?.message || "Não foi possível carregar seu perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const requiredOk = useMemo(() => {
    const nomeOk = !!form.nome?.trim();
    const emailOk = /.+@.+\..+/.test((form.email || "").toLowerCase());
    const avatarOk = !form.avatar_url || /^https?:\/\//i.test(form.avatar_url);
    return nomeOk && emailOk && avatarOk;
  }, [form]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveIdentidade() {
    setError("");
    setOkMsg("");
    if (!requiredOk) {
      setError("Preencha os campos obrigatórios corretamente.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        avatar_url: form.avatar_url || null,
        data_nasc: form.data_nasc || null,
        status: "ativo",
      };
      const { error: updErr } = await supabase
        .from("usuarios")
        .update(payload)
        .eq("id", form.id)
        .eq("auth_uid", form.auth_uid);
      if (updErr) throw updErr;
      setOkMsg("Identidade atualizada!");
    } catch (err) {
      setError(err?.message || "Não foi possível salvar identidade.");
    } finally {
      setSaving(false);
    }
  }

  async function savePreferencias() {
    setSavingTab("preferencias");
    setError("");
    setOkMsg("");
    try {
      const payload = {
        idioma: form.idioma,
        paleta_tema: form.paleta_tema,
        notificacao_app: !!form.notificacao_app,
        notificacao_email: !!form.notificacao_email,
        notificacao_whatsapp: !!form.notificacao_whatsapp,
        aceita_marketing: !!form.aceita_marketing,
        perfil_publico: !!form.perfil_publico,
        origem_aquisicao: form.origem_aquisicao,
        categoria_preferida_id: form.categoria_preferida_id || null,
        time_coracao: form.time_coracao || null,
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        youtube: form.youtube || null,
      };
      const { error: updErr } = await supabase
        .from("usuarios")
        .update(payload)
        .eq("id", form.id)
        .eq("auth_uid", form.auth_uid);
      if (updErr) throw updErr;
      setOkMsg("Preferências salvas!");
    } catch (err) {
      setError(err?.message || "Não foi possível salvar preferências.");
    } finally {
      setSavingTab("");
    }
  }

  async function saveEndereco() {
    setSavingTab("endereco");
    setError("");
    setOkMsg("");
    try {
      const payload = {
        cep: form.cep || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        pais: form.pais || "Brasil",
        telefone_celular: form.telefone_celular || null,
      };
      const { error: updErr } = await supabase
        .from("usuarios")
        .update(payload)
        .eq("id", form.id)
        .eq("auth_uid", form.auth_uid);
      if (updErr) throw updErr;
      setOkMsg("Endereço salvo!");
    } catch (err) {
      setError(err?.message || "Não foi possível salvar endereço.");
    } finally {
      setSavingTab("");
    }
  }

  async function saveSenha() {
    setSavingTab("seguranca");
    setError("");
    setOkMsg("");
    try {
      if (!pwd.nova || pwd.nova.length < 6)
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
      if (pwd.nova !== pwd.confirma)
        throw new Error("A confirmação não confere.");
      const { error: updErr } = await supabase.auth.updateUser({
        password: pwd.nova,
      });
      if (updErr) throw updErr;
      setOkMsg("Senha atualizada!");
      setPwd({ atual: "", nova: "", confirma: "" });
    } catch (err) {
      setError(err?.message || "Não foi possível atualizar a senha.");
    } finally {
      setSavingTab("");
    }
  }

  // Seleção/assinatura de plano (stub para integrar com checkout/Supabase)
  function handleChoosePlan(planKey) {
    // TODO: integrar com sua lógica de checkout / atualização de usuarios.plano_id
    // Ex.: abrir modal, redirecionar para /checkout?plano=..., ou chamar RPC
    setOkMsg(`Beleza! Vamos seguir com o plano: ${planKey}. Em breve conecto ao checkout.`);
    setError("");
  }

  async function handleCancel() {
    navigate(-1);
  }
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  if (!session?.user) {
    return (
      <div className="container" style={{ padding: "24px 16px" }}>
        <div className="card" style={{ padding: 16 }}>
          Você precisa estar autenticado para acessar o perfil.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="page-header">
        <div className="container">
          <h1 className="page-header__title">Meu perfil</h1>
          <p className="page-header__subtitle">
            Atualize suas informações quando quiser.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "20px 16px" }}>
        {/* Seção 1: Identidade */}
        <div className="card" style={{ padding: 16 }}>
          {loading ? (
            <div>Carregando…</div>
          ) : (
            <>
              <h2 className="text-strong" style={{ marginBottom: 8 }}>
                Identidade
              </h2>

              <div className="grid grid-2">
                <div className="field">
                  <label className="label">Nome *</label>
                  <input
                    className="input"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">E-mail *</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    disabled //onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-2 mt-2">
                <div className="field">
                  <label className="label">Avatar (URL)</label>
                  <input
                    className="input"
                    value={form.avatar_url || ""}
                    onChange={(e) => setField("avatar_url", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Data de nascimento</label>
                  <input
                    className="input"
                    type="date"
                    value={form.data_nasc || ""}
                    onChange={(e) => setField("data_nasc", e.target.value)}
                  />
                </div>
              </div>

              <div
                className="row"
                style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn--primary"
                    disabled={saving || !requiredOk}
                    onClick={saveIdentidade}
                  >
                    {saving ? "Salvando…" : "Salvar identidade"}
                  </button>
                  <button className="btn btn--muted" onClick={handleCancel}>
                    Cancelar
                  </button>
                </div>
                <button className="btn btn--red" onClick={handleLogout}>
                  Sair
                </button>
              </div>
            </>
          )}
        </div>

        {/* Seção 2: Guias (Tabs) — separada do bloco Identidade */}
        {!loading && (
          <div className="card" style={{ padding: 16, marginTop: 12 }}>
            <TabBar active={activeTab} onChange={setActiveTab} />

            <div style={{ padding: 12 }}>
              {/* Preferências */}
              {activeTab === "preferencias" && (
                <div>
                  <div className="grid grid-2">
                    <div className="field">
                      <label className="label">Idioma</label>
                      <select
                        className="input"
                        value={form.idioma}
                        disabled
                        onChange={(e) => setField("idioma", e.target.value)}
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Paleta do tema</label>
                      <select 
                        className="input"
                        value={form.paleta_tema}
                        disabled
                        onChange={(e) =>
                          setField("paleta_tema", e.target.value)
                        }
                      >
                        <option value="aureoartes">Aureoartes</option>
                        <option value="escuro">Escuro</option>
                        <option value="claro">Claro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-2 mt-2">
                    <label className="label">
                      <input
                        type="checkbox"
                        checked={!!form.notificacao_app}
                        onChange={(e) =>
                          setField("notificacao_app", e.target.checked)
                        }
                      />{" "}
                      Notificação no app
                    </label>
                    <label className="label">
                      <input
                        type="checkbox"
                        checked={!!form.notificacao_email}
                        onChange={(e) =>
                          setField("notificacao_email", e.target.checked)
                        }
                      />{" "}
                      Notificação por e-mail
                    </label>
                    <label className="label">
                      <input
                        type="checkbox"
                        checked={!!form.notificacao_whatsapp}
                        onChange={(e) =>
                          setField("notificacao_whatsapp", e.target.checked)
                        }
                      />{" "}
                      Notificação por WhatsApp
                    </label>
                    <label className="label">
                      <input
                        type="checkbox"
                        checked={!!form.aceita_marketing}
                        onChange={(e) =>
                          setField("aceita_marketing", e.target.checked)
                        }
                      />{" "}
                      Aceita marketing
                    </label>
                    <label className="label">
                      <input
                        type="checkbox"
                        checked={!!form.perfil_publico}
                        onChange={(e) =>
                          setField("perfil_publico", e.target.checked)
                        }
                      />{" "}
                      Perfil público
                    </label>
                  </div>

                  <div className="grid grid-2 mt-2">
                    <div className="field">
                      <label className="label">Como ficou sabendo?</label>
                      <select
                        className="input"
                        value={form.origem_aquisicao}
                        onChange={(e) =>
                          setField("origem_aquisicao", e.target.value)
                        }
                      >
                        {origemEnum.loading && (
                          <option value="">Carregando…</option>
                        )}
                        {!origemEnum.loading && origemEnum.values.length === 0 && (
                          <option value="">—</option>
                        )}
                        {origemEnum.values.map((v) => (
                          <option key={v} value={v}>
                            {origemEnum.labels?.[v] || v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">Categoria preferida</label>
                      <select
                        className="input"
                        value={form.categoria_preferida_id || ""}
                        onChange={(e) =>
                          setField("categoria_preferida_id", e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.descricao}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-2 mt-2">
                    <div className="field">
                      <label className="label">Time do coração</label>
                      <input
                        className="input"
                        value={form.time_coracao}
                        onChange={(e) => setField("time_coracao", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Instagram</label>
                      <input
                        className="input"
                        value={form.instagram}
                        onChange={(e) => setField("instagram", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">TikTok</label>
                      <input
                        className="input"
                        value={form.tiktok}
                        onChange={(e) => setField("tiktok", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">YouTube</label>
                      <input
                        className="input"
                        value={form.youtube}
                        onChange={(e) => setField("youtube", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={savingTab === "preferencias"}
                      onClick={savePreferencias}
                    >
                      {savingTab === "preferencias"
                        ? "Salvando…"
                        : "Salvar preferências"}
                    </button>
                  </div>
                </div>
              )}

              {/* Endereço */}
              {activeTab === "endereco" && (
                <div>
                  <div className="grid grid-3">
                    <div className="field">
                      <label className="label">CEP</label>
                      <input
                        className="input"
                        value={form.cep}
                        onChange={(e) => setField("cep", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Cidade</label>
                      <input
                        className="input"
                        value={form.cidade}
                        onChange={(e) => setField("cidade", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Estado</label>
                      <input
                        className="input"
                        value={form.estado}
                        onChange={(e) => setField("estado", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-2 mt-2">
                    <div className="field">
                      <label className="label">País</label>
                      <input
                        className="input"
                        value={form.pais}
                        onChange={(e) => setField("pais", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Telefone</label>
                      <input
                        className="input"
                        value={form.telefone_celular}
                        onChange={(e) =>
                          setField("telefone_celular", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={savingTab === "endereco"}
                      onClick={saveEndereco}
                    >
                      {savingTab === "endereco" ? "Salvando…" : "Salvar endereço"}
                    </button>
                  </div>
                </div>
              )}

              {/* Segurança */}
              {activeTab === "seguranca" && (
                <div>
                  <div className="grid grid-3">
                    <div className="field">
                      <label className="label">Senha atual</label>
                      <input
                        className="input"
                        type="password"
                        value={pwd.atual}
                        onChange={(e) =>
                          setPwd({ ...pwd, atual: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label">Nova senha</label>
                      <input
                        className="input"
                        type="password"
                        value={pwd.nova}
                        onChange={(e) => setPwd({ ...pwd, nova: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Confirmar nova senha</label>
                      <input
                        className="input"
                        type="password"
                        value={pwd.confirma}
                        onChange={(e) =>
                          setPwd({ ...pwd, confirma: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn--primary"
                      disabled={savingTab === "seguranca"}
                      onClick={saveSenha}
                    >
                      {savingTab === "seguranca"
                        ? "Atualizando…"
                        : "Atualizar senha"}
                    </button>
                  </div>
                </div>
              )}

              {/* Planos */}
              {activeTab === "planos" && (
                <div>
                  {/* Barra de status do plano */}
                  <div className="card" style={{ padding: 12 }}>
                    <div className="grid grid-2">
                      <div><strong>Plano atual:</strong> {planoAtualNome}</div>
                      <div><strong>Renovação:</strong> {form.data_renovacao || "—"}</div>
                    </div>
                  </div>

                  {/* Grid dos planos */}
                  <div className="grid grid-3" style={{ marginTop: 12, gap: 20 }}>
                    {/* Geraldino (Grátis) */}
                    <PlanCard
                      title="Geraldino"
                      variant="free"
                      badge={<PlanBadge kind="muted">Plano gratuito</PlanBadge>}
                      price="Grátis"
                      features={[
                        "Até 50 times",
                        "Até 5 campeonatos",
                        "Sem custo mensal"
                      ]}
                      ctaLabel="Assinar Geraldino"
                      onChoose={() => handleChoosePlan("geraldino")}
                    />

                    {/* Arquibaldo (Mais popular) */}
                    <PlanCard
                      title="Arquibaldo"
                      variant="featured"
                      cornerRibbon="Mais popular"
                      price="R$ 14,90"
                      priceSuffix="/mês"
                      features={[
                        "200 Times",
                        "30 Campeonatos",
                        "Sem anúncios"
                      ]}
                      ctaLabel="Assinar R$ 14,90"
                      onChoose={() => handleChoosePlan("arquibaldo")}
                    />

                    {/* Camarote (Premium) */}
                    <PlanCard
                      title="Camarote"
                      variant="premium"
                      badge={<PlanBadge kind="highlight">+ Benefícios</PlanBadge>}
                      price="R$ 34,90"
                      priceSuffix="/mês"
                      features={[
                        "1.000 Times",
                        "Sem anúncios",
                        "5% de desconto em todo o site"
                      ]}
                      ctaLabel="Assinar R$ 34,90"
                      onChoose={() => handleChoosePlan("camarote")}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Mensagens fora dos cards */}
        {(error || okMsg) && (
          <div className="row" style={{ marginTop: 12 }}>
            {error && (
              <div className="alert alert--error" role="alert">
                {error}
              </div>
            )}
            {okMsg && (
              <div className="alert alert--success" role="status">
                {okMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
