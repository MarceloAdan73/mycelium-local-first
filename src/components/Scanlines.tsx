export function Scanlines() {
  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.06) 2px, rgba(0, 0, 0, 0.06) 4px)",
        backgroundSize: "100% 4px",
      }}
      aria-hidden
    />
  );
}
