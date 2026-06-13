import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(date: Date | string | null): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length <= len ? str : str.substring(0, len) + '…';
}

export const DISCOVERY_TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  NEW_PRODUCT: { label: 'New Product', color: 'blue', emoji: '🆕' },
  NEW_COLLECTION: { label: 'New Collection', color: 'purple', emoji: '👗' },
  LIMITED_DROP: { label: 'Limited Drop', color: 'red', emoji: '🔥' },
  RESTOCK: { label: 'Restock', color: 'green', emoji: '🔄' },
  PROMOTION: { label: 'Promotion', color: 'yellow', emoji: '🏷️' },
  ADVERTISEMENT: { label: 'Advertisement', color: 'gray', emoji: '📢' },
  NEWS: { label: 'News', color: 'gray', emoji: '📰' },
  OTHER: { label: 'Other', color: 'gray', emoji: '📌' },
};

export const SOURCE_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  WEBSITE: { label: 'Website', icon: '🌐' },
  NEW_ARRIVALS: { label: 'New Arrivals', icon: '✨' },
  COLLECTIONS: { label: 'Collections', icon: '📦' },
  LAUNCHES: { label: 'Launches', icon: '🚀' },
  INSTAGRAM: { label: 'Instagram', icon: '📸' },
  WEB_SEARCH: { label: 'Web Search', icon: '🔍' },
  RSS: { label: 'RSS', icon: '📡' },
};
