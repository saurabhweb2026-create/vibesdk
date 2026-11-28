interface NavigatorHints {
	deviceMemory?: number;
	connection?: { saveData?: boolean };
}

/** True on phones, weak devices, data-saver mode or reduced-motion: heavy animation should be trimmed there. */
export function isLightDevice(): boolean {
	if (typeof window === 'undefined') return false;
	const nav = navigator as Navigator & NavigatorHints;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const phone = window.matchMedia('(max-width: 767px)').matches;
	const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
	return reduced || phone || weak || Boolean(nav.connection?.saveData);
}
