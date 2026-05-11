import { useEffect, useRef, useState, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
}

/**
 * Pull-to-refresh wrapper for touch devices (iOS/Android home-screen apps).
 * Activates only when the user is at scrollTop=0 and pulls down.
 */
const PullToRefresh = ({ onRefresh, children, threshold = 70 }: Props) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        // Resist after threshold
        const eased = dy < threshold ? dy : threshold + (dy - threshold) * 0.3;
        setPull(eased);
        if (dy > 5) e.preventDefault();
      }
    };
    const onTouchEnd = async () => {
      if (!active.current) return;
      active.current = false;
      const shouldRefresh = pull >= threshold && !refreshing;
      if (shouldRefresh) {
        setRefreshing(true);
        setPull(threshold);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, threshold, refreshing, onRefresh]);

  const showIndicator = pull > 0 || refreshing;
  const triggered = pull >= threshold || refreshing;

  return (
    <>
      {showIndicator && (
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-[100]"
          style={{ height: pull, transition: refreshing ? "height 0.2s" : undefined }}
        >
          <div className="bg-surface border border-border-subtle/60 shadow-card rounded-full p-2">
            <RefreshCw
              className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={{
                transform: refreshing ? undefined : `rotate(${Math.min(pull * 4, 360)}deg)`,
                opacity: triggered ? 1 : 0.5,
              }}
            />
          </div>
        </div>
      )}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: refreshing || pull === 0 ? "transform 0.2s" : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
};

export default PullToRefresh;
