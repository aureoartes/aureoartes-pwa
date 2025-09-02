// src/components/TeamIcon.jsx
// Padrão global: ícone redondo, cores 1 e 2 divididas em diagonal, borda na cor detalhe,
// com efeito de esfera (gloss) — semelhante a um LED.
// Uso: <TeamIcon team={{ cor1: "#006400", cor2: "#ffd700", cor_detalhe: "#ffffff" }} />
// Se "team" for null/undefined, renderiza um ícone vazio com textura sutil.

export default function TeamIcon({ team, size = 24, title }) {
  const empty = !team;
  const c1 = team?.cor1 || "#d32f2f";     // fallback vermelho
  const c2 = team?.cor2 || "#1565c0";     // fallback azul
  const cd = team?.cor_detalhe || "#ffffff"; // fallback detalhe
  const grad = `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;

  const style = {
    width: size, height: size,
    "--detalhe": cd,
    "--grad": grad,
  };

  return (
    <span className={`team-icon${empty ? " team-icon--empty" : ""}`} style={style} title={title} aria-hidden>
      <span className="team-icon__bg" />
      <span className="team-icon__rim" />
      <span className="team-icon__gloss" />
      <style>{`
        .team-icon { border-radius: 50%; display: inline-block; position: relative; overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.10);
        }
        .team-icon__rim { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 2px var(--detalhe, #888); }
        .team-icon__bg { position: absolute; inset: 1px; border-radius: 50%; background: var(--grad, linear-gradient(135deg, #ddd 50%, #bbb 50%)); }
        .team-icon__gloss { position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.72), rgba(255,255,255,0) 40%),
                      radial-gradient(circle at 70% 75%, rgba(0,0,0,.10), rgba(0,0,0,0) 45%);
        }
        .team-icon--empty .team-icon__bg {
          background: repeating-conic-gradient(from 0deg, rgba(0,0,0,.05) 0 8deg, rgba(0,0,0,0) 8deg 16deg);
        }
      `}</style>
    </span>
  );
}
