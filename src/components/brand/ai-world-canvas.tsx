import { useEffect, useRef } from 'react';

interface Node {
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
}

interface Shape {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	sides: number;
	angle: number;
	spin: number;
	colorIndex: number;
}

interface Pulse {
	a: number;
	b: number;
	t: number;
	speed: number;
}

const LINK_DISTANCE = 200;
const MAX_NODES = 70;

function cssColor(name: string, fallback: string): string {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function withAlpha(hex: string, alpha: number): string {
	const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
	if (!m) return `rgba(255,255,255,${alpha})`;
	return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

/**
 * A drifting network of nodes whose links grow and fade as nodes meet, with data pulses
 * travelling along the links and slow wireframe shapes floating through. Colours follow the active look.
 */
export function AiWorldCanvas() {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
		let width = 0;
		let height = 0;
		let nodes: Node[] = [];
		let shapes: Shape[] = [];
		const pulses: Pulse[] = [];
		const links = new Map<number, number>();
		let raf = 0;
		let last = performance.now();
		let palette = ['#4f46e5', '#ec4899', '#14b8a6'];

		const seed = () => {
			const count = Math.min(MAX_NODES, Math.round((width * height) / 14000));
			nodes = Array.from({ length: count }, () => ({
				x: Math.random() * width,
				y: Math.random() * height,
				vx: (Math.random() - 0.5) * 22,
				vy: (Math.random() - 0.5) * 22,
				r: 1.8 + Math.random() * 2.2,
			}));
			shapes = Array.from({ length: 7 }, (_, i) => ({
				x: Math.random() * width,
				y: Math.random() * height,
				vx: (Math.random() - 0.5) * 10,
				vy: (Math.random() - 0.5) * 10,
				size: 40 + Math.random() * 70,
				sides: [3, 4, 6][i % 3],
				angle: Math.random() * Math.PI,
				spin: (Math.random() - 0.5) * 0.25,
				colorIndex: i % 3,
			}));
			links.clear();
		};

		const resize = () => {
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			seed();
		};

		const readPalette = () => {
			palette = [cssColor('--skin-a', '#4f46e5'), cssColor('--skin-b', '#ec4899'), cssColor('--skin-c', '#14b8a6')];
		};

		const polygon = (s: Shape) => {
			ctx.beginPath();
			for (let i = 0; i < s.sides; i += 1) {
				const a = s.angle + (i / s.sides) * Math.PI * 2;
				const px = s.x + Math.cos(a) * s.size;
				const py = s.y + Math.sin(a) * s.size;
				if (i === 0) ctx.moveTo(px, py);
				else ctx.lineTo(px, py);
			}
			ctx.closePath();
		};

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, width, height);

			for (const s of shapes) {
				s.x += s.vx * dt;
				s.y += s.vy * dt;
				s.angle += s.spin * dt;
				if (s.x < -120) s.x = width + 120;
				if (s.x > width + 120) s.x = -120;
				if (s.y < -120) s.y = height + 120;
				if (s.y > height + 120) s.y = -120;
				ctx.strokeStyle = withAlpha(palette[s.colorIndex], 0.4);
				ctx.lineWidth = 1.2;
				polygon(s);
				ctx.stroke();
				ctx.strokeStyle = withAlpha(palette[s.colorIndex], 0.2);
				const inner = { ...s, size: s.size * 0.6, angle: -s.angle };
				polygon(inner);
				ctx.stroke();
			}

			for (const n of nodes) {
				n.x += n.vx * dt;
				n.y += n.vy * dt;
				if (n.x < 0 || n.x > width) n.vx *= -1;
				if (n.y < 0 || n.y > height) n.vy *= -1;
			}

			for (let i = 0; i < nodes.length; i += 1) {
				for (let j = i + 1; j < nodes.length; j += 1) {
					const a = nodes[i];
					const b = nodes[j];
					const dist = Math.hypot(a.x - b.x, a.y - b.y);
					const key = i * 1000 + j;
					const grown = links.get(key) ?? 0;
					if (dist < LINK_DISTANCE) {
						const next = Math.min(1, grown + dt * 1.6);
						links.set(key, next);
						if (next < 0.05 && Math.random() < 0.006 && pulses.length < 14) pulses.push({ a: i, b: j, t: 0, speed: 0.5 + Math.random() * 0.6 });
						const fade = 1 - dist / LINK_DISTANCE;
						ctx.strokeStyle = withAlpha(palette[(i + j) % 3], 0.6 * fade * next + 0.08);
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(a.x + (b.x - a.x) * next, a.y + (b.y - a.y) * next);
						ctx.stroke();
					} else if (grown > 0) {
						links.set(key, Math.max(0, grown - dt * 2));
					}
				}
			}

			for (let p = pulses.length - 1; p >= 0; p -= 1) {
				const pulse = pulses[p];
				pulse.t += dt * pulse.speed;
				const a = nodes[pulse.a];
				const b = nodes[pulse.b];
				if (pulse.t >= 1 || !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > LINK_DISTANCE) {
					pulses.splice(p, 1);
					continue;
				}
				const x = a.x + (b.x - a.x) * pulse.t;
				const y = a.y + (b.y - a.y) * pulse.t;
				const glow = ctx.createRadialGradient(x, y, 0, x, y, 9);
				glow.addColorStop(0, withAlpha(palette[(pulse.a + pulse.b) % 3], 0.95));
				glow.addColorStop(1, withAlpha(palette[(pulse.a + pulse.b) % 3], 0));
				ctx.fillStyle = glow;
				ctx.beginPath();
				ctx.arc(x, y, 9, 0, Math.PI * 2);
				ctx.fill();
			}

			for (let i = 0; i < nodes.length; i += 1) {
				const n = nodes[i];
				ctx.fillStyle = withAlpha(palette[i % 3], 0.85);
				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
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
		readPalette();
		raf = requestAnimationFrame(frame);
		const observer = new MutationObserver(readPalette);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-skin'] });
		window.addEventListener('resize', resize);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, []);

	return <canvas ref={ref} className="absolute inset-0" />;
}
