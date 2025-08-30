export default function PageHeader({ title, subtitle, right }) {
  const container = {
    width: "100%",
    background: "linear-gradient(90deg, #ff6a00, #ff7e2d)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    color: "#fff",
  };
  const inner = {
    maxWidth: 1120,
    margin: "0 auto",
    padding: "18px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
  const left = { display: "grid", gap: 4 };
  const h1 = {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 0.4,
  };
  const p = {
    margin: 0,
    opacity: 0.95,
    fontSize: 13,
    fontWeight: 500,
  };
  return (
    <div style={container}>
      <div style={inner}>
        <div style={left}>
          <h1 style={h1}>{title}</h1>
          {subtitle ? <p style={p}>{subtitle}</p> : null}
        </div>
        {/* Ações à direita (opcional) */}
        {right ? <div>{right}</div> : null}
      </div>
    </div>
  );
}
