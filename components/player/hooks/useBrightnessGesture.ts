import { useState, useRef, useCallback } from 'react';

const BRIGHTNESS_STORAGE_KEY = 'kvideo-brightness';
const BRIGHTNESS_MIN = 0;
const BRIGHTNESS_MAX = 1.5;
const BRIGHTNESS_DEFAULT = 1.0;
const SWIPE_THRESHOLD = 5;

function loadBrightness(): number {
    if (typeof window === 'undefined') return BRIGHTNESS_DEFAULT;
    const saved = localStorage.getItem(BRIGHTNESS_STORAGE_KEY);
    if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= BRIGHTNESS_MIN && parsed <= BRIGHTNESS_MAX) {
            return parsed;
        }
    }
    return BRIGHTNESS_DEFAULT;
}

interface TouchState {
    startX: number;
    startY: number;
    startBrightness: number;
    isBrightnessGesture: boolean | null;
    lastBrightness: number;
}

export function useBrightnessGesture(isFullscreen: boolean) {
    const [brightness, setBrightness] = useState(loadBrightness);
    const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
    const touchStateRef = useRef<TouchState | null>(null);
    const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const hideIndicatorDelayed = useCallback(() => {
        if (indicatorTimeoutRef.current) {
            clearTimeout(indicatorTimeoutRef.current);
        }
        indicatorTimeoutRef.current = setTimeout(() => {
            setShowBrightnessIndicator(false);
        }, 1500);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent, containerWidth: number) => {
        if (!isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const x = touch.clientX;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relativeX = x - rect.left;

        if (relativeX > containerWidth * 0.5) return;

        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startBrightness: brightness,
            isBrightnessGesture: null,
            lastBrightness: brightness,
        };
    }, [isFullscreen, brightness]);

    const handleTouchMove = useCallback((e: React.TouchEvent, containerHeight: number) => {
        const state = touchStateRef.current;
        if (!state || !isFullscreen) return;

        const touch = e.touches[0];
        if (!touch) return;

        const deltaY = touch.clientY - state.startY;
        const deltaX = Math.abs(touch.clientX - state.startX);

        if (state.isBrightnessGesture === null) {
            if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > deltaX) {
                state.isBrightnessGesture = true;
                setShowBrightnessIndicator(true);
                if (indicatorTimeoutRef.current) {
                    clearTimeout(indicatorTimeoutRef.current);
                }
            } else if (deltaX > SWIPE_THRESHOLD) {
                state.isBrightnessGesture = false;
                return;
            }
            return;
        }

        if (!state.isBrightnessGesture) return;

        e.preventDefault();

        const sensitivity = containerHeight * 0.35;
        const deltaRatio = -deltaY / sensitivity;
        const newBrightness = Math.max(
            BRIGHTNESS_MIN,
            Math.min(BRIGHTNESS_MAX, state.startBrightness + deltaRatio * (BRIGHTNESS_MAX - BRIGHTNESS_MIN))
        );

        state.lastBrightness = newBrightness;
        setBrightness(newBrightness);
    }, [isFullscreen]);

    const handleTouchEnd = useCallback(() => {
        if (touchStateRef.current?.isBrightnessGesture) {
            localStorage.setItem(BRIGHTNESS_STORAGE_KEY, String(touchStateRef.current.lastBrightness));
            hideIndicatorDelayed();
        }
        touchStateRef.current = null;
    }, [hideIndicatorDelayed]);

    const isBrightnessGestureActive = useCallback(() => {
        return touchStateRef.current?.isBrightnessGesture === true;
    }, []);

    return {
        brightness,
        showBrightnessIndicator,
        handleBrightnessTouchStart: handleTouchStart,
        handleBrightnessTouchMove: handleTouchMove,
        handleBrightnessTouchEnd: handleTouchEnd,
        isBrightnessGestureActive,
    };
}
