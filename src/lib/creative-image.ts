export function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Could not open the picture'));
		img.src = src;
	});
}

/** Draws the image to fill the box, cropping the overflow from the centre. */
export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, zoom = 1, panX = 0, panY = 0): void {
	const scale = Math.max(w / img.width, h / img.height) * zoom;
	const dw = img.width * scale;
	const dh = img.height * scale;
	ctx.drawImage(img, (w - dw) / 2 + panX, (h - dh) / 2 + panY, dw, dh);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of text.split(/\s+/)) {
		const next = line ? `${line} ${word}` : word;
		if (ctx.measureText(next).width > maxWidth && line) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}

const FONT = '"DM Sans", Inter, system-ui, sans-serif';

function luminance(hex: string): number {
	const n = parseInt(hex.replace('#', ''), 16);
	return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Text colour that stays readable on the given background colour. */
export const inkOn = (hex: string): string => (luminance(hex) > 0.6 ? '#111111' : '#ffffff');

function hslToHex(h: number, s: number, l: number): string {
	const a = s * Math.min(l, 1 - l);
	const channel = (n: number) => {
		const k = (n + h / 30) % 12;
		return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
			.toString(16)
			.padStart(2, '0');
	};
	return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** The most vivid colour in the picture, lifted so it reads as an accent. Falls back to the given colour for flat or grey pictures. */
export function dominantAccent(img: HTMLImageElement, fallback: string): string {
	const size = 40;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return fallback;
	ctx.drawImage(img, 0, 0, size, size);
	const data = ctx.getImageData(0, 0, size, size).data;
	const weight = new Array<number>(12).fill(0);
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i] / 255;
		const g = data[i + 1] / 255;
		const b = data[i + 2] / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const sat = max === 0 ? 0 : (max - min) / max;
		if (sat < 0.3 || max < 0.25) continue;
		const delta = max - min;
		const hue = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
		weight[Math.floor((hue * 60) / 30) % 12] += sat * max;
	}
	const best = weight.indexOf(Math.max(...weight));
	return weight[best] < 3 ? fallback : hslToHex(best * 30 + 15, 0.85, 0.58);
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, h / 2);
}

function chip(ctx: CanvasRenderingContext2D, brand: string, accent: string, light: boolean): void {
	ctx.font = `700 32px ${FONT}`;
	const width = ctx.measureText(brand).width + 92;
	ctx.fillStyle = light ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.45)';
	pill(ctx, 64, 64, width, 68);
	ctx.fill();
	ctx.fillStyle = accent;
	ctx.beginPath();
	ctx.arc(102, 98, 13, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = light ? '#111111' : '#ffffff';
	ctx.textBaseline = 'middle';
	ctx.fillText(brand, 130, 99);
}

function ctaPill(ctx: CanvasRenderingContext2D, label: string, accent: string, x: number, y: number): number {
	ctx.font = `800 38px ${FONT}`;
	const text = `${label}  \u2192`;
	const width = ctx.measureText(text).width + 80;
	ctx.fillStyle = accent;
	pill(ctx, x, y, width, 92);
	ctx.fill();
	ctx.fillStyle = inkOn(accent);
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x + 40, y + 47);
	return width;
}

/** Shrinks the type until the headline fits in at most three lines. */
function fitHeadline(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number): { lines: string[]; size: number } {
	for (let size = start; size >= 52; size -= 6) {
		ctx.font = `900 ${size}px ${FONT}`;
		const lines = wrap(ctx, text, maxWidth);
		if (lines.length <= 3) return { lines, size };
	}
	ctx.font = `900 52px ${FONT}`;
	return { lines: wrap(ctx, text, maxWidth).slice(0, 3), size: 52 };
}

export interface CreativeOptions {
	/** Short action such as "Order now", shown as a button. */
	cta?: string;
	/** Picks one of three layouts: 0 bold, 1 card, 2 poster. Pictures in a month rotate through them. */
	variant?: number;
	/** Brand colour from the website; when empty the strongest colour in the picture is used. */
	brandColor?: string;
}

/** Turns a generated picture into a finished 1080 x 1350 feed post: lifted colour, a layout with headline, brand chip and button. Returns a PNG data URL. */
export async function composeCreative(imageUrl: string, overlayText: string, brand: string, accent: string, opts: CreativeOptions = {}): Promise<string> {
	const img = await loadImage(imageUrl);
	await document.fonts?.ready;
	const color = opts.brandColor || dominantAccent(img, accent);
	const w = 1080;
	const h = 1350;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not start the picture editor');
	ctx.filter = 'saturate(1.18) contrast(1.06)';
	drawCover(ctx, img, w, h, 1.04);
	ctx.filter = 'none';

	const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
	vignette.addColorStop(0, 'rgba(0,0,0,0)');
	vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, w, h);

	const headline = overlayText.trim().toUpperCase();
	const variant = (opts.variant ?? 0) % 3;
	ctx.textAlign = 'left';

	if (variant === 1) {
		chip(ctx, brand, color, true);
		const { lines, size } = fitHeadline(ctx, headline, w - 200, 96);
		const lineHeight = size * 1.06;
		const cardH = lines.length * lineHeight + 150 + (opts.cta ? 130 : 0);
		const top = h - cardH - 64;
		ctx.shadowColor = 'rgba(0,0,0,0.35)';
		ctx.shadowBlur = 40;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.roundRect(48, top, w - 96, cardH, 44);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = color;
		ctx.fillRect(100, top + 48, 110, 12);
		ctx.fillStyle = '#111111';
		ctx.font = `900 ${size}px ${FONT}`;
		ctx.textBaseline = 'alphabetic';
		lines.forEach((l, i) => ctx.fillText(l, 100, top + 96 + size + i * lineHeight));
		if (opts.cta) ctaPill(ctx, opts.cta, color, 100, top + cardH - 128);
	} else if (variant === 2) {
		const fade = ctx.createLinearGradient(0, 0, 0, h * 0.55);
		fade.addColorStop(0, 'rgba(0,0,0,0.72)');
		fade.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = fade;
		ctx.fillRect(0, 0, w, h * 0.55);
		chip(ctx, brand, color, false);
		const { lines, size } = fitHeadline(ctx, headline, w - 140, 120);
		const lineHeight = size * 1.04;
		ctx.textBaseline = 'alphabetic';
		ctx.font = `900 ${size}px ${FONT}`;
		ctx.lineJoin = 'round';
		lines.forEach((l, i) => {
			const y = 230 + size + i * lineHeight;
			ctx.lineWidth = 14;
			ctx.strokeStyle = 'rgba(0,0,0,0.55)';
			ctx.strokeText(l, 70, y);
			ctx.fillStyle = i === lines.length - 1 ? color : '#ffffff';
			ctx.fillText(l, 70, y);
		});
		if (opts.cta) ctaPill(ctx, opts.cta, color, 70, h - 170);
	} else {
		const fade = ctx.createLinearGradient(0, h * 0.4, 0, h);
		fade.addColorStop(0, 'rgba(0,0,0,0)');
		fade.addColorStop(1, 'rgba(0,0,0,0.88)');
		ctx.fillStyle = fade;
		ctx.fillRect(0, h * 0.4, w, h * 0.6);
		chip(ctx, brand, color, false);
		const { lines, size } = fitHeadline(ctx, headline, w - 160, 110);
		const lineHeight = size * 1.05;
		const baseline = h - (opts.cta ? 280 : 150);
		ctx.textBaseline = 'alphabetic';
		ctx.font = `900 ${size}px ${FONT}`;
		const first = baseline - (lines.length - 1) * lineHeight;
		lines.forEach((l, i) => {
			const y = first + i * lineHeight;
			if (i === lines.length - 1) {
				const tw = ctx.measureText(l).width;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.roundRect(64, y - size * 0.86, tw + 32, size * 1.08, 16);
				ctx.fill();
				ctx.fillStyle = inkOn(color);
				ctx.fillText(l, 80, y);
			} else {
				ctx.fillStyle = '#ffffff';
				ctx.shadowColor = 'rgba(0,0,0,0.5)';
				ctx.shadowBlur = 18;
				ctx.fillText(l, 80, y);
				ctx.shadowBlur = 0;
			}
		});
		if (opts.cta) ctaPill(ctx, opts.cta, color, 80, h - 200);
	}
	return canvas.toDataURL('image/png');
}
