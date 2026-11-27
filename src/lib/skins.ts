import { useSyncExternalStore } from 'react';

export interface SkinLook {
	id: string;
	name: string;
	tagline: string;
	base: string;
	blobs: [string, string, string];
	kind: 'look' | 'mood';
	/** off: still, calm: slow and sparse, full: standard, hyper: fast and bright. */
	motion: 'off' | 'calm' | 'full' | 'hyper';
}

/** Palettes only; names and prices come from the server so they stay in one place. */
export const SKIN_LOOKS: SkinLook[] = [
	{ id: 'midnight', name: 'Midnight', tagline: 'Calm dark with a gentle glow', base: '#05060d', blobs: ['#4f46e5', '#ec4899', '#14b8a6'], kind: 'look', motion: 'full' },
	{ id: 'sunset', name: 'Sunset Chai', tagline: 'Warm, toasty and cheerful', base: '#140806', blobs: ['#f97316', '#ec4899', '#f59e0b'], kind: 'look', motion: 'full' },
	{ id: 'ocean', name: 'Ocean Splash', tagline: 'Cool waves, clear head', base: '#04101a', blobs: ['#0ea5e9', '#14b8a6', '#6366f1'], kind: 'look', motion: 'full' },
	{ id: 'bubblegum', name: 'Bubblegum', tagline: 'Pink, loud and proud', base: '#16060f', blobs: ['#ec4899', '#a855f7', '#f472b6'], kind: 'look', motion: 'full' },
	{ id: 'forest', name: 'Jungle Party', tagline: 'Green and gleefully wild', base: '#04110a', blobs: ['#22c55e', '#14b8a6', '#eab308'], kind: 'look', motion: 'full' },
	{ id: 'galaxy', name: 'Galaxy Brain', tagline: 'Big ideas, bigger sky', base: '#07041a', blobs: ['#8b5cf6', '#3b82f6', '#ec4899'], kind: 'look', motion: 'full' },
	{ id: 'focus', name: 'Concentrate', tagline: 'Quiet, still and distraction-free', base: '#0a0c0f', blobs: ['#334155', '#1e293b', '#0f172a'], kind: 'mood', motion: 'off' },
	{ id: 'lofi', name: 'Lo-fi Study', tagline: 'Slow, cosy, headphones on', base: '#100b18', blobs: ['#7c3aed', '#f59e0b', '#6366f1'], kind: 'mood', motion: 'calm' },
	{ id: 'zen', name: 'Zen Garden', tagline: 'Soft greens, deep breaths', base: '#08100d', blobs: ['#34d399', '#2dd4bf', '#a3e635'], kind: 'mood', motion: 'calm' },
	{ id: 'vibecheck', name: 'Vibe Check', tagline: 'Fast, loud, main-character energy', base: '#0d0414', blobs: ['#f43f5e', '#a855f7', '#22d3ee'], kind: 'mood', motion: 'hyper' },
	{ id: 'neon', name: 'Neon Night', tagline: 'Cyber city after midnight', base: '#02060f', blobs: ['#06b6d4', '#d946ef', '#3b82f6'], kind: 'mood', motion: 'hyper' },
];

const STORAGE_KEY = 'alwaysbro-skin';
const listeners = new Set<() => void>();

function read(): string {
	try {
		const id = localStorage.getItem(STORAGE_KEY);
		return SKIN_LOOKS.some((s) => s.id === id) ? (id as string) : 'midnight';
	} catch {
		return 'midnight';
	}
}

export function setActiveSkin(id: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, id);
	} catch {
		/* storage unavailable: the look still applies for this visit */
	}
	listeners.forEach((l) => l());
}

export function useActiveSkin(): SkinLook {
	const id = useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		read,
		() => 'midnight',
	);
	return SKIN_LOOKS.find((s) => s.id === id) ?? SKIN_LOOKS[0];
}
