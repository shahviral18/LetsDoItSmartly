export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Logo placeholder — replace with real SVG/image */}
      <div
        className="rounded-2xl flex items-center justify-center font-bold text-white shadow-lg"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #1A7DC4 0%, #29ABE2 100%)',
          fontSize: size * 0.4,
        }}
      >
        LD
      </div>
      <span className="text-lg font-semibold tracking-tight" style={{ color: '#0D5A96' }}>
        Letsdoitsmartly
      </span>
    </div>
  );
}
