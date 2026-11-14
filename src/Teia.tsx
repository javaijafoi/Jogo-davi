// Teia decorativa original (fios radiais + anéis). Fica nos cantos, nunca atrás das letras.

type Props = { tamanho?: number; className?: string; cor?: string };

export function Teia({ tamanho = 160, className = '', cor = 'currentColor' }: Props) {
  const raios = 7;
  const aneis = [0.25, 0.45, 0.65, 0.85, 1];
  const pontos = (r: number) =>
    Array.from({ length: raios }, (_, i) => {
      const a = (Math.PI / 2) * (i / (raios - 1));
      return [Math.cos(a) * r * 100, Math.sin(a) * r * 100] as const;
    });
  return (
    <svg className={`teia ${className}`} viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden="true">
      <g stroke={cor} strokeWidth="0.9" fill="none" strokeLinecap="round">
        {pontos(1.05).map(([x, y], i) => (
          <line key={i} x1="0" y1="0" x2={x} y2={y} />
        ))}
        {aneis.map((r) => {
          const p = pontos(r);
          let d = `M${p[0][0]} ${p[0][1]}`;
          for (let i = 1; i < p.length; i++) {
            const [x0, y0] = p[i - 1];
            const [x1, y1] = p[i];
            // curva levemente "caída" entre os fios, como teia de verdade
            const cx = ((x0 + x1) / 2) * 0.86;
            const cy = ((y0 + y1) / 2) * 0.86;
            d += ` Q${cx} ${cy} ${x1} ${y1}`;
          }
          return <path key={r} d={d} />;
        })}
      </g>
    </svg>
  );
}

export function IconeTeia({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
        {[0, 45, 90, 135].map((a) => (
          <line key={a} x1="12" y1="1.5" x2="12" y2="22.5" transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="8" />
      </g>
    </svg>
  );
}
