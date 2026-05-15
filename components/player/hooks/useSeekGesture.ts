import { useRef, useCallback, useState } from 'react';

const SWIPE_THRESHOLD = 5;
const SEEK_SECONDS_PER_PIXEL = 0.15;
const MAX_SEEK_SECONDS = 180;

interface TouchState {
    startX: number;
    startY: number;
    startTime: number;
    isSeekGesture: boolean | null;
    lastSeekDelta: number;
}

export function useSeekGesture(
    isFullscreen: boolean,
    videoRef: React.RefObject<HTMLVideoElement | null>,
) {
    const [showSeekIndicator, setShowSeekIndicator] = useState(false);
    const [seekDelta, setSeekDelta] = useState(0);
    const touchStateRef = useRef<TouchState | null>(null);
    const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const hideIndicatorDelayed = useCallback(() => {
        if (indicatorTimeoutRef.current) {
            clearTimeout(indicatorTimeoutRef.current);
        }
        indicatorTimeoutRef.current = setTimeout(() => {
            setShowSeekIndicator(false);
        }, 1000);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const video = videoRef.current;
        if (!video) return;

        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: video.currentTime,
            isSeekGesture: null,
            lastSeekDelta: 0,
        };
    }, [isFullscreen, videoRef]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const state = touchStateRef.current;
        if (!state || !isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const deltaX = touch.clientX - state.startX;
        const deltaY = touch.clientY - state.startY;

        if (state.isSeekGesture === null) {
            if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
                state.isSeekGesture = true;
                setShowSeekIndicator(true);
                if (indicatorTimeoutRef.current) {
                    clearTimeout(indicatorTimeoutRef.current);
                }
            } else if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
                state.isSeekGesture = false;
                return;
            }
            return;
        }

        if (!state.isSeekGesture) return;

        e.preventDefault();

        const delta = Math.max(-MAX_SEEK_SECONDS, Math.min(MAX_SEEK_SECONDS, deltaX * SEEK_SECONDS_PER_PIXEL));
        state.lastSeekDelta = delta;
        setSeekDelta(delta);
    }, [isFullscreen]);

    const handleTouchEnd = useCallback(() => {
        if (touchStateRef.current?.isSeekGesture) {
            const delta = touchStateRef.current.lastSeekDelta;
            const video = videoRef.current;
            if (video && delta !== 0) {
                const newTime = Math.max(0, Math.min(video.duration || 0, touchStateRef.current.startTime + delta));
                video.currentTime = newTime;
            }
            hideIndicatorDelayed();
        }
        touchStateRef.current = null;
    }, [videoRef, hideIndicatorDelayed]);

    const isSeekGestureActive = useCallback(() => {
        return touchStateRef.current?.isSeekGesture === true;
    }, []);

    return {
        showSeekIndicator,
        seekDelta,
        handleSeekTouchStart: handleTouchStart,
        handleSeekTouchMove: handleTouchMove,
        handleSeekTouchEnd: handleTouchEnd,
        isSeekGestureActive,
    };
}
