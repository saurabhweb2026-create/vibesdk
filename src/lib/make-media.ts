import { apiClient } from '@/lib/api-client';
import { composeCreative, loadImage } from '@/lib/creative-image';
import { renderShortVideo, type VideoShot } from '@/lib/short-video';

const SCENE_PICTURES = 3;

export const blobToDataUrl = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error('Could not read the video'));
		reader.readAsDataURL(blob);
	});

/** Draws a picture for the brief and puts the headline and brand on it. Returns a PNG data URL. */
export async function drawPicture(appId: string, prompt: string, overlay: string, brand: string, accent: string): Promise<string> {
	const drawn = await apiClient.generateLouieImage({ appId, prompt });
	if (!drawn.data?.image) throw new Error('John could not draw the picture');
	return composeCreative(drawn.data.image, overlay, brand, accent);
}

export interface ReelShot {
	seconds: number;
	text: string;
	imagePrompt?: string;
}

/** Draws a few scene pictures and cuts them into a short video with music. */
export async function cutReel(appId: string, reelShots: ReelShot[], cta: string, brand: string, accent: string): Promise<{ blob: Blob; isMp4: boolean }> {
	const shots: VideoShot[] = reelShots.map((sh) => ({ seconds: sh.seconds, text: sh.text }));
	const wanted = reelShots.map((sh, i) => ({ i, prompt: sh.imagePrompt ?? '' })).filter((x) => x.prompt.length > 4).slice(0, SCENE_PICTURES);
	const scenes = await Promise.all(
		wanted.map(async (w) => {
			const out = await apiClient.generateLouieImage({ appId, prompt: w.prompt });
			return out.data?.image ? { i: w.i, image: await loadImage(out.data.image) } : null;
		}),
	);
	for (const s of scenes) if (s) shots[s.i].image = s.image;
	shots.forEach((sh, i) => {
		if (!sh.image) sh.image = shots.slice(0, i).reverse().find((x) => x.image)?.image ?? shots.find((x) => x.image)?.image ?? null;
	});
	const { blob } = await renderShortVideo({ shots, cta, brand, accent, music: true, preferMp4: true });
	return { blob, isMp4: blob.type.includes('mp4') };
}
