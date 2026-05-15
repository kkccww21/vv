import { useRef } from 'react';

interface DoubleTapHandler {
    onDoubleTapLeft: () => void;
    onDoubleTapRight: () => void;
    onDoubleTapCenter: () => void;
    onSingleTap: () => void;
    onSkipContinueLeft: () => void;
    onSkipContinueRight: () => void;
    isSkipModeActive: boolean;
    isFullscreen: boolean;
}

type TapZone = 'left' | 'right' | 'center';

export function useDoubleTap({
    onDoubleTapLeft,
    onDoubleTapRight,
    onDoubleTapCenter,
    onSingleTap,
    onSkipContinueLeft,
    onSkipContinueRight,
    isSkipModeActive,
    isFullscreen,
}: DoubleTapHandler) {
    const lastTapRef = useRef<{ time: number; zone: TapZone | null }>({
        time: 0,
        zone: null,
    });
    const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const getTapZone = (x: number, y: number, width: number, height: number): TapZone => {
        if (isFullscreen) {
            const verticalCenter = y > height * 0.25 && y < height * 0.75;
            const horizontalSide = x < width * 0.25 || x > width * 0.75;
            if (verticalCenter && horizontalSide) {
                return x < width / 2 ? 'left' : 'right';
            }
            return 'center';
        }
        return x < width / 2 ? 'left' : 'right';
    };

    const handleTap = (e: React.TouchEvent<HTMLVideoElement>) => {
        e.preventDefault();

        const currentTime = Date.now();
        const videoElement = e.currentTarget;
        const touch = e.touches[0] || e.changedTouches[0];

        if (!touch || !videoElement) return;

        const rect = videoElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;
        const zone = getTapZone(x, y, width, height);

        const timeDiff = currentTime - lastTapRef.current.time;
        const sameZone = lastTapRef.current.zone === zone;

        if (singleTapTimeoutRef.current) {
            clearTimeout(singleTapTimeoutRef.current);
            singleTapTimeoutRef.current = null;
        }

        if (isSkipModeActive && zone !== 'center') {
            if (zone === 'left') {
                onSkipContinueLeft();
            } else {
                onSkipContinueRight();
            }
            lastTapRef.current = { time: currentTime, zone };
            return;
        }

        if (timeDiff < 300 && sameZone) {
            if (zone === 'left') {
                onDoubleTapLeft();
            } else if (zone === 'right') {
                onDoubleTapRight();
            } else {
                onDoubleTapCenter();
            }
            lastTapRef.current = { time: 0, zone: null };
        } else {
            lastTapRef.current = { time: currentTime, zone };

            singleTapTimeoutRef.current = setTimeout(() => {
                onSingleTap();
                singleTapTimeoutRef.current = null;
            }, 300);
        }
    };

    return { handleTap };
}
