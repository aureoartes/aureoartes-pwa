import { Link } from "react-router-dom";
import logo from "../assets/logo_aureoartes_mini_q.png";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#FFF6EF, #FFE7D4)" }}>
      {/* HERO */}
      <section
        className="page-header"
        style={{ background: "linear-gradient(135deg, #FF7A00 0%, #FF9D4D 100%)", marginBottom: 0 }}
      >
        <div className="container">
          <div className="grid grid-2">
            <div>
              <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                <img
                  src={logo}
                  alt="AUREOARTES"
                  style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 12, background: "#fff" }}
                />
                <h1 className="page-header__title" style={{ margin: 0 }}>AUREOARTES</h1>
              </div>
              <h2 style={{ margin: "6px 0 12px", fontSize: 20, fontWeight: 700 }}>
                Gerencie competições de futebol com simplicidade.
              </h2>
              <p className="page-header__subtitle" style={{ maxWidth: 640 }}>
                Cadastre times e jogadores, organize campeonatos (pontos corridos, grupos ou mata-mata)
                e acompanhe tudo com placar eletrônico.
              </p>
              <div className="row" style={{ gap: 10, marginTop: 16 }}>
                <Link to="/times" className="btn btn--primary">Começar agora</Link>
                <Link to="/campeonatos" className="btn btn--orange">Criar campeonato</Link>
                <Link to="/jogadores" className="btn btn--muted">Ver jogadores</Link>
              </div>
            </div>
            <div className="card" style={{ padding: 16, background: "#fff" }}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Atalhos rápidos</h3>
              <div className="grid grid-2">
                <Link to="/times" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Times</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Cores, escudos e elenco.</p>
                </Link>
                <Link to="/jogadores" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Jogadores</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Apelidos, posições e números.</p>
                </Link>
                <Link to="/campeonatos" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Campeonatos</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Pontos corridos, grupos, mata-mata.</p>
                </Link>
                <a
                  href="https://www.aureoartes.com.br/"
                  target="_blank"
                  rel="noreferrer"
                  className="card card--soft"
                  style={{ padding: 16, textDecoration: "none" }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Loja</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Conheça nossos produtos.</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="container" style={{ padding: "20px 16px 36px" }}>
        <div className="card card--soft" style={{ padding: 16 }}>
          <div className="grid grid-2">
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Organize tudo</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Cadastre times, jogadores e competições de forma integrada.
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Regras flexíveis</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Pontos corridos, grupos e mata-mata com prorrogação e pênaltis.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
