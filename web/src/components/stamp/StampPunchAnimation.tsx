'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion, AnimatePresence } from 'framer-motion';
import { StampFrame, type StampFrameProps } from './StampFrame';

// ─── Animation timings (Frontend-Spec §5) ────────────────────────
const T = {
  armDescend:   0.3,   // 0–300ms   arm enters from top
  impact:       0.08,  // 300–380ms shake
  perfDraw:     0.22,  // 380–600ms perf border draws in
  postmarkFade: 0.3,   // 380–680ms red overlay fades
  armRetract:   0.3,   // 600–900ms arm goes back up
  settle:       0.3,   // 900–1200ms scale 1.05 → 1.0
  total:        1.2,   // total sequence length
};

// ─── Stamp arm SVG (drawn inline — no PNG asset needed) ──────────
function StampArm({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width={80}
      height={120}
      viewBox="0 0 80 120"
      aria-hidden="true"
      style={style}
    >
      {/* Handle */}
      <rect x={28} y={0}  width={24} height={70} rx={4} fill="var(--color-ink)" />
      {/* Head */}
      <rect x={8}  y={70} width={64} height={50} rx={3} fill="var(--color-stamp-red)" />
      {/* Ink pad texture lines */}
      <line x1={18} y1={82} x2={62} y2={82} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <line x1={18} y1={92} x2={62} y2={92} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
      <line x1={18} y1={102} x2={62} y2={102} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
    </svg>
  );
}

// ─── Perforated border path for draw-in animation ─────────────────
function PerfBorderOverlay({
  width,
  height,
  progress,
}: {
  width:    number;
  height:   number;
  progress: number; // 0 → 1
}) {
  const perimeter = 2 * (width + height);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        rx={2}
        fill="none"
        stroke="var(--color-stamp-red)"
        strokeWidth={3}
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter * (1 - progress)}
        style={{ transition: 'none' }}
      />
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────
function StampedToast({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{    opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          style={{
            position:     'fixed',
            bottom:       32,
            left:         '50%',
            transform:    'translateX(-50%)',
            background:   'var(--color-success)',
            color:        '#fff',
            fontFamily:   'var(--font-display)',
            fontSize:      18,
            fontWeight:    700,
            padding:       '12px 28px',
            borderRadius:  8,
            boxShadow:     '0 4px 16px rgba(0,0,0,0.18)',
            zIndex:        9999,
            pointerEvents: 'none',
            letterSpacing: '0.5px',
          }}
        >
          Stamped! ✉
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Props ────────────────────────────────────────────────────────
interface StampPunchAnimationProps extends StampFrameProps {
  isAnimating: boolean;
  onComplete?: () => void;
  frameWidth?: number;
}

// ─── Main Component ───────────────────────────────────────────────
export function StampPunchAnimation({
  isAnimating,
  onComplete,
  frameWidth = 340,
  size = 'card',
  ...frameProps
}: StampPunchAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  const armControls          = useAnimation();
  const containerControls    = useAnimation();

  const [perfProgress,   setPerfProgress]   = useState(0);
  const [postmarkAlpha,  setPostmarkAlpha]  = useState(0);
  const [showToast,      setShowToast]      = useState(false);
  const [hasAnimated,    setHasAnimated]    = useState(false);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAnimating || hasAnimated) return;

    // ── prefers-reduced-motion: jump to final state ───────────────
    if (prefersReducedMotion) {
      setPerfProgress(1);
      setShowToast(true);
      setHasAnimated(true);
      onComplete?.();
      return;
    }

    setHasAnimated(true);

    async function runSequence() {
      // 1. Arm descend (0–300ms)
      await armControls.start({
        y:          20,
        transition: { duration: T.armDescend, ease: 'easeIn' },
      });

      // 2. Impact shake (300–380ms)
      await containerControls.start({
        x:          [0, -4, 4, -2, 2, 0],
        transition: { duration: T.impact, ease: 'linear' },
      });

      // 3. Perf draw-in + postmark flash (380–600ms)
      const drawStart = performance.now();
      const drawDuration = T.perfDraw * 1000;

      function animateDraw(now: number) {
        const elapsed = now - drawStart;
        const t       = Math.min(elapsed / drawDuration, 1);
        setPerfProgress(t);
        setPostmarkAlpha(0.6 * (1 - t)); // fade out simultaneously
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animateDraw);
        }
      }
      rafRef.current = requestAnimationFrame(animateDraw);

      // Wait for draw to finish
      await new Promise(r => setTimeout(r, T.perfDraw * 1000));
      setPostmarkAlpha(0);

      // 4. Arm retract (600–900ms)
      await armControls.start({
        y:          -200,
        transition: { duration: T.armRetract, ease: 'easeOut' },
      });

      // 5. Settle (900–1200ms)
      await containerControls.start({
        scale:      [1.05, 1.0],
        transition: { duration: T.settle, ease: 'easeOut' },
      });

      // 6. Toast at 1200ms
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onComplete?.();
      }, 2000);
    }

    armControls.set({ y: -200 });
    runSequence();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rough stamp height for perf overlay
  const PERF_R    = 6;
  const INNER_PAD = PERF_R;
  const STRIP_H   = 52;
  const photoW    = frameWidth - INNER_PAD * 2;
  const photoH    = Math.round((photoW * 4) / 3);
  const frameH    = INNER_PAD + photoH + INNER_PAD + STRIP_H;

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Arm — positioned above the stamp */}
        {isAnimating && !prefersReducedMotion && (
          <motion.div
            animate={armControls}
            style={{
              position:       'absolute',
              top:            -120,
              left:           '50%',
              transform:      'translateX(-50%)',
              zIndex:         10,
              pointerEvents:  'none',
            }}
          >
            <StampArm />
          </motion.div>
        )}

        {/* Stamp container — shake + settle */}
        <motion.div animate={containerControls}>
          <StampFrame size={size} {...frameProps} />

          {/* Perf draw-in overlay */}
          {perfProgress > 0 && (
            <PerfBorderOverlay
              width={frameWidth}
              height={frameH}
              progress={perfProgress}
            />
          )}

          {/* Postmark red flash */}
          {postmarkAlpha > 0 && (
            <div
              style={{
                position:      'absolute',
                inset:         0,
                background:    'var(--color-stamp-red)',
                opacity:       postmarkAlpha,
                borderRadius:  2,
                pointerEvents: 'none',
                mixBlendMode:  'multiply',
              }}
            />
          )}
        </motion.div>
      </div>

      <StampedToast visible={showToast} />
    </>
  );
}
