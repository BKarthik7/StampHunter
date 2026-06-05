import { StampFrame, type StampFrameProps } from './StampFrame';

/**
 * StampCard — thumbnail-sized StampFrame wrapper for use in grids.
 * Always renders at 'thumb' size (160px). Adds hover lift effect.
 */
export function StampCard({
  className,
  style,
  ...props
}: StampFrameProps) {
  return (
    <div
      className={className}
      style={{
        display:    'inline-block',
        cursor:     'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        borderRadius: 3,
        ...style,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform  = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow  = '0 6px 20px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform  = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow  = 'none';
      }}
    >
      <StampFrame size="thumb" {...props} />
    </div>
  );
}
