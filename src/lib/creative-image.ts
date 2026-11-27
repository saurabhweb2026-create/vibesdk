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

/** Puts the headline and brand on a generated picture and returns a PNG data URL (1080 x 1350, the 4:5 feed size). */
export async function composeCreative(imageUrl: string, overlayText: string, brand: string, accent: string): Promise<string> {
	const img = await loadImage(imageUrl);
	const w = 1080;
	const h = 1350;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not start the picture editor');
	drawCover(ctx, img, w, h);

	const fade = ctx.createLinearGradient(0, h * 0.45, 0, h);
	fade.addColorStop(0, 'rgba(0,0,0,0)');
	fade.addColorStop(1, 'rgba(0,0,0,0.82)');
	ctx.fillStyle = fade;
	ctx.fillRect(0, h * 0.45, w, h * 0.55);

	ctx.fillStyle = '#ffffff';
	ctx.textBaseline = 'alphabetic';
	ctx.font = '700 86px Fredoka, Inter, system-ui, sans-serif';
	const lines = wrap(ctx, overlayText, w - 160);
	const lineHeight = 98;
	let y = h - 170 - (lines.length - 1) * lineHeight;
	ctx.shadowColor = 'rgba(0,0,0,0.5)';
	ctx.shadowBlur = 16;
	for (const l of lines) {
		ctx.fillText(l, 80, y);
		y += lineHeight;
	}
	ctx.shadowBlur = 0;

	ctx.fillStyle = accent;
	ctx.fillRect(80, h - 128, 96, 8);
	ctx.fillStyle = 'rgba(255,255,255,0.9)';
	ctx.font = '600 34px Inter, system-ui, sans-serif';
	ctx.fillText(brand, 80, h - 70);
	return canvas.toDataURL('image/png');
}
