import { useEffect, useRef } from 'react';
import { isLightDevice } from '@/lib/motion';

interface Particle {
	x: number;
	y: number;
	life: number;
	tint: number;
}

const TINTS = ['139,240,196', '139,240,196', '165,180,255', '255,255,255'];
const FADE = 'rgba(11,11,13,0.07)';

/** Slow streams of light that drift along an invisible current, leaving soft trails. */
export function FlowField({ className = '' }: { className?: string }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const light = isLightDevice();
		const dpr = light ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
		let width = 0;
		let height = 0;
		let particles: Particle[] = [];
		let raf = 0;
		let t = 0;

		const spawn = (): Particle => ({
			x: Math.random() * width,
			y: Math.random() * height,
			life: 120 + Math.random() * 220,
			tint: Math.floor(Math.random() * TINTS.length),
		});

		const resize = () => {
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.fillStyle = '#0b0b0d';
			ctx.fillRect(0, 0, width, height);
			particles = Array.from({ length: Math.min(light ? 260 : 700, Math.floor((width * height) / 2200)) }, spawn);
		};

		const step = () => {
			t += 0.0035;
			ctx.fillStyle = FADE;
			ctx.fillRect(0, 0, width, height);
			ctx.lineWidth = 1;
			for (const p of particles) {
				const angle = Math.sin(p.x * 0.0021 + t) * 2.4 + Math.cos(p.y * 0.0027 - t * 1.3) * 2.4;
				const nx = p.x + Math.cos(angle) * 1.6;
				const ny = p.y + Math.sin(angle) * 1.6;
				ctx.strokeStyle = `rgba(${TINTS[p.tint]},0.34)`;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(nx, ny);
				ctx.stroke();
				p.x = nx;
				p.y = ny;
				p.life -= 1;
				if (p.life <= 0 || nx < 0 || nx > width || ny < 0 || ny > height) Object.assign(p, spawn());
			}
			raf = requestAnimationFrame(step);
		};

		resize();
		window.addEventListener('resize', resize);
		if (reduce) {
			for (let i = 0; i < 240; i += 1) step();
			cancelAnimationFrame(raf);
		} else {
			raf = requestAnimationFrame(step);
		}
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	}, []);

	return <canvas ref={ref} aria-hidden className={`absolute inset-0 size-full ${className}`} />;
}
