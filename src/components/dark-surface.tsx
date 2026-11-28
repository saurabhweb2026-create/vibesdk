import type { ReactNode } from 'react';

/** The premium pages are designed on near-black; this keeps them readable when the app is in daylight mode. */
export function DarkSurface({ children }: { children: ReactNode }) {
	return (
		<div data-mode="dark" className="min-h-full bg-[#0b0b0d] text-white">
			{children}
		</div>
	);
}
