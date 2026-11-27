import { useSyncExternalStore } from 'react';

export interface SkinLook {
	id: string;
	name: string;
	tagline: string;
	base: string;
	blobs: [string, string, string];
}

/** Palettes only; names and prices come from the server so they stay in one place. */
export const SKIN_LOOKS: SkinLook[] = [
	{ id: 'midnight', name: 'Midnight', tagline: 'Calm dark with a gentle glow', base: '#05060d', blobs: ['#4f46e5', '#ec4899', '#14b8a6'] },
	{ id: 'sunset', name: 'Sunset Chai', tagline: 'Warm, toasty and cheerful', base: '#140806', blobs: ['#f97316', '#ec4899', '#f59e0b'] },
	{ id: 'ocean', name: 'Ocean Splash', tagline: 'Cool waves, clear head', base: '#04101a', blobs: ['#0ea5e9', '#14b8a6', '#6366f1'] },
	{ id: 'bubblegum', name: 'Bubblegum', tagline: 'Pink, loud and proud', base: '#16060f', blobs: ['#ec4899', '#a855f7', '#f472b6'] },
	{ id: 'forest', name: 'Jungle Party', tagline: 'Green and gleefully wild', base: '#04110a', blobs: ['#22c55e', '#14b8a6', '#eab308'] },
	{ id: 'galaxy', name: 'Galaxy Brain', tagline: 'Big ideas, bigger sky', base: '#07041a', blobs: ['#8b5cf6', '#3b82f6', '#ec4899'] },
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
