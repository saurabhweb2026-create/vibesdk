export interface VideoShot {
	seconds: number;
	text: string;
}

export interface ShortVideoOptions {
	shots: VideoShot[];
	cta: string;
	brand: string;
	accent: string;
}

const WIDTH = 540;
const HEIGHT = 960;
const MIN_SECONDS = 6;
const MAX_SECONDS = 10;
const PALETTES: Array<[string, string]> = [
	['#1e1b4b', '#4f46e5'],
	['#500724', '#ec4899'],
	['#042f2e', '#14b8a6'],
	['#1c1917', '#f97316'],
	['#172554', '#3b82f6'],
];

function pickMimeType(): string {
	const options = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
	return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/** Fit the shots into 6 to 10 seconds and append the call to action as the last shot. */
export function planShots(shots: VideoShot[], cta: string): VideoShot[] {
	const all = [...shots.filter((s) => s.text.trim()), { seconds: 2, text: cta }];
	const total = all.reduce((n, s) => n + s.seconds, 0);
	const target = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, total));
	const scale = target / total;
	return all.map((s) => ({ seconds: s.seconds * scale, text: s.text }));
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/)) {
		const next = line ? `${line} ${word}` : word;
		if (ctx.measureText(next).width > maxWidth && line) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

function drawFrame(ctx: CanvasRenderingContext2D, opts: ShortVideoOptions, shots: VideoShot[], t: number, total: number): void {
	let start = 0;
	let index = 0;
	for (let i = 0; i < shots.length; i += 1) {
		if (t < start + shots[i].seconds || i === shots.length - 1) {
			index = i;
			break;
		}
		start += shots[i].seconds;
	}
	const shot = shots[index];
	const local = Math.min(1, (t - start) / Math.min(0.5, shot.seconds));
	const [from, to] = PALETTES[index % PALETTES.length];
	const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
	grad.addColorStop(0, from);
	grad.addColorStop(1, index === shots.length - 1 ? opts.accent : to);
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);

	ctx.globalAlpha = 0.18;
	ctx.fillStyle = '#ffffff';
	const drift = (t / total) * 160;
	ctx.beginPath();
	ctx.arc(WIDTH * 0.8 - drift, HEIGHT * 0.22 + drift / 2, 150, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;

	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	const size = index === 0 || index === shots.length - 1 ? 60 : 52;
	ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
	const lines = wrapLines(ctx, shot.text, WIDTH - 90);
	const lineHeight = size * 1.2;
	const top = HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2 + (1 - local) * 30;
	ctx.globalAlpha = local;
	lines.forEach((l, i) => ctx.fillText(l, WIDTH / 2, top + i * lineHeight));
	ctx.globalAlpha = 1;

	ctx.font = '500 22px Inter, system-ui, sans-serif';
	ctx.fillStyle = 'rgba(255,255,255,0.8)';
	ctx.fillText(opts.brand, WIDTH / 2, HEIGHT - 70);
	ctx.fillStyle = 'rgba(255,255,255,0.25)';
	ctx.fillRect(40, HEIGHT - 36, WIDTH - 80, 4);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(40, HEIGHT - 36, (WIDTH - 80) * (t / total), 4);
}

/** Renders a vertical 6 to 10 second video in the browser and returns it as a WebM or MP4 blob. */
export async function renderShortVideo(opts: ShortVideoOptions): Promise<{ blob: Blob; seconds: number }> {
	if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record video. Try Chrome or Safari 16 or newer.');
	const shots = planShots(opts.shots, opts.cta);
	const total = shots.reduce((n, s) => n + s.seconds, 0);

	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not start the video renderer');

	const mimeType = pickMimeType();
	const recorder = new MediaRecorder(canvas.captureStream(30), mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined);
	const chunks: Blob[] = [];
	recorder.ondataavailable = (e) => {
		if (e.data.size > 0) chunks.push(e.data);
	};
	const stopped = new Promise<void>((resolve) => {
		recorder.onstop = () => resolve();
	});

	const startedAt = performance.now();
	recorder.start();
	await new Promise<void>((resolve) => {
		const tick = () => {
			const t = (performance.now() - startedAt) / 1000;
			if (t >= total) {
				drawFrame(ctx, opts, shots, total, total);
				resolve();
				return;
			}
			drawFrame(ctx, opts, shots, t, total);
			requestAnimationFrame(tick);
		};
		tick();
	});
	recorder.stop();
	await stopped;
	return { blob: new Blob(chunks, { type: recorder.mimeType || 'video/webm' }), seconds: Math.round(total) };
}
