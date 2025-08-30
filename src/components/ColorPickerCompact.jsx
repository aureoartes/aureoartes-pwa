import { useState } from "react";

const PALETA = [
  { nome: "Branco",       hex: "#FFFFFF" },
  { nome: "Preto",        hex: "#000000" },
  { nome: "Vermelho",     hex: "#D32F2F" },
  { nome: "Verde",        hex: "#43A047" },
  { nome: "Verde Escuro", hex: "#1B5E20" },
  { nome: "Azul",         hex: "#1E88E5" },
  { nome: "Azul Escuro",  hex: "#0D47A1" },
  { nome: "Grená",        hex: "#7B1F2B" },
  { nome: "Amarelo",      hex: "#FDD835" },
  { nome: "Laranja",      hex: "#FB8C00" },
  { nome: "Roxo",         hex: "#8E24AA" },
  { nome: "Rosa",         hex: "#EC407A" },
  { nome: "Marrom",       hex: "#6D4C41" },
  { nome: "Cinza",        hex: "#757575" },
];

export default function ColorPickerCompact({ label, value, onChange, disableHex }) {
  const [open, setOpen] = useState(false);
  const sel = PALETA.find(c => c.hex.toUpperCase() === (value||"").toUpperCase());

  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <div className="label">{label}</div>

      {/* Linha compacta */}
      <div className="row" style={{ justifyContent: "space-between", padding: "4px 6px" }}>
        <div className="row" style={{ gap: 8 }}>
          <span
            className="palette-dot"
            style={{ background: value, borderColor: "rgba(0,0,0,.25)", width: 18, height: 18 }}
            title={sel?.nome || value}
          />
          <span style={{ fontWeight: 700 }}>{sel?.nome || value}</span>
        </div>
        <button
          type="button"
          className="btn btn--muted"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          style={{ padding: "8px 10px" }}
        >
          {open ? "Fechar" : "Trocar"}
        </button>
      </div>

      {/* Paleta compacta: só bolinhas, bem próximas */}
      {open && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
            padding: "6px 4px 0",
          }}
        >
          {PALETA.map((c) => {
            const disabled = disableHex && c.hex.toUpperCase() === disableHex.toUpperCase();
            const active = value?.toUpperCase() === c.hex.toUpperCase();
            return (
              <button
                key={c.hex + label}
                type="button"
                onClick={() => !disabled && (onChange(c.hex), setOpen(false))}
                title={c.nome}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: active ? "2px solid var(--brand)" : "1px solid var(--line)",
                  background: c.hex,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.35 : 1,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
