// src/components/MenuAcoesNarrow.jsx
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * MenuAcoesNarrow
 * Botão hambúrguer que abre um popover com ações compactas (para mobile).
 *
 * Props:
 * - id: string | number (identificador único da linha)
 * - openMenuId: id atualmente aberto (controlado pelo pai)
 * - setOpenMenuId: (id | null) => void
 * - actions: Array<{ label: string, variant?: "orange" | "muted" | "red",
 *                    to?: string, onClick?: () => void, disabled?: boolean }>
 *   - Use "to" para links (react-router Link) OU "onClick" para botão.
 */
export default function MenuAcoesNarrow({
  id,
  openMenuId,
  setOpenMenuId,
  actions = [],
}) {
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const isOpen = openMenuId === id;

  // Fecha por click-fora e ESC
  useEffect(() => {
    if (!isOpen) return;
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpenMenuId(null);
    }
    function onKey(e) { if (e.key === "Escape") setOpenMenuId(null); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, setOpenMenuId]);

  // Decide abrir para cima se faltar espaço
  let openUp = false;
  let topStyle = "calc(100% + 6px)";
  if (typeof window !== "undefined" && btnRef.current) {
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = Math.max(48, actions.length * 36 + 20); // aproximação
    if (spaceBelow < menuHeight) {
      openUp = true;
      topStyle = "auto";
    }
  }

  const closeAnd = (fn) => () => {
    setOpenMenuId(null);
    if (typeof fn === "function") fn();
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn btn--sm btn--muted btn--icon"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpenMenuId(isOpen ? null : id)}
        title="mais ações"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: openUp ? "auto" : topStyle,
            bottom: openUp ? "calc(100% + 6px)" : "auto",
            padding: 8,
            zIndex: 20,
            minWidth: 160,
          }}
        >
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {actions.map((a, idx) => {
              const cls =
                a.className
                  ? `btn btn--sm ${a.className}`
                  : "btn btn--sm " + (
                      a.variant === "red" ? "btn--red" :
                      a.variant === "muted" ? "btn--muted" :
                      a.variant === "primary" ? "btn--primary" :
                      "btn--orange" // fallback
                    );
              const common = { role: "menuitem", "aria-disabled": a.disabled || undefined };

              if (a.to) {
                return (
                  <Link
                    key={idx}
                    {...common}
                    className={cls}
                    to={a.to}
                    onClick={(e) => {
                      if (a.disabled) e.preventDefault();
                      else closeAnd(a.onClick)();
                    }}
                  >
                    {a.label}
                  </Link>
                );
              }
              return (
                <button
                  key={idx}
                  {...common}
                  className={cls}
                  type="button"
                  disabled={a.disabled}
                  onClick={closeAnd(a.onClick)}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
