import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import logo from "../assets/logo_aureoartes.png"; // ajuste se o arquivo tiver outro nome

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const containerStyle = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    transition: "all 300ms",
    background: scrolled
      ? "rgba(255,102,0,0.82)" // laranja com transparência ao rolar
      : "linear-gradient(90deg, #ff6a00, #ff7e2d)", // fundo laranja padrão
    backdropFilter: scrolled ? "blur(6px)" : "none",
    boxShadow: scrolled ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
  };

  const navInner = {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "0 16px",
  };

  const row = {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const brand = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
  };

  const brandText = {
    color: "#fff",
    fontWeight: 800,
    letterSpacing: "0.6px",
    fontSize: 18,
  };

  const desktopMenu = {
    display: "none",
  };

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

  const mobileMenu = {
    paddingBottom: 10,
    display: open ? "block" : "none",
    animation: "fadeIn 120ms ease-out",
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
  };

  // media query simples para mostrar menu desktop
  const isDesktop = () => window.innerWidth >= 768;

  const [showDesktop, setShowDesktop] = useState(isDesktop());
  useEffect(() => {
    const onResize = () => setShowDesktop(isDesktop());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header style={containerStyle}>
      <nav style={navInner}>
        <div style={row}>
          {/* Logo + Nome */}
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

          {/* Desktop menu */}
          {showDesktop ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <NavLink
                to="/"
                style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}
              >
                Home
              </NavLink>

              <NavLink
                to="/times"
                style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}
              >
                Times
              </NavLink>

              <NavLink
                to="/jogadores"
                style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}
              >
                Jogadores
              </NavLink>

              <NavLink
                to="/campeonatos"
                style={({ isActive }) => (isActive ? activeLinkStyle : baseLinkStyle)}
              >
                Campeonatos
              </NavLink>

              <a
                href="https://www.aureoartes.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                style={lojaBtnStyle}
              >
                {/* ícone simples */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="2" />
                  <path d="M13 7h4v4M11 17H7v-4" stroke="currentColor" strokeWidth="2" />
                </svg>
                Loja
              </a>
            </div>
          ) : (
            // Mobile hamburger
            <button
              aria-label="Abrir menu"
              onClick={() => setOpen((v) => !v)}
              style={mobileToggle}
            >
              {open ? (
                // X
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                // ☰
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Mobile menu */}
        {!showDesktop && (
          <div style={mobileMenu}>
            <div style={{ display: "grid", gap: 6 }}>
              <NavLink
                to="/"
                onClick={() => setOpen(false)}
                style={({ isActive }) =>
                  (isActive ? activeLinkStyle : baseLinkStyle)
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/times"
                onClick={() => setOpen(false)}
                style={({ isActive }) =>
                  (isActive ? activeLinkStyle : baseLinkStyle)
                }
              >
                Times
              </NavLink>
              <NavLink
                to="/jogadores"
                onClick={() => setOpen(false)}
                style={({ isActive }) =>
                  (isActive ? activeLinkStyle : baseLinkStyle)
                }
              >
                Jogadores
              </NavLink>
              <NavLink
                to="/campeonatos"
                onClick={() => setOpen(false)}
                style={({ isActive }) =>
                  (isActive ? activeLinkStyle : baseLinkStyle)
                }
              >
                Campeonatos
              </NavLink>
              <a
                href="https://www.aureoartes.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                style={{
                  ...lojaBtnStyle,
                  display: "block",
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                Loja
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
