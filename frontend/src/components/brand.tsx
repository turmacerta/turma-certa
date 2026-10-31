export const LOGO_PURPLE = "#a32fd9";
export const LOGO_LIME = "#adf743";
export const LOGO_VIEWBOX = "176 176 1580 1580";
export const LOGO_OUTER_ARC = "M958 300 A716 666 0 0 0 958 1632";
export const LOGO_INNER_ARC = "M958 600 A388 366 0 0 0 958 1332";
export const LOGO_T = "M736 525H1739V929H1433V1680H1043V929H736ZM866 663V793H1172V1543H1302V793H1609V663Z";
export const LOGO_SEAMS = ["M806 386Q892 438 874 548", "M974 340Q930 425 1000 505"];

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} aria-hidden>
      <defs>
        <clipPath id="tc-logo-ball">
          <circle cx="908" cy="435" r="110" />
        </clipPath>
      </defs>
      <g fill="none" stroke={LOGO_PURPLE} strokeWidth="97">
        <path d={LOGO_OUTER_ARC} />
        <path d={LOGO_INNER_ARC} />
      </g>
      <g fill={LOGO_PURPLE}>
        <rect x="940" y="252" width="799" height="95" />
        <rect x="861" y="1290" width="97" height="390" />
      </g>
      <path fill={LOGO_LIME} fillRule="evenodd" d={LOGO_T} />
      <circle cx="908" cy="435" r="110" fill={LOGO_LIME} />
      <g clipPath="url(#tc-logo-ball)" fill="none" stroke={LOGO_PURPLE} strokeWidth="22">
        {LOGO_SEAMS.map((seam) => (
          <path key={seam} d={seam} />
        ))}
      </g>
    </svg>
  );
}

export function BrandMark({
  className = "",
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      {compact ? null : (
        <span className="display whitespace-nowrap text-xl font-bold">Turma Certa</span>
      )}
    </span>
  );
}
