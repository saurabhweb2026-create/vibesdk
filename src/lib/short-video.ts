import { drawCover, inkOn } from './creative-image';

export interface VideoShot {
	seconds: number;
	text: string;
	image?: HTMLImageElement | null;
}

export interface ShortVideoOptions {
	shots: VideoShot[];
	/** Adds a soft synthesised beat under the video. */
	music?: boolean;
	cta: string;
	brand: string;
	accent: string;
	/** Records MP4 when the browser can, which Instagram and Facebook accept; WebM otherwise. */
	preferMp4?: boolean;
}

const WIDTH = 720;
const HEIGHT = 1280;
const MIN_SECONDS = 8;
const MAX_SECONDS = 15;
const FADE_SECONDS = 0.4;
const FONT = '"DM Sans", Inter, system-ui, sans-serif';
const PALETTES: Array<[string, string]> = [
	['#1e1b4b', '#4f46e5'],
	['#500724', '#ec4899'],
	['#042f2e', '#14b8a6'],
	['#1c1917', '#f97316'],
	['#172554', '#3b82f6'],
];

function pickMimeType(preferMp4: boolean): string {
	const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'];
	const webm = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
	const options = preferMp4 ? [...mp4, ...webm] : [...webm, ...mp4];
	return options.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/** Fit the shots into 8 to 15 seconds and append the call to action as the last shot. */
export function planShots(shots: VideoShot[], cta: string): VideoShot[] {
	const all = [...shots.filter((s) => s.text.trim()), { seconds: 2, text: cta }];
	const total = all.reduce((n, s) => n + s.seconds, 0);
	const target = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, total));
	const scale = target / total;
	return all.map((s) => ({ seconds: s.seconds * scale, text: s.text, image: s.image }));
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

const ease = (x: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Background of one shot: its picture with a slow push-in, or a colour wash when there is none. */
function drawBackground(ctx: CanvasRenderingContext2D, opts: ShortVideoOptions, shot: VideoShot, index: number, progress: number, last: boolean): void {
	const [from, to] = PALETTES[index % PALETTES.length];
	const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
	grad.addColorStop(0, from);
	grad.addColorStop(1, last ? opts.accent : to);
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, WIDTH, HEIGHT);
	if (shot.image) {
		const direction = index % 2 === 0 ? 1 : -1;
		ctx.filter = 'saturate(1.15) contrast(1.05)';
		drawCover(ctx, shot.image, WIDTH, HEIGHT, 1.06 + progress * 0.16, direction * (progress - 0.5) * 60, 0);
		ctx.filter = 'none';
		const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
		shade.addColorStop(0, 'rgba(0,0,0,0.45)');
		shade.addColorStop(0.45, 'rgba(0,0,0,0.05)');
		shade.addColorStop(1, last ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.8)');
		ctx.fillStyle = shade;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
	} else {
		ctx.globalAlpha = 0.16;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(WIDTH * (0.85 - progress * 0.3), HEIGHT * (0.2 + progress * 0.1), 260, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
}

/** The shot's line, one word at a time; the last line sits on an accent bar. */
function drawCaption(ctx: CanvasRenderingContext2D, opts: ShortVideoOptions, text: string, local: number, centreY: number, size: number): void {
	ctx.font = `900 ${size}px ${FONT}`;
	ctx.textBaseline = 'middle';
	const lines = wrapLines(ctx, text.toUpperCase(), WIDTH - 130);
	const lineHeight = size * 1.18;
	const top = centreY - ((lines.length - 1) * lineHeight) / 2;
	let wordIndex = 0;
	lines.forEach((line, li) => {
		const words = line.split(' ');
		const space = ctx.measureText(' ').width;
		const widths = words.map((w) => ctx.measureText(w).width);
		const total = widths.reduce((n, x) => n + x, 0) + space * (words.length - 1);
		const y = top + li * lineHeight;
		const lastLine = li === lines.length - 1 && lines.length > 1;
		if (lastLine) {
			ctx.fillStyle = opts.accent;
			ctx.globalAlpha = ease((local - 0.15) / 0.3);
			ctx.beginPath();
			ctx.roundRect(WIDTH / 2 - total / 2 - 20, y - size * 0.62, total + 40, size * 1.24, 18);
			ctx.fill();
		}
		let x = WIDTH / 2 - total / 2;
		words.forEach((word, wi) => {
			const t = ease((local - wordIndex * 0.1) / 0.28);
			wordIndex += 1;
			ctx.globalAlpha = t;
			ctx.save();
			ctx.translate(x + widths[wi] / 2, y + (1 - t) * 26);
			ctx.scale(0.85 + 0.15 * t, 0.85 + 0.15 * t);
			ctx.shadowColor = 'rgba(0,0,0,0.6)';
			ctx.shadowBlur = lastLine ? 0 : 18;
			ctx.fillStyle = lastLine ? inkOn(opts.accent) : '#ffffff';
			ctx.textAlign = 'center';
			ctx.fillText(word, 0, 0);
			ctx.restore();
			x += widths[wi] + space;
		});
	});
	ctx.globalAlpha = 1;
	ctx.shadowBlur = 0;
}

function drawFrame(ctx: CanvasRenderingContext2D, opts: ShortVideoOptions, shots: VideoShot[], t: number): void {
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
	const sinceStart = t - start;
	const last = index === shots.length - 1;
	const progress = Math.min(1, sinceStart / shot.seconds);

	if (index > 0 && sinceStart < FADE_SECONDS) {
		drawBackground(ctx, opts, shots[index - 1], index - 1, 1, false);
		ctx.globalAlpha = sinceStart / FADE_SECONDS;
	}
	drawBackground(ctx, opts, shot, index, progress, last);
	ctx.globalAlpha = 1;
	ctx.textAlign = 'center';

	if (last) {
		ctx.font = `900 ${opts.brand.length > 16 ? 56 : 72}px ${FONT}`;
		ctx.fillStyle = '#ffffff';
		ctx.textBaseline = 'middle';
		ctx.globalAlpha = ease(sinceStart / 0.4);
		ctx.fillText(opts.brand.toUpperCase(), WIDTH / 2, HEIGHT * 0.38);
		ctx.globalAlpha = 1;
		const pulse = 1 + Math.sin(sinceStart * 6) * 0.025;
		ctx.save();
		ctx.translate(WIDTH / 2, HEIGHT * 0.52);
		ctx.scale(pulse, pulse);
		ctx.font = `800 40px ${FONT}`;
		const label = `${shot.text}  \u2192`;
		const bw = ctx.measureText(label).width + 90;
		ctx.fillStyle = opts.accent;
		ctx.beginPath();
		ctx.roundRect(-bw / 2, -48, bw, 96, 48);
		ctx.fill();
		ctx.fillStyle = inkOn(opts.accent);
		ctx.fillText(label, 0, 2);
		ctx.restore();
	} else {
		drawCaption(ctx, opts, shot.text, sinceStart, shot.image ? HEIGHT * 0.72 : HEIGHT / 2, index === 0 ? 74 : 64);
	}

	// Story-style bars and the brand chip.
	const gap = 8;
	const barW = (WIDTH - 80 - gap * (shots.length - 1)) / shots.length;
	let at = 0;
	shots.forEach((sh, i) => {
		ctx.fillStyle = 'rgba(255,255,255,0.3)';
		ctx.beginPath();
		ctx.roundRect(40 + i * (barW + gap), 44, barW, 6, 3);
		ctx.fill();
		const fill = Math.max(0, Math.min(1, (t - at) / sh.seconds));
		if (fill > 0) {
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.roundRect(40 + i * (barW + gap), 44, barW * fill, 6, 3);
			ctx.fill();
		}
		at += sh.seconds;
	});
	if (!last) {
		ctx.font = `700 26px ${FONT}`;
		const cw = ctx.measureText(opts.brand).width + 70;
		ctx.fillStyle = 'rgba(0,0,0,0.45)';
		ctx.beginPath();
		ctx.roundRect(40, 74, cw, 52, 26);
		ctx.fill();
		ctx.fillStyle = opts.accent;
		ctx.beginPath();
		ctx.arc(66, 100, 9, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.fillText(opts.brand, 86, 101);
		ctx.textAlign = 'center';
	}
}

/** A short upbeat loop (kick, bass and a light arpeggio) made with the Web Audio API, so no audio files are needed. */
function startMusic(seconds: number): { stream: MediaStream; stop: () => void } | null {
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	const audio = new Ctor();
	const dest = audio.createMediaStreamDestination();
	const master = audio.createGain();
	master.gain.value = 0.22;
	master.connect(dest);
	const beat = 60 / 108;
	const notes = [220, 261.63, 329.63, 392, 329.63, 261.63];
	const now = audio.currentTime + 0.05;
	for (let t = 0, i = 0; t < seconds; t += beat / 2, i += 1) {
		if (i % 2 === 0) {
			const kick = audio.createOscillator();
			const kg = audio.createGain();
			kick.frequency.setValueAtTime(140, now + t);
			kick.frequency.exponentialRampToValueAtTime(45, now + t + 0.15);
			kg.gain.setValueAtTime(0.9, now + t);
			kg.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
			kick.connect(kg).connect(master);
			kick.start(now + t);
			kick.stop(now + t + 0.22);
		}
		const note = audio.createOscillator();
		const ng = audio.createGain();
		note.type = 'triangle';
		note.frequency.value = notes[i % notes.length] * (i % 8 < 4 ? 1 : 1.5);
		ng.gain.setValueAtTime(0.0001, now + t);
		ng.gain.linearRampToValueAtTime(0.35, now + t + 0.02);
		ng.gain.exponentialRampToValueAtTime(0.001, now + t + beat / 2);
		note.connect(ng).connect(master);
		note.start(now + t);
		note.stop(now + t + beat / 2);
	}
	master.gain.setValueAtTime(0.22, now + seconds - 0.6);
	master.gain.linearRampToValueAtTime(0, now + seconds);
	return { stream: dest.stream, stop: () => void audio.close() };
}

/** Renders a vertical 8 to 15 second video in the browser and returns it as a WebM or MP4 blob. */
export async function renderShortVideo(opts: ShortVideoOptions): Promise<{ blob: Blob; seconds: number }> {
	if (typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record video. Try Chrome or Safari 16 or newer.');
	const shots = planShots(opts.shots, opts.cta);
	const total = shots.reduce((n, s) => n + s.seconds, 0);

	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not start the video renderer');

	const stream = canvas.captureStream(30);
	const music = opts.music ? startMusic(total) : null;
	if (music) music.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

	const mimeType = pickMimeType(Boolean(opts.preferMp4));
	const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined);
	const chunks: Blob[] = [];
	recorder.ondataavailable = (e) => {
		if (e.data.size > 0) chunks.push(e.data);
	};
	const stopped = new Promise<void>((resolve) => {
		recorder.onstop = () => resolve();
	});

	const startedAt = performance.now();
	recorder.start();
	await new Promise<void>((resolve, reject) => {
		let finished = false;
		const tick = () => {
			if (finished) return;
			const t = (performance.now() - startedAt) / 1000;
			try {
				drawFrame(ctx, opts, shots, Math.min(t, total));
			} catch (error) {
				finished = true;
				reject(error instanceof Error ? error : new Error('Could not draw the video'));
				return;
			}
			if (t >= total) {
				finished = true;
				resolve();
				return;
			}
			requestAnimationFrame(tick);
		};
		// A hidden tab pauses animation frames; the timer keeps the recording moving to its end.
		const timer = window.setInterval(() => {
			if (finished) window.clearInterval(timer);
			else tick();
		}, 100);
		tick();
	});
	recorder.stop();
	music?.stop();
	await stopped;
	return { blob: new Blob(chunks, { type: recorder.mimeType || 'video/webm' }), seconds: Math.round(total) };
}
