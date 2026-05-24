import React, { useCallback, useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import { useDlnaControls } from '../hooks/desktop/useDlnaControls';
import { useIsMobile } from '@/lib/hooks/mobile/useDeviceDetection';

interface DesktopRightControlsProps {
    isNativeFullscreen: boolean;
    isWebFullscreen: boolean;
    isPiPSupported: boolean;
    isAirPlaySupported: boolean;
    isCastAvailable: boolean;
    src: string;
    onToggleNativeFullscreen: () => void;
    onToggleWebFullscreen: () => void;
    onTogglePictureInPicture: () => void;
    onShowAirPlayMenu: () => void;
    onShowCastMenu: () => void;
    hasNextEpisode?: boolean;
    onNextEpisode?: () => void;
}

export function DesktopRightControls({
    isNativeFullscreen,
    isWebFullscreen,
    isPiPSupported,
    isAirPlaySupported,
    isCastAvailable,
    src,
    onToggleNativeFullscreen,
    onToggleWebFullscreen,
    onTogglePictureInPicture,
    onShowAirPlayMenu,
    onShowCastMenu,
    hasNextEpisode = false,
    onNextEpisode,
}: DesktopRightControlsProps) {
    const {
        isExtensionAvailable
    } = useDlnaControls(src);
    const isMobile = useIsMobile();

    const [isTriggerCasting, setIsTriggerCasting] = useState(false);
    const [castStatus, setCastStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleTriggerCast = useCallback(() => {
        if (typeof window === 'undefined') return;

        setIsTriggerCasting(true);
        setCastStatus(null);

        const messageId = `trigger_cast_${Date.now()}`;

        const video = document.querySelector('video');
        const videoUrl = video?.getAttribute('data-kvideo-url') || video?.src || src;

        if (!videoUrl) {
            setCastStatus({ type: 'error', message: '未找到视频地址' });
            setIsTriggerCasting(false);
            return;
        }

        window.postMessage({
            source: 'kvideo-page',
            type: 'TRIGGER_CAST',
            messageId,
            mediaUrl: videoUrl
        }, '*');

        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data.source !== 'kvideo-dlna-extension') return;
            if (event.data.messageId !== messageId) return;

            if (event.data.type === 'TRIGGER_CAST_RESPONSE') {
                window.removeEventListener('message', handleMessage);
                setIsTriggerCasting(false);

                if (event.data.success) {
                    setCastStatus({ type: 'success', message: '投屏成功！' });
                } else {
                    setCastStatus({ type: 'error', message: '投屏失败：' + (event.data.error || '未知错误') });
                }

                setTimeout(() => setCastStatus(null), 5000);
            }
        };

        window.addEventListener('message', handleMessage);

        setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            setIsTriggerCasting(false);
            setCastStatus({ type: 'error', message: '投屏超时' });
            setTimeout(() => setCastStatus(null), 5000);
        }, 10000);
    }, [src]);

    return (
        <div className="relative z-50 flex items-center gap-3">
            {/* Next Episode */}
            {hasNextEpisode && onNextEpisode && (
                <button
                    onClick={onNextEpisode}
                    className="btn-icon"
                    aria-label="下一集"
                    title="下一集"
                >
                    <Icons.SkipForward size={20} />
                </button>
            )}

            {/* Trigger Cast (Chrome Extension) */}
            {isExtensionAvailable && (
                <div className="relative">
                    <button
                        onClick={handleTriggerCast}
                        className="btn-icon"
                        aria-label="投影"
                        title="投影到设备"
                        disabled={isTriggerCasting}
                    >
                        {isTriggerCasting ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    {/* Cast Status Toast */}
                    {castStatus && (
                        <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg ${castStatus.type === 'success'
                            ? 'bg-green-500/90 text-white'
                            : 'bg-red-500/90 text-white'
                            }`}>
                            {castStatus.message}
                        </div>
                    )}
                </div>
            )}

            {/* Picture-in-Picture */}
            {
                isPiPSupported && !isMobile && (
                    <button
                        onClick={onTogglePictureInPicture}
                        className="btn-icon"
                        aria-label="画中画"
                        title="画中画"
                    >
                        <Icons.PictureInPicture size={20} />
                    </button>
                )
            }

            {/* AirPlay */}
            {
                isAirPlaySupported && (
                    <button
                        onClick={onShowAirPlayMenu}
                        className="btn-icon"
                        aria-label="隔空播放"
                        title="隔空播放"
                    >
                        <Icons.Airplay size={20} />
                    </button>
                )
            }

            {/* Google Cast */}
            {
                false&&isCastAvailable && (
                    <button
                        onClick={onShowCastMenu}
                        className="btn-icon"
                        aria-label="投屏"
                        title="投屏"
                    >
                        <Icons.Cast size={20} />
                    </button>
                )
            }

            {/* Web Fullscreen */}
            <button
                onClick={onToggleWebFullscreen}
                className="btn-icon"
                aria-label={isWebFullscreen ? '退出网页全屏' : '网页全屏'}
                title={isWebFullscreen ? '退出网页全屏 (W)' : '网页全屏 (W)'}
            >
                <Icons.Target size={20} className={isWebFullscreen ? 'text-[var(--accent-color)]' : ''} />
            </button>

            {/* Native Fullscreen */}
            <button
                onClick={onToggleNativeFullscreen}
                className="btn-icon"
                aria-label={isNativeFullscreen ? '退出系统全屏' : '系统全屏'}
                title={isNativeFullscreen ? '退出系统全屏 (F)' : '系统全屏 (F)'}
            >
                {isNativeFullscreen ? <Icons.Minimize size={20} /> : <Icons.Maximize size={20} />}
            </button>
        </div >
    );
}
