export function LogoIcon({ className = "", size = 40 }: { className?: string; size?: number }) {
  const nodeR = size * 0.08;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  const positions = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
    [0, 2], [2, 4], [4, 0], [1, 3], [3, 5], [5, 1],
  ];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      width={size}
      height={size}
      aria-label="Mycelium logo"
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {edges.map(([i, j], idx) => (
        <line
          key={`edge-${idx}`}
          x1={positions[i].x}
          y1={positions[i].y}
          x2={positions[j].x}
          y2={positions[j].y}
          stroke="#00d4ff"
          strokeWidth={0.8}
          strokeOpacity={0.3}
          className="animate-pulse"
          style={{ animationDelay: `${(idx * 300) % 2000}ms`, animationDuration: "3s" }}
        />
      ))}
      {positions.map((p, i) => (
        <g key={`node-${i}`}>
          <circle cx={p.x} cy={p.y} r={nodeR * 2.5} fill="url(#nodeGlow)" opacity={0.4}>
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" begin={`${i * 0.5}s`} />
          </circle>
          <circle cx={p.x} cy={p.y} r={nodeR} fill="#00d4ff" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={nodeR * 1.2} fill="#ff00ff" opacity={0.8}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon size={32} />
      <span
        className="text-xl font-bold tracking-[0.15em] uppercase"
        style={{
          color: "#00d4ff",
          textShadow: "0 0 20px rgba(0, 212, 255, 0.3), 0 0 40px rgba(0, 212, 255, 0.1)",
        }}
      >
        Mycelium
      </span>
    </div>
  );
}
