// src/components/ColorSwatchSelect.jsx
import React from "react";

export const COLOR_OPTIONS = [
  { key: "branco", value: "#FFFFFF" },
  { key: "preto", value: "#000000" },
  { key: "vermelho", value: "#E53935" },
  { key: "verde", value: "#43A047" },
  { key: "verde-escuro", value: "#1B5E20" },
  { key: "azul", value: "#1E88E5" },
  { key: "azul-escuro", value: "#0D47A1" },
  { key: "grena", value: "#7B1E3C" },
  { key: "amarelo", value: "#FBC02D" },
  { key: "laranja", value: "#FB8C00" },
  { key: "roxo", value: "#8E24AA" },
  { key: "rosa", value: "#EC407A" },
  { key: "marrom", value: "#6D4C41" },
  { key: "cinza", value: "#9E9E9E" },
];

/**
 * Seleção de cores com bolinhas (padrão do projeto)
 * Props:
 * - label: string exibida acima do grupo
 * - value: string (hex selecionado)
 * - onChange: função (novoValorHex) => void
 * - options: lista de { key, value } (padrão: COLOR_OPTIONS)
 */
export default function ColorSwatchSelect({ label, value, onChange, options = COLOR_OPTIONS }) {
  const selectedOpt = options.find((opt) => opt.value.toLowerCase() === value?.toLowerCase());

  return (
    <div className="field">
      {label && (
        <label className="label">
          {label}{selectedOpt ? ` — ${selectedOpt.key}` : ""}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className="row"
        style={{ gap: 8, flexWrap: "wrap" }}
      >
        {options.map((opt) => {
          const selected = value?.toLowerCase() === opt.value.toLowerCase();
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              title={opt.key}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: selected
                  ? "3px solid var(--brand-600)"
                  : "2px solid rgba(0,0,0,.2)",
                background: opt.value,
                boxShadow: selected
                  ? "0 0 0 2px rgba(0,0,0,.05) inset"
                  : "none",
                cursor: "pointer",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

