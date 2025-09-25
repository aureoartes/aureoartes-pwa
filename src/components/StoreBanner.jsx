// src/components/StoreBanner.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * items: [{ key, title, subtitle, href, imageUrl, bg, border, badge, alt }]
 * intervalMs: autoplay interval (ms)
 */
export default function StoreBanner({ items = [], intervalMs = 6000 }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const hoveringRef = useRef(false);

  const go = (n) => setIdx((prev) => (prev + n + safeItems.length) % safeItems.length);
  const goTo = (n) => setIdx((n + safeItems.length) % safeItems.length);

  // autoplay com pausa no hover
  useEffect(() => {
    if (!safeItems.length) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!hoveringRef.current) go(1);
    }, Math.max(2500, intervalMs || 0));
    return () => clearInterval(timerRef.current);
  }, [safeItems.length, intervalMs]);

  if (!safeItems.length) return null;
  const current = safeItems[idx];

  return (
    <section className="container" style={{ padding: "18px 16px 6px" }}>
      <div
        className="store-banner"
        style={{
          position: "relative",
          border: `1px solid ${current.border || "#f3e0cf"}`,
          borderRadius: 20,
          padding: 20,
          background: current.bg || "linear-gradient(135deg,#FFF5E8,#FFE8D8)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          transition: "background 300ms ease",
          overflow: "hidden",
        }}
        onMouseEnter={() => (hoveringRef.current = true)}
        onMouseLeave={() => (hoveringRef.current = false)}
      >
        {/* grid principal */}
        <div
          className="store-banner__grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* bloco de texto */}
          <div className="store-banner__text" style={{ minWidth: 0 }}>
            {/* badge */}
            {current.badge && (
              <span
                className="chip"
                style={{
                  display: "inline-block",
                  fontWeight: 800,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#FF6600",
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {current.badge}
              </span>
            )}

            {/* título */}
            <h3
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 26,
                lineHeight: 1.1,
                fontWeight: 900,
                color: "#2c1a11",
                letterSpacing: 0.1,
              }}
              title={current.title}
            >
              {current.title}
            </h3>

            {/* subtítulo */}
            {current.subtitle && (
              <p
                style={{
                  margin: 0,
                  marginBottom: 14,
                  fontSize: 16,
                  color: "var(--muted)",
                }}
                title={current.subtitle}
              >
                {current.subtitle}
              </p>
            )}

            {/* CTA */}
            <Link
              to={current.href}
              className="btn btn--orange"
              style={{ fontWeight: 800, padding: "10px 16px", display: "inline-flex" }}
            >
              Visitar loja
            </Link>
          </div>

          {/* bloco de imagem */}
          <div
            className="store-banner__image"
            style={{
              borderRadius: 16,
              background: "rgba(255,255,255,0.55)",
              padding: 6,
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                width: "100%",
                aspectRatio: "16 / 6", // 1200 x 450 recomendado
                background: "#fff",
              }}
            >
              {/* imagem responsiva */}
              {current.imageUrl ? (
                <img
                  src={current.imageUrl}
                  alt={current.alt || current.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  loading="lazy"
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted)",
                    fontSize: 14,
                  }}
                >
                  (adicione a imagem do banner)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* setas (sobre o card) */}
        <button
          aria-label="Anterior"
          onClick={() => go(-1)}
          className="btn"
          style={arrowStyle("left")}
        >
          ‹
        </button>
        <button
          aria-label="Próximo"
          onClick={() => go(1)}
          className="btn"
          style={arrowStyle("right")}
        >
          ›
        </button>

        {/* dots */}
        <div
          className="store-banner__dots"
          style={{
            position: "absolute",
            left: 16,
            bottom: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {safeItems.map((it, i) => (
            <button
              key={it.key || i}
              aria-label={`Ir para ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                border: "none",
                background: i === idx ? "#FF6600" : "#ffd6ad",
                opacity: i === idx ? 1 : 0.9,
                cursor: "pointer",
                transition: "transform 120ms ease",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function arrowStyle(side) {
  const base = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    borderRadius: 999,
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 900,
    color: "#FF6600",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #ffd6ad",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "background 120ms ease, transform 120ms ease",
  };
  return {
    ...base,
    [side === "left" ? "left" : "right"]: 10,
  };
}
