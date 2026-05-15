import { useRef, useCallback, useState } from 'react';

const SWIPE_THRESHOLD = 5;

interface TouchState {
    startX: number;
    startY: number;
    startVolume: number;
    isVolumeGesture: boolean | null;
    lastVolume: number;
}

export function useVolumeGesture(
    isFullscreen: boolean,
    volume: number,
    setVolume: (v: number) => void,
    setIsMuted: (m: boolean) => void,
    videoRef: React.RefObject<HTMLVideoElement | null>,
) {
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
    const touchStateRef = useRef<TouchState | null>(null);
    const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const hideIndicatorDelayed = useCallback(() => {
        if (indicatorTimeoutRef.current) {
            clearTimeout(indicatorTimeoutRef.current);
        }
        indicatorTimeoutRef.current = setTimeout(() => {
            setShowVolumeIndicator(false);
        }, 1500);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent, containerWidth: number) => {
        if (!isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const x = touch.clientX;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relativeX = x - rect.left;

        if (relativeX < containerWidth * 0.5) return;

        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startVolume: volume,
            isVolumeGesture: null,
            lastVolume: volume,
        };
    }, [isFullscreen, volume]);

    const handleTouchMove = useCallback((e: React.TouchEvent, containerHeight: number) => {
        const state = touchStateRef.current;
        if (!state || !isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const deltaY = touch.clientY - state.startY;
        const deltaX = Math.abs(touch.clientX - state.startX);

        if (state.isVolumeGesture === null) {
            if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > deltaX) {
                state.isVolumeGesture = true;
                setShowVolumeIndicator(true);
                if (indicatorTimeoutRef.current) {
                    clearTimeout(indicatorTimeoutRef.current);
                }
            } else if (deltaX > SWIPE_THRESHOLD) {
                state.isVolumeGesture = false;
                return;
            }
            return;
        }

        if (!state.isVolumeGesture) return;

        e.preventDefault();

        const sensitivity = containerHeight * 0.35;
        const deltaRatio = -deltaY / sensitivity;
        const newVolume = Math.max(0, Math.min(1, state.startVolume + deltaRatio));

        state.lastVolume = newVolume;
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = newVolume === 0;
        }
        setIsMuted(newVolume === 0);
    }, [isFullscreen, setVolume, setIsMuted, videoRef]);

    const handleTouchEnd = useCallback(() => {
        if (touchStateRef.current?.isVolumeGesture) {
            const v = touchStateRef.current.lastVolume;
            localStorage.setItem('kvideo-volume', String(v));
            localStorage.setItem('kvideo-muted', String(v === 0));
            hideIndicatorDelayed();
        }
        touchStateRef.current = null;
    }, [hideIndicatorDelayed]);

    const isVolumeGestureActive = useCallback(() => {
        return touchStateRef.current?.isVolumeGesture === true;
    }, []);

    return {
        showVolumeIndicator,
        handleVolumeTouchStart: handleTouchStart,
        handleVolumeTouchMove: handleTouchMove,
        handleVolumeTouchEnd: handleTouchEnd,
        isVolumeGestureActive,
    };
}
