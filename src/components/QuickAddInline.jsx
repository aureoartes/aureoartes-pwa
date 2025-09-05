// src/components/QuickAddInline.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * QuickAddInline
 * Popover inline para criar um registro simples e retornar o valor criado.
 *
 * Props:
 * - label: string (ex.: "Nova região")
 * - placeholder: string (ex.: "Ex.: Zona Norte")
 * - onCreate: async (texto: string) => Promise<void>   // pai executa criação (ex.: Supabase)
 * - onClose: () => void                                 // fecha o popover
 * - align?: "left" | "right" (default: "left")
 */
export default function QuickAddInline({
  label = "Novo item",
  placeholder = "Digite aqui…",
  onCreate,
  onClose,
  align = "left",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    inputRef.current?.focus();

    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) onClose?.();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    await onCreate?.(text);
    onClose?.();
  }

  return (
    <div
      ref={wrapRef}
      className="card"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        [align]: 0,
        zIndex: 30,
        padding: 8,
        minWidth: 260,
      }}
    >
      <form onSubmit={handleSubmit}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="label" htmlFor="quick-add-inline-input">{label}</label>
          <input
            id="quick-add-inline-input"
            ref={inputRef}
            className="input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn--sm btn--orange" type="submit">Salvar</button>
          <button className="btn btn--sm btn--muted" type="button" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
