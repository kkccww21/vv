import React from 'react';
import { Icons } from '@/components/ui/Icon';
import { useIsMobile } from '@/lib/hooks/mobile/useDeviceDetection';

import { DesktopMoreMenu } from './DesktopMoreMenu';
import { DesktopSpeedMenu } from './DesktopSpeedMenu';

interface BatteryState {
    supported: boolean;
    charging: boolean;
    level: number;
}

interface DesktopOverlayProps {
    isLoading: boolean;
    isTransitioningToNextEpisode?: boolean;
    isPlaying: boolean;
    showSkipForwardIndicator: boolean;
    showSkipBackwardIndicator: boolean;
    skipForwardAmount: number;
    skipBackwardAmount: number;
    isSkipForwardAnimatingOut: boolean;
    isSkipBackwardAnimatingOut: boolean;
    showToast: boolean;
    toastMessage: string | null;
    showControls: boolean;
    isFullscreen: boolean;
    fullscreenClock: string;
    battery: BatteryState;
    onTogglePlay: () => void;
    onSkipForward: () => void;
    onSkipBackward: () => void;
    showMoreMenu: boolean;
    isPremium?: boolean;
    isProxied: boolean;
    onToggleMoreMenu: () => void;
    onMoreMenuMouseEnter: () => void;
    onMoreMenuMouseLeave: () => void;
    onCopyLink: (type?: 'original' | 'proxy') => void;
    seekStepSeconds: number;
    // Speed Menu Props
    playbackRate: number;
    showSpeedMenu: boolean;
    speeds: number[];
    onToggleSpeedMenu: () => void;
    onSpeedChange: (speed: number) => void;
    onSpeedMenuMouseEnter: () => void;
    onSpeedMenuMouseLeave: () => void;
    webFullscreenSize: 'full' | 'large' | 'focused';
    onCycleWebFullscreenSize: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isRotated?: boolean;
    episodeName?: string;
    totalEpisodes?: number;
}

export function DesktopOverlay({
    isLoading,
    isTransitioningToNextEpisode = false,
    isPlaying,
    showSkipForwardIndicator,
    showSkipBackwardIndicator,
    skipForwardAmount,
    skipBackwardAmount,
    isSkipForwardAnimatingOut,
    isSkipBackwardAnimatingOut,
    showToast,
    toastMessage,
    isFullscreen,
    fullscreenClock,
    battery,
    onTogglePlay,
    onSkipForward,
    onSkipBackward,
    showControls,
    showMoreMenu,
    isPremium = false,
    isProxied,
    onToggleMoreMenu,
    onMoreMenuMouseEnter,
    onMoreMenuMouseLeave,
    onCopyLink,
    seekStepSeconds,
    playbackRate,
    showSpeedMenu,
    speeds,
    onToggleSpeedMenu,
    onSpeedChange,
    onSpeedMenuMouseEnter,
    onSpeedMenuMouseLeave,
    webFullscreenSize,
    onCycleWebFullscreenSize,
    containerRef,
    isRotated = false,
    episodeName,
    totalEpisodes = 1,
}: DesktopOverlayProps) {
    const showNavButtons = showControls || !isPlaying;
    const isMobile = useIsMobile();

    return (
        <>
            {/* More Menu + Episode Name (Top Left) */}
            <div className={`absolute top-2 left-4 z-40 flex items-center gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} style={{ pointerEvents: showControls ? 'auto' : 'none' }}>
                <DesktopMoreMenu
                    showMoreMenu={showMoreMenu}
                    isPremium={isPremium}
                    isProxied={isProxied}
                    onToggleMoreMenu={onToggleMoreMenu}
                    onMouseEnter={onMoreMenuMouseEnter}
                    onMouseLeave={onMoreMenuMouseLeave}
                    onCopyLink={onCopyLink}
                    webFullscreenSize={webFullscreenSize}
                    onCycleWebFullscreenSize={onCycleWebFullscreenSize}
                    containerRef={containerRef}
                    isRotated={isRotated}
                />
                {episodeName && totalEpisodes > 1 && (
                    <span className="text-white/70 text-xs font-medium">{episodeName}</span>
                )}
            </div>

            {/* Clock and Battery and Speed Menu (Top Right) */}
            <div className={`absolute top-2 right-4 z-40 flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} style={{ pointerEvents: showControls ? 'auto' : 'none' }}>
                {/* System Clock */}
                {isFullscreen && fullscreenClock && (
                    <div className="flex items-center gap-1 text-white/70">
                        <Icons.Clock size={14} className="opacity-80" />
                        <span className="text-sm font-semibold tracking-[0.18em] tabular-nums">
                            {fullscreenClock}
                        </span>
                    </div>
                )}
                {/* Battery Status */}
                {isFullscreen && battery.supported && (
                    <div className="flex items-center gap-1 text-white/70">
                        {battery.charging ? (
                            <Icons.BatteryCharging size={16} className="text-[#34c759]" />
                        ) : battery.level <= 20 ? (
                            <Icons.BatteryLow size={16} className="text-[#ff3b30]" />
                        ) : battery.level <= 60 ? (
                            <Icons.BatteryMedium size={16} className="opacity-80" />
                        ) : (
                            <Icons.BatteryFull size={16} className="opacity-80" />
                        )}
                        <span className="text-sm font-semibold tabular-nums">
                            {battery.level}%
                        </span>
                    </div>
                )}
                {/* Speed Menu */}
                <DesktopSpeedMenu
                    showSpeedMenu={showSpeedMenu}
                    playbackRate={playbackRate}
                    speeds={speeds}
                    onSpeedChange={onSpeedChange}
                    onToggleSpeedMenu={onToggleSpeedMenu}
                    onMouseEnter={onSpeedMenuMouseEnter}
                    onMouseLeave={onSpeedMenuMouseLeave}
                    containerRef={containerRef}
                    isRotated={isRotated}
                />
            </div>

            {/* Loading Spinner - Glass Effect */}
            {isLoading && (
                <div className="loading-overlay-glass">
                    {isTransitioningToNextEpisode ? (
                        <div className="next-episode-loading">
                            <div className="spinner-glass"></div>
                            <span className="next-episode-text">正在自动播放下一集...</span>
                        </div>
                    ) : (
                        <div className="spinner-glass"></div>
                    )}
                </div>
            )}

            {/* Skip Backward Indicator (Animation) */}
            {showSkipBackwardIndicator && (
                <div className="absolute top-1/2 left-24 -translate-y-1/2 pointer-events-none transition-all duration-300 z-20">
                    <div className={`text-white text-3xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${isSkipBackwardAnimatingOut ? 'animate-scale-out' : 'animate-scale-in'
                        }`}>
                        -{skipBackwardAmount}秒
                    </div>
                </div>
            )}

            {/* Skip Forward Indicator (Animation) */}
            {showSkipForwardIndicator && (
                <div className="absolute top-1/2 right-24 -translate-y-1/2 pointer-events-none transition-all duration-300 z-20">
                    <div className={`text-white text-3xl font-bold drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${isSkipForwardAnimatingOut ? 'animate-scale-out' : 'animate-scale-in'
                        }`}>
                        +{skipForwardAmount}秒
                    </div>
                </div>
            )}

            {/* Previous Button (Method: Skip Backward) */}
            <div
                className={`absolute left-0 top-0 bottom-0 flex items-center justify-center p-4 md:p-8 transition-opacity duration-300 z-10 ${showNavButtons ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{ 
                    pointerEvents: showNavButtons ? 'auto' : 'none',
                    justifyContent: 'center',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    paddingTop: isMobile ? '18%' : undefined
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSkipBackward();
                    }}
                    className="group flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                    aria-label={`后退 ${seekStepSeconds} 秒`}
                >
                    <Icons.SkipBack className="w-5 h-5 md:w-8 md:h-8 text-white/80 group-hover:text-white" />
                </button>
            </div>

            <div
                className={`absolute right-0 top-0 bottom-0 flex items-center justify-center p-4 md:p-8 transition-opacity duration-300 z-10 ${showNavButtons ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{ 
                    pointerEvents: showNavButtons ? 'auto' : 'none',
                    justifyContent: 'center',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    paddingTop: isMobile ? '18%' : undefined
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSkipForward();
                    }}
                    className="group flex items-center justify-center w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                    aria-label={`前进 ${seekStepSeconds} 秒`}
                >
                    <Icons.FastForward className="w-5 h-5 md:w-8 md:h-8 text-white/80 group-hover:text-white" />
                </button>
            </div>

            {/* Center Play/Pause Button */}
            {(showControls || !isPlaying) && !isLoading && (
                <div 
                    className="absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center p-4 md:p-8 pointer-events-none z-10"
                    style={{ 
                        alignItems: isMobile ? 'flex-start' : 'center',
                        paddingTop: isMobile ? '16%' : undefined
                    }}
                >
                    <button
                        onClick={onTogglePlay}
                        className="pointer-events-auto w-12 h-12 md:w-20 md:h-20 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
                        aria-label={isPlaying ? "暂停" : "播放"}
                    >
                        {isPlaying ? (
                            <Icons.Pause className="w-6 h-6 md:w-10 md:h-10 text-white" />
                        ) : (
                            <Icons.Play className="w-6 h-6 md:w-10 md:h-10 text-white ml-1" />
                        )}
                    </button>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && toastMessage && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
                    <div className="bg-[rgba(28,28,30,0.95)] backdrop-blur-[25px] rounded-[var(--radius-2xl)] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-6 py-3 flex items-center gap-3 min-w-[200px]">
                        <Icons.Check size={18} className="text-[#34c759] flex-shrink-0" />
                        <span className="text-white text-sm font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}
        </>
    );
}
