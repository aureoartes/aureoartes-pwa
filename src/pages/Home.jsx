import { Link } from "react-router-dom";
import TeamIcon from "../components/TeamIcon";
import StoreBanner from "../components/StoreBanner";
import { isLogged } from "../config/appUser";

export default function Home() {
  const logged = isLogged();
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
                <Link to="/placar" className="btn btn--primary" style={{ padding: "12px 18px", fontWeight: 800 }}>
                  Abrir placar
                </Link>
              </div>
            </div>

            {/* Lado direito: prévia ilustrativa (não clicável) */}
            <div className="card" style={{ padding: 18, borderColor: "#ffddb8", background: "#fff9f3", color: "#2c1a11" }}>
              <div style={{ fontWeight: 900, marginBottom: 8, fontSize: 16, letterSpacing: 0.2 }}>Prévia do jogo</div>
              {/* Brasil x Argentina */}
              <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div className="row" style={{ alignItems: "center", gap: 8 }}>
                  <TeamIcon team={{ cor1: "#FFD400", cor2: "#1B5E20", cor_detalhe: "#0D47A1" }} size={28} />
                  <span style={{ fontWeight: 700 }}>Brasil</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 18 }}>2 x 1</span>
                <div className="row" style={{ alignItems: "center", gap: 8 }}>
                  <TeamIcon team={{ cor1: "#FFFFFF", cor2: "#2196F3", cor_detalhe: "#111111" }} size={28} />
                  <span style={{ fontWeight: 700 }}>Argentina</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#7a5643", marginTop: 8 }}>12/09/2025 • 18:00 • Estádio da Amizade</div>
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
          <div className="card card--soft" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Entre para acessar tudo</div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Sem login você acessa apenas o <strong>Placar</strong> e a <strong>Loja</strong>.<br />
              Faça login para gerenciar <strong>Times</strong>, <strong>Campeonatos</strong> e seu <strong>Perfil</strong>.
            </p>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Link to="/login" className="btn btn--primary">Entrar</Link>
              <Link to="/placar" className="btn btn--muted">Abrir placar</Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
