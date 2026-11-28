import { useEffect, useRef } from 'react';

interface Node {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

interface Pulse {
	a: number;
	b: number;
	t: number;
}

const MINT = '139,240,196';
const BLUE = '125,150,255';
const LINK = 150;

/**
 * A 2050 control room behind the page: a neon floor receding to the horizon, a drifting
 * neural network with data pulses, a radar ring and a slow scan beam.
 */
export function FutureBackdrop({ intensity = 1 }: { intensity?: number }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		let w = 0;
		let h = 0;
		let nodes: Node[] = [];
		const pulses: Pulse[] = [];
		let raf = 0;
		let t = 0;

		const resize = () => {
			w = canvas.clientWidth;
			h = canvas.clientHeight;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const count = Math.min(70, Math.floor((w * h) / 16000));
			nodes = Array.from({ length: count }, () => ({
				x: Math.random() * w,
				y: Math.random() * h * 0.7,
				vx: (Math.random() - 0.5) * 0.25,
				vy: (Math.random() - 0.5) * 0.25,
			}));
		};

		const floor = () => {
			const horizon = h * 0.62;
			const cx = w / 2;
			const gap = Math.max(60, w / 12);
			ctx.lineWidth = 1;
			for (let i = -14; i <= 14; i += 1) {
				const g = ctx.createLinearGradient(0, horizon, 0, h);
				g.addColorStop(0, `rgba(${MINT},0)`);
				g.addColorStop(1, `rgba(${MINT},${0.2 * intensity})`);
				ctx.strokeStyle = g;
				ctx.beginPath();
				ctx.moveTo(cx + i * gap * 0.12, horizon);
				ctx.lineTo(cx + i * gap * 1.6, h);
				ctx.stroke();
			}
			const rows = 12;
			for (let k = 0; k < rows; k += 1) {
				const p = ((k + t * 0.9) % rows) / rows;
				const y = horizon + (h - horizon) * p ** 2.2;
				ctx.strokeStyle = `rgba(${MINT},${p * 0.22 * intensity})`;
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}
		};

		const network = () => {
			for (const n of nodes) {
				n.x += n.vx;
				n.y += n.vy;
				if (n.x < 0 || n.x > w) n.vx *= -1;
				if (n.y < 0 || n.y > h * 0.72) n.vy *= -1;
			}
			ctx.lineWidth = 1;
			for (let i = 0; i < nodes.length; i += 1) {
				for (let j = i + 1; j < nodes.length; j += 1) {
					const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
					if (d > LINK) continue;
					ctx.strokeStyle = `rgba(${BLUE},${(1 - d / LINK) * 0.28 * intensity})`;
					ctx.beginPath();
					ctx.moveTo(nodes[i].x, nodes[i].y);
					ctx.lineTo(nodes[j].x, nodes[j].y);
					ctx.stroke();
					if (pulses.length < 14 && Math.random() < 0.0008) pulses.push({ a: i, b: j, t: 0 });
				}
			}
			for (const n of nodes) {
				ctx.fillStyle = `rgba(${MINT},${0.55 * intensity})`;
				ctx.beginPath();
				ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
				ctx.fill();
			}
			for (let i = pulses.length - 1; i >= 0; i -= 1) {
				const p = pulses[i];
				p.t += 0.018;
				if (p.t >= 1) {
					pulses.splice(i, 1);
					continue;
				}
				const a = nodes[p.a];
				const b = nodes[p.b];
				ctx.fillStyle = `rgba(${MINT},${0.95 * intensity})`;
				ctx.shadowColor = `rgb(${MINT})`;
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.arc(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, 2.4, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		};

		const radar = () => {
			const r = Math.min(w, h) * 0.2;
			const x = w * 0.84;
			const y = h * 0.2;
			ctx.save();
			ctx.translate(x, y);
			ctx.strokeStyle = `rgba(${MINT},${0.2 * intensity})`;
			ctx.setLineDash([3, 9]);
			ctx.rotate(t * 0.15);
			for (const k of [1, 0.66, 0.36]) {
				ctx.beginPath();
				ctx.arc(0, 0, r * k, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.setLineDash([]);
			const sweep = ctx.createLinearGradient(0, 0, r, 0);
			sweep.addColorStop(0, `rgba(${MINT},${0.28 * intensity})`);
			sweep.addColorStop(1, `rgba(${MINT},0)`);
			ctx.rotate(t * 0.9);
			ctx.fillStyle = sweep;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.arc(0, 0, r, -0.35, 0);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
		};

		const beam = () => {
			const y = ((t * 28) % (h + 160)) - 80;
			const g = ctx.createLinearGradient(0, y - 60, 0, y + 60);
			g.addColorStop(0, `rgba(${MINT},0)`);
			g.addColorStop(0.5, `rgba(${MINT},${0.06 * intensity})`);
			g.addColorStop(1, `rgba(${MINT},0)`);
			ctx.fillStyle = g;
			ctx.fillRect(0, y - 60, w, 120);
		};

		const frame = () => {
			t += 0.016;
			ctx.clearRect(0, 0, w, h);
			floor();
			network();
			radar();
			beam();
			if (!reduce) raf = requestAnimationFrame(frame);
		};

		const onVisibility = () => {
			cancelAnimationFrame(raf);
			if (!document.hidden && !reduce) raf = requestAnimationFrame(frame);
		};

		resize();
		window.addEventListener('resize', resize);
		document.addEventListener('visibilitychange', onVisibility);
		frame();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [intensity]);

	return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
