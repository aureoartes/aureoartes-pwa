// src/components/ListaCompactaItem.jsx
import React from "react";

/**
 * Componente reutilizável de item de lista compacta.
 *
 * Props:
 * - icone: JSX (renderiza à esquerda, ex: avatar/bola colorida)
 * - titulo: string ou JSX (linha principal)
 * - subtitulo: string ou JSX (linha secundária, opcional)
 * - acoes: JSX (botões à direita, ex: Editar/Excluir)
 * - padding: padding interno do item (default: "8px 10px")
 */
export default function ListaCompactaItem({
  icone,
  titulo,
  subtitulo,
  acoes,
  padding = "8px 10px",
}) {
  return (
    <li className="list__item" style={{ padding }}>
      <div className="list__left">
        {icone && <span aria-hidden>{icone}</span>}
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <div className="list__title">{titulo}</div>
          {subtitulo && <div className="list__subtitle">{subtitulo}</div>}
        </div>
      </div>
      {acoes && <div className="row" style={{ gap: 6, flexShrink: 0 }}>{acoes}</div>}
    </li>
  );
}
