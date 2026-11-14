// O Davi: menino pequeno, traços indígenas, capacete verde, blusa verde-escura,
// bermuda jeans, chuteirinha azul com sola laranja e skate (roxo por padrão).

type Props = {
  humor?: 'parado' | 'festa' | 'pensando';
  corSkate?: string;
  tamanho?: number;
  className?: string;
};

export function Davi({ humor = 'parado', corSkate = '#7b3fe4', tamanho = 140, className = '' }: Props) {
  return (
    <svg
      className={`davi davi-${humor} ${className}`}
      viewBox="0 0 120 160"
      width={tamanho}
      height={(tamanho * 160) / 120}
      role="img"
      aria-label="Davi no skate"
    >
      <g className="davi-corpo">
        {/* braço esquerdo */}
        <g className="braco braco-e">
          <rect x="34" y="73" width="13" height="11" rx="5" fill="#1e5631" />
          <path d="M38 80 L31 100" stroke="#a8683f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="31" cy="101" r="5" fill="#a8683f" />
        </g>
        {/* braço direito */}
        <g className="braco braco-d">
          <rect x="73" y="73" width="13" height="11" rx="5" fill="#1e5631" />
          <path d="M82 80 L89 100" stroke="#a8683f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="89" cy="101" r="5" fill="#a8683f" />
        </g>

        {/* pescoço */}
        <rect x="55" y="64" width="10" height="10" fill="#96592f" />

        {/* blusa verde-escura */}
        <path d="M44 74 Q44 70 50 70 L70 70 Q76 70 76 74 L77 103 L43 103 Z" fill="#1e5631" />
        <path d="M54 70 Q60 76 66 70" fill="none" stroke="#143d22" strokeWidth="2" />

        {/* bermuda jeans */}
        <path d="M43 101 L77 101 L78 118 L62 118 L60 110 L58 118 L42 118 Z" fill="#3d6fa8" />
        <path d="M43 104 L77 104" stroke="#6f9bd1" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M60 104 L60 110" stroke="#2a5287" strokeWidth="1.2" />

        {/* pernas */}
        <rect x="47" y="117" width="8" height="13" rx="3" fill="#a8683f" />
        <rect x="65" y="117" width="8" height="13" rx="3" fill="#a8683f" />

        {/* chuteirinhas azuis com sola laranja */}
        <path d="M43 128 Q43 125 47 125 L56 125 Q60 125 60 130 L60 133 L43 133 Z" fill="#1f5fd6" />
        <path d="M60 128 Q60 125 64 125 L73 125 Q77 125 77 130 L77 133 L60 133 Z" fill="#1f5fd6" />
        <rect x="42" y="132" width="19" height="3.5" rx="1.5" fill="#ff8a1f" />
        <rect x="59" y="132" width="19" height="3.5" rx="1.5" fill="#ff8a1f" />
        <path d="M47 127 L52 127 M64 127 L69 127" stroke="#ffffff" strokeWidth="1" opacity=".8" />

        {/* cabelo atrás (liso e preto) */}
        <path d="M36 40 Q36 30 60 30 Q84 30 84 40 L84 60 Q80 63 78 58 L42 58 Q40 63 36 60 Z" fill="#141414" />
        {/* orelhas */}
        <circle cx="39.5" cy="52" r="4" fill="#96592f" />
        <circle cx="80.5" cy="52" r="4" fill="#96592f" />
        {/* rosto */}
        <ellipse cx="60" cy="50" rx="19" ry="18" fill="#a8683f" />
        {/* franja reta */}
        <path d="M40 38 L80 38 L80 45 L76 44 L72 46 L68 44 L64 46 L60 44 L56 46 L52 44 L48 46 L44 44 L40 45 Z" fill="#141414" />
        {/* sobrancelhas */}
        <path d="M49 47.5 L55 47" stroke="#141414" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M65 47 L71 47.5" stroke="#141414" strokeWidth="1.6" strokeLinecap="round" />
        {/* olhos */}
        <g className="olhos">
          <ellipse cx="52" cy="52" rx="2.8" ry="2.3" fill="#1a0f08" />
          <ellipse cx="68" cy="52" rx="2.8" ry="2.3" fill="#1a0f08" />
          <circle cx="53" cy="51.2" r=".8" fill="#fff" />
          <circle cx="69" cy="51.2" r=".8" fill="#fff" />
        </g>
        {/* bochechas */}
        <circle cx="47" cy="58" r="3" fill="#e0785a" opacity=".45" />
        <circle cx="73" cy="58" r="3" fill="#e0785a" opacity=".45" />
        {/* nariz e boca */}
        <path d="M59 55 Q60 57 61 55" stroke="#7a4421" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {humor === 'pensando' ? (
          <path d="M55 61.5 L65 60.5" stroke="#5a2a12" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M53 59.5 Q60 66 67 59.5" stroke="#5a2a12" strokeWidth="1.8" fill={humor === 'festa' ? '#7a2a1a' : 'none'} strokeLinecap="round" />
        )}

        {/* capacete verde */}
        <path d="M35 40 Q35 13 60 13 Q85 13 85 40 Z" fill="#2fae4f" />
        <path d="M33 40 L87 40 Q87 43 84 43 L36 43 Q33 43 33 40 Z" fill="#23893d" />
        <path d="M52 15 L52 26 M60 13.5 L60 26 M68 15 L68 26" stroke="#5fd17c" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M38 43 Q40 58 49 64" stroke="#1d6b31" strokeWidth="1.5" fill="none" />
      </g>

      {/* skate */}
      <g className="skate">
        <rect x="20" y="136" width="80" height="8" rx="4" fill={corSkate} />
        <rect x="24" y="136" width="72" height="2" rx="1" fill="#000" opacity=".25" />
        <circle cx="35" cy="149" r="5" fill="#f1f1f1" stroke="#9aa0a6" strokeWidth="1.5" />
        <circle cx="85" cy="149" r="5" fill="#f1f1f1" stroke="#9aa0a6" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
