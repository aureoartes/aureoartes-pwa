import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * StoreBanner.jsx — Banner dinâmico para a Loja AureoArtes
 *
 * Recursos
 * - Rotação automática (pausa ao focar/hover)
 * - Indicadores (bolinhas) e setas
 * - Suporte a imagem opcional, badge e cores por item
 * - Dissolve/slide suave
 * - A11y: rolagem via teclado e rótulos ARIA
 *
 * Uso:
 * <StoreBanner
 *   items={[
 *     { key: "oferta1", title: "Times artesanais", subtitle: "Coleções clássicas e personalizadas", href: "https://www.aureoartes.com.br/", imageUrl: "/assets/hero1.png", bg: "linear-gradient(135deg,#FFE6CC,#FFF2E5)", border: "#ffd6ad", badge: "Novidades" },
 *     { key: "oferta2", title: "Acessórios", subtitle: "Palhetas, dadinhos e goleiros", href: "https://www.aureoartes.com.br/", bg: "linear-gradient(135deg,#FFF5E8,#FFE4CC)", border: "#ffddb8" },
 *   ]}
 *   intervalMs={6000}
 * />
 */

export default function StoreBanner({ items = [], intervalMs = 6000 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrap = (n) => (n + items.length) % items.length;
  const timerRef = useRef(null);
  const rootRef = useRef(null);

  const current = items[idx] || {};

  // Auto rotação
  useEffect(() => {
    if (!items.length || paused) return;
    timerRef.current = setInterval(() => setIdx((i) => wrap(i + 1)), intervalMs);
    return () => clearInterval(timerRef.current);
  }, [items.length, paused, intervalMs]);

  // Teclado
  useEffect(() => {
    const onKey = (e) => {
      if (!rootRef.current || !rootRef.current.contains(document.activeElement)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); setIdx((i) => wrap(i + 1)); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); setIdx((i) => wrap(i - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Swipe (mobile)
  useEffect(() => {
    let startX = 0; let dx = 0;
    const el = rootRef.current;
    if (!el) return;
    const onStart = (e) => { startX = e.touches?.[0]?.clientX ?? 0; dx = 0; };
    const onMove  = (e) => { dx = (e.touches?.[0]?.clientX ?? 0) - startX; };
    const onEnd   = () => { if (Math.abs(dx) > 40) setIdx((i) => wrap(i + (dx < 0 ? 1 : -1))); };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); };
  }, [items.length]);

  if (!items.length) return null;

  return (
    <section className="container" style={{ padding: "8px 16px 36px" }}>
      <div
        ref={rootRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Destaques da Loja AureoArtes"
        tabIndex={0}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ position: "relative" }}
      >
        {/* Slide atual */}
        <article
          key={current.key || idx}
          style={{
            transition: "opacity 220ms ease, transform 220ms ease",
            opacity: 1,
            transform: "translateZ(0)",
          }}
        >
          <a
            href={current.href}
            target="_blank"
            rel="noreferrer"
            className="card"
            style={{
              display: "block",
              padding: 20,
              textDecoration: "none",
              color: "inherit",
              background: current.bg || "linear-gradient(135deg,#FFE6CC,#FFF2E5)",
              border: `1px solid ${current.border || "#ffd6ad"}`,
              overflow: "hidden",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                {current.badge && (
                  <span style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "#ff6a00",
                    color: "#fff",
                    marginBottom: 8,
                  }}>{current.badge}</span>
                )}
                <h3 style={{ fontWeight: 900, fontSize: 20, margin: 0 }}>{current.title}</h3>
                {current.subtitle && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>{current.subtitle}</p>
                )}
              </div>

              {current.imageUrl && (
                <img
                  src={current.imageUrl}
                  alt="Destaque Loja AureoArtes"
                  style={{
                    height: 88,
                    width: "auto",
                    objectFit: "contain",
                    borderRadius: 12,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                  }}
                />
              )}

              {/* CTA visual */}
              <div className="btn btn--orange" aria-hidden>Visitar loja</div>
            </div>
          </a>
        </article>

        {/* Controles */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {items.map((it, i) => (
              <button
                key={it.key || i}
                aria-label={`Ir para destaque ${i + 1}`}
                onClick={() => setIdx(i)}
                style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: i === idx ? "#ff6a00" : "#ffd6ad",
                  border: "none",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              aria-label="Anterior"
              onClick={() => setIdx((i) => wrap(i - 1))}
              className="btn btn--muted"
              style={{ padding: "6px 10px" }}
            >
              ‹
            </button>
            <button
              aria-label="Próximo"
              onClick={() => setIdx((i) => wrap(i + 1))}
              className="btn btn--muted"
              style={{ padding: "6px 10px" }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
