import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-4xl font-mono text-[#ff6600] glow-text">&gt;&gt; OFFLINE</p>
        <p className="text-sm text-[#505070] font-mono leading-relaxed max-w-sm">
          Sin conexion a internet.
          <br />
          Tus documentos estan guardados localmente y seguiran disponibles.
        </p>
        <Link
          href="/"
          className="text-xs font-mono text-[#00d4ff] underline underline-offset-2 hover:text-[#e0e0f0] transition"
        >
          &gt;&gt; Reintentar conexion
        </Link>
      </div>
    </div>
  );
}