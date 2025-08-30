import { Link } from "react-router-dom";
import logo from "../assets/logo_aureoartes_mini_q.png";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg,#FFF6EF, #FFE7D4)" }}>
      {/* HERO */}
      <section
        className="hero"
        style={{
          padding: "56px 20px 40px",
          background: "linear-gradient(135deg, #FF7A00 0%, #FF9D4D 100%)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "center" }}>
          {/* Esquerda: Título + CTA */}
          <div style={{ zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <img
                src={logo}
                alt="AUREOARTES"
                style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 12, background: "#fff" }}
              />
              <h1 style={{ margin: 0, fontSize: 28, letterSpacing: .6, fontWeight: 900 }}>AUREOARTES</h1>
            </div>
            <h2 style={{ margin: "6px 0 12px", fontSize: 22, fontWeight: 700 }}>
              Sua plataforma para gerenciar competições de futebol.
            </h2>
            <p style={{ opacity: .95, lineHeight: 1.5, maxWidth: 640 }}>
              Cadastre times e jogadores, organize campeonatos em pontos corridos, grupos ou mata-mata,
              e acompanhe tudo com placar eletrônico. Simples, bonito e no seu ritmo.
            </p>

            <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <Link to="/times" className="btn btn--primary" style={{ padding: "12px 16px" }}>
                Começar agora
              </Link>
              <Link to="/campeonatos" className="btn btn--orange" style={{ padding: "12px 16px" }}>
                Criar campeonato
              </Link>
              <Link to="/jogadores" className="btn btn--muted" style={{ padding: "12px 16px" }}>
                Ver jogadores
              </Link>
            </div>
          </div>

          {/* Direita: Cart azinho com atalhos */}
          <div
            className="card"
            style={{
              padding: 20,
              borderRadius: 16,
              background: "#fff",
              boxShadow: "var(--shadow-lg)",
              zIndex: 1,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Atalhos rápidos</h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Link to="/times" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Times</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Cadastre cores, escudos e gerencie seu elenco.
                </p>
              </Link>
              <Link to="/jogadores" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Jogadores</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Inclua apelidos, posições e números.
                </p>
              </Link>
              <Link to="/campeonatos" className="card card--soft" style={{ padding: 16, textDecoration: "none" }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Campeonatos</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Pontos corridos, grupos ou mata-mata.
                </p>
              </Link>
              <a
                href="https://www.aureoartes.com.br/"
                target="_blank"
                rel="noreferrer"
                className="card card--soft"
                style={{ padding: 16, textDecoration: "none" }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--text)" }}>Loja</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                  Acesse a AUREOARTES e conheça nossos produtos.
                </p>
              </a>
            </div>
          </div>
        </div>

        {/* Ornamentos do hero */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(255,255,255,.12)",
            filter: "blur(0.5px)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 40,
            top: 120,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,.10)",
          }}
        />
      </section>

      {/* Destaques */}
      <section className="container" style={{ padding: "28px 20px" }}>
        <div className="card card--soft" style={{ padding: 18 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Pronta para o placar</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Placar eletrônico integrado: manual ou automatizado.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="container" style={{ padding: "0 20px 36px" }}>
        <div
          className="card"
          style={{
            padding: 20,
            border: "1px dashed var(--line)",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Pronto para começar?</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Crie seu primeiro campeonato e convide os times.
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/campeonatos" className="btn btn--primary" style={{ padding: "10px 12px" }}>
              Criar campeonato
            </Link>
            <a
              href="https://www.aureoartes.com.br/"
              target="_blank"
              rel="noreferrer"
              className="btn btn--muted"
              style={{ padding: "10px 12px" }}
            >
              Conhecer a loja
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
