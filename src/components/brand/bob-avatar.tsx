/** Bob's face: a friendly head with a headset, so he reads as the voice assistant. */
export function BobAvatar({ className = 'size-full' }: { className?: string }) {
	return (
		<svg viewBox="0 0 100 100" aria-hidden className={className}>
			<defs>
				<linearGradient id="bob-bg" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#1f6f5a" />
					<stop offset="1" stopColor="#3b3fb8" />
				</linearGradient>
			</defs>
			<rect width="100" height="100" fill="url(#bob-bg)" />
			<path d="M18 100 C18 76 34 68 50 68 C66 68 82 76 82 100 Z" fill="#0f172a" />
			<rect x="44" y="60" width="12" height="12" rx="4" fill="#c68a5f" />
			<ellipse cx="50" cy="42" rx="22" ry="25" fill="#d99b6c" />
			<path d="M28 38 C28 18 40 12 52 12 C66 12 74 22 72 38 C66 30 58 26 50 26 C42 26 34 30 28 38 Z" fill="#1c1917" />
			<circle cx="41" cy="45" r="3.2" fill="#1c1917" />
			<circle cx="59" cy="45" r="3.2" fill="#1c1917" />
			<circle cx="42" cy="44" r="1" fill="#fff" />
			<circle cx="60" cy="44" r="1" fill="#fff" />
			<path d="M40 56 C45 62 55 62 60 56" fill="none" stroke="#7c3f1d" strokeWidth="2.4" strokeLinecap="round" />
			<path d="M26 44 C24 26 34 14 50 14 C66 14 76 26 74 44" fill="none" stroke="#8bf0c4" strokeWidth="4" strokeLinecap="round" />
			<rect x="21" y="40" width="9" height="15" rx="4.5" fill="#8bf0c4" />
			<rect x="70" y="40" width="9" height="15" rx="4.5" fill="#8bf0c4" />
			<path d="M75 54 C75 64 68 68 58 68" fill="none" stroke="#8bf0c4" strokeWidth="3" strokeLinecap="round" />
			<circle cx="55" cy="68" r="3.4" fill="#8bf0c4" />
		</svg>
	);
}
