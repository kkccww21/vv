/**
 * Favorites Button - Simple favorites button that opens sidebar
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useFavorites } from '@/lib/store/favorites-store';
import { Icons } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FavoritesHeader } from './FavoritesHeader';
import { FavoritesList } from './FavoritesList';
import { FavoritesFooter } from './FavoritesFooter';
import { trapFocus } from '@/lib/accessibility/focus-management';

interface FavoritesButtonProps {
  isPremium?: boolean;
  size?: number;
  className?: string;
}

export function FavoritesButton({ isPremium = false, size = 20, className = '' }: FavoritesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    videoId?: string;
    source?: string;
    isClearAll?: boolean;
  }>({ isOpen: false });
  const { favorites, removeFavorite, clearFavorites } = useFavorites(isPremium);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const cleanupFocusTrapRef = useRef<(() => void) | null>(null);

  // Setup focus trap when sidebar opens
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      cleanupFocusTrapRef.current = trapFocus(sidebarRef.current);
    }

    return () => {
      if (cleanupFocusTrapRef.current) {
        cleanupFocusTrapRef.current();
        cleanupFocusTrapRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleDeleteItem = (videoId: string | number, source: string) => {
    setDeleteConfirm({ isOpen: true, videoId: String(videoId), source });
  };

  const handleClearAll = () => {
    setDeleteConfirm({ isOpen: true, isClearAll: true });
  };

  const confirmDelete = () => {
    if (deleteConfirm.isClearAll) {
      clearFavorites();
    } else if (deleteConfirm.videoId && deleteConfirm.source) {
      removeFavorite(deleteConfirm.videoId, deleteConfirm.source);
    }
    setDeleteConfirm({ isOpen: false });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false });
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center justify-center p-2 rounded-full bg-[var(--glass-bg)] backdrop-blur-[8px] border border-[var(--glass-border)] hover:scale-110 active:scale-95 transition-all duration-200 ease-out cursor-pointer ${className}`}
        aria-label="打开收藏夹"
        title="收藏夹"
      >
        <Icons.Heart size={size} className="text-[var(--text-color-secondary)] hover:text-[var(--accent-color)] transition-colors" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1999] bg-black/40 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      {isOpen && (
        <aside
          ref={sidebarRef}
          role="complementary"
          aria-labelledby="favorites-sidebar-title"
          aria-hidden={!isOpen}
          className="fixed top-0 left-0 bottom-0 w-[85%] sm:w-[90%] max-w-[420px] z-[2000] bg-[var(--glass-bg)] backdrop-blur-[8px] saturate-[120%] border-r border-[var(--glass-border)] rounded-tr-[var(--radius-2xl)] rounded-br-[var(--radius-2xl)] p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
          style={{
            animation: 'slideInLeft 0.25s ease-out'
          }}
        >
          <style>{`
            @keyframes slideInLeft {
              from {
                transform: translateX(-100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}</style>
          <FavoritesHeader onClose={() => setIsOpen(false)} />

          <FavoritesList
            favorites={favorites}
            onRemove={handleDeleteItem}
            isPremium={isPremium}
          />

          <FavoritesFooter
            hasFavorites={favorites.length > 0}
            onClearAll={handleClearAll}
          />
        </aside>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.isClearAll ? '清空收藏夹' : '取消收藏'}
        message={
          deleteConfirm.isClearAll
            ? '确定要清空所有收藏吗？此操作无法撤销。'
            : '确定要取消收藏这个视频吗？'
        }
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        confirmText="确定"
        cancelText="取消"
        variant="danger"
      />
    </>
  );
}
