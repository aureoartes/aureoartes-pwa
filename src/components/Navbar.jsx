import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo_aureoartes.png";
import { isLogged, clearUsuario } from "../config/appUser";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const logged = isLogged();

  const isDesktop = () => window.innerWidth >= 992;
  const [showDesktop, setShowDesktop] = useState(isDesktop());

  useEffect(() => {
    const onResize = () => setShowDesktop(isDesktop());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
    
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseLinkStyle = {
    padding: "8px 12px",
    borderRadius: 10,
    color: "rgba(255,255,255,0.92)",
    textDecoration: "none",
    fontWeight: 600,
    transition: "background 160ms, color 160ms, box-shadow 160ms",
  };

  const activeLinkStyle = {
    ...baseLinkStyle,
    background: "rgba(255,255,255,0.22)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  };

  const placarBtnStyle = {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#fff",
    color: "#d95500",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
  };

  const placarBtnActive = {
    ...placarBtnStyle,
    outline: "2px solid rgba(255,255,255,0.6)",
  };

  const containerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    transition: "all 300ms",
    background: scrolled
      ? "rgba(255,102,0,0.82)"
      : "linear-gradient(90deg, #ff6a00, #ff7e2d)",
    backdropFilter: scrolled ? "blur(6px)" : "none",
    boxShadow: scrolled ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
  };

  const navInner = { maxWidth: 1120, margin: "0 auto", padding: "0 16px" };
  const row = { height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" };
  const brand = { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" };
  const brandText = { color: "#fff", fontWeight: 800, letterSpacing: "0.6px", fontSize: 18 };
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
  };

  const handleLogout = () => {
    clearUsuario();
    navigate("/", { replace: true });
  };

  return (
    <header style={containerStyle}>
      <nav style={navInner}>
        <div style={row}>
          <Link to="/" style={brand}>
            <img
              src={logo}
              alt="AUREOARTES"
              style={{
                height: 40,
                width: 40,
                objectFit: "contain",
                borderRadius: 12,
                background: "rgba(255,255,255,0.95)",
                padding: 6,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            />
            <span style={brandText}>AUREOARTES</span>
          </Link>

          {showDesktop ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <NavLink to="/" style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Home</NavLink>
              <NavLink to="/placar" style={({ isActive }) => (isActive ? placarBtnActive : placarBtnStyle)}>Placar</NavLink>
              <NavLink to="/times" style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Times</NavLink>
              <NavLink to="/campeonatos" style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Campeonatos</NavLink>
              <a href="https://www.aureoartes.com.br/" target="_blank" rel="noopener noreferrer" style={lojaBtnStyle}>Loja</a>
              {!logged ? (
                <Link to="/login" style={{ ...baseLinkStyle, background: "rgba(255,255,255,0.14)", fontWeight: 700 }}>Entrar</Link>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <NavLink to="/perfil" style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Perfil</NavLink>
                  <button onClick={handleLogout} className="btn btn--muted" style={{ padding: "6px 10px" }}>Sair</button>
                </div>
              )}
            </div>
          ) : (
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

        {!showDesktop && (
          <div style={mobileMenu}>
            <div style={{ display: "grid", gap: 6 }}>
              <NavLink to="/" onClick={() => setOpen(false)} style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Home</NavLink>
              <NavLink to="/placar" onClick={() => setOpen(false)} style={({ isActive }) => (isActive ? placarBtnActive : placarBtnStyle)}>Placar</NavLink>
              <NavLink to="/times" onClick={() => setOpen(false)} style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Times</NavLink>
              <NavLink to="/campeonatos" onClick={() => setOpen(false)} style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Campeonatos</NavLink>
              <a href="https://www.aureoartes.com.br/" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={{ ...lojaBtnStyle, display: "block", marginTop: 6, textAlign: "center" }}>Loja</a>
              {!logged ? (
                <Link to="/login" onClick={() => setOpen(false)} style={{ ...baseLinkStyle, background: "rgba(255,255,255,0.14)", fontWeight: 700 }}>Entrar</Link>
              ) : (
                <>
                  <NavLink to="/perfil" onClick={() => setOpen(false)} style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}>Perfil</NavLink>
                  <button onClick={() => { setOpen(false); handleLogout(); }} className="btn btn--muted" style={{ padding: "6px 10px" }}>Sair</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
