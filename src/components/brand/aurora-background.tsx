import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { FutureBackdrop } from './future-backdrop';
import { setActiveSkin, useActiveSkin } from '@/lib/skins';
import { useTheme } from '@/contexts/theme-context';

/** Slow, drifting colour blobs behind the whole app. The palette follows the chosen look. */
export function AuroraBackground() {
	const skin = useActiveSkin();
	const { user } = useAuth();
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		const root = document.documentElement;
		root.dataset.skin = skin.id;
		root.dataset.motion = skin.motion;
		root.style.setProperty('--skin-base', skin.base);
		root.style.setProperty('--skin-a', skin.blobs[0]);
		root.style.setProperty('--skin-b', skin.blobs[1]);
		root.style.setProperty('--skin-c', skin.blobs[2]);
	}, [skin]);

	useEffect(() => {
		if (!user) return;
		let cancelled = false;
		apiClient
			.getSkins()
			.then((res) => {
				if (!cancelled && res.data) setActiveSkin(res.data.active);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [user]);

	return (
		<div aria-hidden className="aurora">
			<span className="aurora__blob aurora__blob--a" />
			<span className="aurora__blob aurora__blob--b" />
			<span className="aurora__blob aurora__blob--c" />
			<span className="aurora__grid" />
			{resolvedTheme === 'dark' && <FutureBackdrop intensity={0.8} yieldToCover />}
		</div>
	);
}
