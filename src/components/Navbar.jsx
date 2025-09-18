// v1.1.0 — Autenticação Supabase + RLS (ownerId) — 2025-09-15
import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import logo from "../assets/logo_aureoartes.png";
import { supabase } from "@/lib/supabaseClient";            // ← novo (nomeado)

export default function Navbar() {
  // Sessão Supabase (auth real)
  const [session, setSession] = useState(null);
  const authed = !!session?.user;

  // UI state
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Boot + listener de sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Scroll e responsividade
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDesktop = () => window.innerWidth >= 992;
  const [showDesktop, setShowDesktop] = useState(isDesktop());
  useEffect(() => {
    const onResize = () => setShowDesktop(isDesktop());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Estilos
  const baseLinkStyle = {
    padding: "8px 12px",
    borderRadius: 10,
    color: "rgba(255,255,255,0.92)",
    textDecoration: "none",
    fontWeight: 600,
    transition: "background 160ms, color 160ms, box-shadow 160ms",
    whiteSpace: "nowrap",
  };
  const activeLinkStyle = {
    ...baseLinkStyle,
    background: "rgba(255,255,255,0.22)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  };

  const lojaBtnStyle = {
    marginLeft: 8,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    color: "#d95500",
    fontWeight: 700,
    padding: "8px 12px",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };

  const containerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    transition: "all 300ms",
    background: scrolled ? "rgba(255,102,0,0.82)" : "linear-gradient(90deg, #ff6a00, #ff7e2d)",
    backdropFilter: scrolled ? "blur(6px)" : "none",
    boxShadow: scrolled ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
  };
  const navInner = { maxWidth: 1120, margin: "0 auto", padding: "0 16px" };
  const row = { height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
  const brand = { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" };
  const brandText = { color: "#fff", fontWeight: 800, letterSpacing: "0.6px", fontSize: 18, whiteSpace: "nowrap" };
  const mobileToggle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.92)",
    background: "transparent",
    border: "none",
    padding: 8,
    borderRadius: 10,
    cursor: "pointer",
  };
  const mobileMenu = { paddingBottom: 10, display: open ? "block" : "none", animation: "fadeIn 120ms ease-out" };

  // Link helpers
  const LinkStd = (props) => (
    <NavLink {...props} style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)} />
  );

  return (
    <header style={containerStyle}>
      <nav style={navInner}>
        <div style={row}>
          {/* Brand */}
          <Link to="/" style={brand} aria-label="Ir para a Home">
            <img
              src={logo}
              alt="AUREOARTES"
              style={{ height: 40, width: 40, objectFit: "contain", borderRadius: 12, background: "rgba(255,255,255,0.95)", padding: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            />
            <span style={brandText}>AUREOARTES</span>
          </Link>

          {/* Desktop */}
          {showDesktop ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <LinkStd to="/">Home</LinkStd>
              {/* Placar igual aos demais */}
              <LinkStd to="/placar">Placar</LinkStd>
              {/* Ocultar Times/Campeonatos se NÃO autenticado */}
              {authed && <LinkStd to="/times">Times</LinkStd>}
              {authed && <LinkStd to="/campeonatos">Campeonatos</LinkStd>}
              <a href="https://www.aureoartes.com.br/" target="_blank" rel="noopener noreferrer" style={lojaBtnStyle}>Loja</a>
              {/* Botão Entrar vira Perfil quando autenticado */}
              {!authed ? (
                <LinkStd to="/login">Entrar</LinkStd>
              ) : (
                <LinkStd to="/perfil">Perfil</LinkStd>
              )}
            </div>
          ) : (
            // Mobile hamburger
            <button aria-label="Abrir menu" onClick={() => setOpen((v) => !v)} style={mobileToggle}>
              {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {!showDesktop && (
          <div style={mobileMenu}>
            <div style={{ display: "grid", gap: 6 }}>
              <LinkStd to="/" onClick={() => setOpen(false)}>Home</LinkStd>
              <LinkStd to="/placar" onClick={() => setOpen(false)}>Placar</LinkStd>
              {authed && <LinkStd to="/times" onClick={() => setOpen(false)}>Times</LinkStd>}
              {authed && <LinkStd to="/campeonatos" onClick={() => setOpen(false)}>Campeonatos</LinkStd>}
              <a href="https://www.aureoartes.com.br/" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={{ ...lojaBtnStyle, display: "block", marginTop: 6, textAlign: "center" }}>Loja</a>
              {!authed ? (
                <LinkStd to="/login" onClick={() => setOpen(false)}>Entrar</LinkStd>
              ) : (
                <LinkStd to="/perfil" onClick={() => setOpen(false)}>Perfil</LinkStd>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
