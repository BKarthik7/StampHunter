'use client';

import Image from 'next/image';

// ─── Size Variants (Frontend-Spec §4) ────────────────────────────
const SIZE_MAP = {
  thumb:  160,
  card:   400,
  detail: 600,
} as const;

type StampSize = keyof typeof SIZE_MAP;

// ─── Stamp Geometry ───────────────────────────────────────────────
const PERF_R        = 6;    // circle radius
const PERF_GAP      = 14;   // center-to-center spacing
const BORDER_W      = 2;    // outer rect stroke-width
const INNER_PAD     = PERF_R; // photo inset from outer edge (circles bisect border)
const STRIP_H       = 52;   // bottom caption strip height

// ─── Types ────────────────────────────────────────────────────────
export interface StampFrameProps {
  imageUrl?:     string;
  imageAlt?:     string;
  caption?:      string;
  locationName?: string;
  date?:         string;
  size?:         StampSize;
  className?:    string;
  style?:        React.CSSProperties;
}

// ─── Perforated circle positions along all 4 edges ───────────────
function buildPerfCircles(width: number, height: number) {
  const circles: { cx: number; cy: number }[] = [];

  // Top & Bottom — distribute horizontally
  const hCount = Math.floor(width / PERF_GAP);
  const hStep  = width / hCount;
  for (let i = 0; i < hCount; i++) {
    const cx = hStep * i + hStep / 2;
    circles.push({ cx, cy: 0 });       // top
    circles.push({ cx, cy: height });  // bottom
  }

  // Left & Right — distribute vertically
  const vCount = Math.floor(height / PERF_GAP);
  const vStep  = height / vCount;
  for (let i = 0; i < vCount; i++) {
    const cy = vStep * i + vStep / 2;
    circles.push({ cx: 0,     cy }); // left
    circles.push({ cx: width, cy }); // right
  }

  return circles;
}

// ─── Component ────────────────────────────────────────────────────
export function StampFrame({
  imageUrl,
  imageAlt = '',
  caption,
  locationName,
  date,
  size = 'card',
  className,
  style,
}: StampFrameProps) {
  const outerW = SIZE_MAP[size];

  // Photo area dimensions (3:4 portrait)
  const photoX = INNER_PAD;
  const photoY = INNER_PAD;
  const photoW = outerW - INNER_PAD * 2;
  const photoH = Math.round((photoW * 4) / 3);

  // Full stamp height = photo + top/bottom pad + strip
  const outerH = photoY + photoH + INNER_PAD + STRIP_H;

  const perfCircles = buildPerfCircles(outerW, outerH);
  const clipId = `stamp-clip-${size}`;

  return (
    <div
      className={className}
      style={{
        width:    outerW,
        display:  'inline-block',
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* ── SVG: outer border + perforations + photo clip ── */}
      <svg
        width={outerW}
        height={outerH}
        viewBox={`0 0 ${outerW} ${outerH}`}
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Clip path for the photo rectangle */}
          <clipPath id={clipId}>
            <rect x={photoX} y={photoY} width={photoW} height={photoH} />
          </clipPath>
        </defs>

        {/* Outer rect — stamp paper background */}
        <rect
          x={BORDER_W / 2}
          y={BORDER_W / 2}
          width={outerW - BORDER_W}
          height={outerH - BORDER_W}
          rx={2}
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth={BORDER_W}
        />

        {/* Perforated circles — always white (Frontend-Spec: frame stays white) */}
        {perfCircles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={PERF_R}
            fill="#FFFFFF"
            stroke="var(--color-ink)"
            strokeWidth={1}
          />
        ))}

        {/* Inner white photo background */}
        <rect
          x={photoX}
          y={photoY}
          width={photoW}
          height={photoH}
          fill="#FFFFFF"
        />

        {/* Bottom strip — white background */}
        <rect
          x={photoX}
          y={photoY + photoH}
          width={photoW}
          height={STRIP_H}
          fill="#FFFFFF"
        />
      </svg>

      {/* ── Photo — absolute over SVG ── */}
      <div
        style={{
          position: 'absolute',
          top:      photoY,
          left:     photoX,
          width:    photoW,
          height:   photoH,
          overflow: 'hidden',
          background: 'var(--color-paper-dark)',
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes={`${outerW}px`}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          /* Placeholder when no image yet */
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--color-paper-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>✉</span>
          </div>
        )}
      </div>

      {/* ── Bottom strip — caption + location + date ── */}
      <div
        style={{
          position:        'absolute',
          top:             photoY + photoH,
          left:            photoX,
          width:           photoW,
          height:          STRIP_H,
          background:      '#FFFFFF',
          padding:         '6px 8px 4px',
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'center',
          gap:             2,
          overflow:        'hidden',
        }}
      >
        {caption && (
          <p style={{
            fontFamily:  'var(--font-ui)',
            fontSize:    size === 'thumb' ? 9 : 12,
            fontWeight:  400,
            color:       'var(--color-ink)',
            margin:      0,
            overflow:    'hidden',
            whiteSpace:  'nowrap',
            textOverflow:'ellipsis',
          }}>
            {caption}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {locationName && (
            <span style={{
              fontFamily:  'var(--font-ui)',
              fontSize:    size === 'thumb' ? 8 : 10,
              color:       'var(--color-muted)',
              overflow:    'hidden',
              whiteSpace:  'nowrap',
              textOverflow:'ellipsis',
              flexShrink:  1,
            }}>
              📍 {locationName}
            </span>
          )}
          {date && (
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize:   size === 'thumb' ? 8 : 10,
              color:      'var(--color-muted)',
              flexShrink: 0,
            }}>
              {date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
