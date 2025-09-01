import { useState, useEffect } from "react";

/**
 * Controlável:
 * - Passe `open` para controlar externamente (boolean)
 * - Use `onToggle(nextOpen)` para ser notificado ao abrir/fechar
 * - Se `open` não for passado, funciona de forma interna via `defaultOpen`
 */
export default function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  open,                  // opcional (controlado)
  onToggle,              // opcional
}) {
  const isControlled = typeof open === "boolean";
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const shown = isControlled ? open : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    setInternalOpen(defaultOpen);
  }, [defaultOpen, isControlled]);

  const toggle = () => {
    if (isControlled) {
      onToggle && onToggle(!open);
    } else {
      setInternalOpen((o) => {
        const next = !o;
        onToggle && onToggle(next);
        return next;
      });
    }
  };

  return (
    <div className="card collapsible">
      <button
        type="button"
        className="collapsible__header"
        onClick={toggle}
        aria-expanded={shown}
      >
        <div>
          <div className="collapsible__title">{title}</div>
          {subtitle && <div className="collapsible__subtitle">{subtitle}</div>}
        </div>
        <div className={`chevron ${shown ? "chevron--up" : "chevron--down"}`} aria-hidden />
      </button>
      {shown && <div className="collapsible__body">{children}</div>}
    </div>
  );
}
