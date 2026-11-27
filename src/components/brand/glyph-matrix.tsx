import { useEffect, useRef } from 'react';

const GLYPHS = '+*@#&0123456789ZATOLQRXUWNMDFBGHKPVY.-_/=<>';
const CELL = 44;

/** Faint grid of slowly changing characters, drawn behind the landing hero. */
export function GlyphMatrix({ className = '' }: { className?: string }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let cols = 0;
		let rows = 0;
		let cells: string[] = [];
		let timer = 0;

		const pick = () => (Math.random() < 0.55 ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);

		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.font = '15px "Departure Mono", monospace';
			ctx.textBaseline = 'middle';
			ctx.textAlign = 'center';
			for (let r = 0; r < rows; r += 1) {
				for (let c = 0; c < cols; c += 1) {
					const g = cells[r * cols + c];
					if (g === ' ') continue;
					const x = c * CELL + CELL / 2;
					const fade = Math.min(1, Math.abs(x - canvas.width / 2) / (canvas.width * 0.5) + 0.15);
					ctx.fillStyle = `rgba(255,255,255,${0.05 + fade * 0.16})`;
					ctx.fillText(g, x, r * CELL + CELL / 2);
				}
			}
		};

		const resize = () => {
			const box = canvas.getBoundingClientRect();
			canvas.width = Math.max(1, Math.floor(box.width));
			canvas.height = Math.max(1, Math.floor(box.height));
			cols = Math.ceil(canvas.width / CELL);
			rows = Math.ceil(canvas.height / CELL);
			cells = Array.from({ length: cols * rows }, pick);
			draw();
		};

		resize();
		window.addEventListener('resize', resize);
		if (!reduce) {
			timer = window.setInterval(() => {
				for (let i = 0; i < 6; i += 1) cells[Math.floor(Math.random() * cells.length)] = pick();
				draw();
			}, 260);
		}
		return () => {
			window.removeEventListener('resize', resize);
			window.clearInterval(timer);
		};
	}, []);

	return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
