import { useEffect, useRef } from 'react';

interface Fog {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
	hue: string;
}

interface Mote {
	x: number;
	y: number;
	speed: number;
	size: number;
	phase: number;
	sway: number;
}

const FOG_COLORS = ['79,70,229', '124,58,237', '20,184,166', '236,72,153'];

/** Slow drifting fog and rising glimmers: a dim, mysterious stage for the splash question. */
export function MysteryCanvas() {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		let width = 0;
		let height = 0;
		let fog: Fog[] = [];
		let motes: Mote[] = [];
		let raf = 0;
		let last = performance.now();

		const resize = () => {
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const reach = Math.max(width, height);
			fog = Array.from({ length: 6 }, (_, i) => ({
				x: Math.random() * width,
				y: Math.random() * height,
				vx: (Math.random() - 0.5) * 26,
				vy: (Math.random() - 0.5) * 14,
				r: reach * (0.32 + Math.random() * 0.25),
				hue: FOG_COLORS[i % FOG_COLORS.length],
			}));
			motes = Array.from({ length: Math.min(90, Math.round((width * height) / 14000)) }, () => ({
				x: Math.random() * width,
				y: Math.random() * height,
				speed: 6 + Math.random() * 18,
				size: 0.6 + Math.random() * 1.8,
				phase: Math.random() * Math.PI * 2,
				sway: 8 + Math.random() * 22,
			}));
		};

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, width, height);

			for (const f of fog) {
				f.x += f.vx * dt;
				f.y += f.vy * dt;
				if (f.x < -f.r * 0.4 || f.x > width + f.r * 0.4) f.vx *= -1;
				if (f.y < -f.r * 0.4 || f.y > height + f.r * 0.4) f.vy *= -1;
				const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
				g.addColorStop(0, `rgba(${f.hue},0.2)`);
				g.addColorStop(1, `rgba(${f.hue},0)`);
				ctx.fillStyle = g;
				ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
			}

			for (const m of motes) {
				m.y -= m.speed * dt;
				m.phase += dt;
				if (m.y < -10) {
					m.y = height + 10;
					m.x = Math.random() * width;
				}
				const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(m.phase * 1.4));
				ctx.fillStyle = `rgba(199,210,254,${0.7 * twinkle})`;
				ctx.beginPath();
				ctx.arc(m.x + Math.sin(m.phase) * m.sway, m.y, m.size, 0, Math.PI * 2);
				ctx.fill();
			}

			if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
		};

		const onVisibility = () => {
			if (!document.hidden && !reduce) {
				last = performance.now();
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(frame);
			}
		};

		resize();
		raf = requestAnimationFrame(frame);
		window.addEventListener('resize', resize);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, []);

	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
			<canvas ref={ref} className="absolute inset-0" />
			<div className="mystery-beam" />
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
		</div>
	);
}
