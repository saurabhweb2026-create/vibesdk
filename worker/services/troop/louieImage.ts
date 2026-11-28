// John's picture maker. Runs an image model on Workers AI and returns a data URL; text is added later in the browser so it is always spelled right.

const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

interface ImageRunner {
	run(model: string, input: { prompt: string; steps: number }): Promise<{ image?: string } | ReadableStream | Uint8Array>;
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	return btoa(binary);
}

/** Wraps the idea in photography direction so results look like real campaign pictures, not clip art. */
export function buildImagePrompt(idea: string, business: string, style: string): string {
	const direction: Record<string, string> = {
		photo: 'award-winning commercial advertising photograph, one clear hero subject, dramatic soft studio or golden light, rich saturated colour, shallow depth of field, crisp detail, premium magazine campaign quality, shot on 50mm lens',
		bold: 'bold modern advertising poster artwork, strong colour blocking, clean composition, high contrast, studio quality',
		cozy: 'warm lifestyle photograph, golden hour light, candid, inviting, soft film grain',
	};
	return `${idea.slice(0, 380)}. Business context: ${business.slice(0, 80)}. ${direction[style] ?? direction.photo}. Vertical social media composition with clear empty space near the top and bottom for captions. No text, no letters, no logos, no watermarks, no distorted hands or faces.`;
}

export async function generateCreativeImage(env: Env, prompt: string): Promise<string> {
	const runner = env.AI as unknown as ImageRunner;
	const out = await runner.run(IMAGE_MODEL, { prompt, steps: 8 });
	if (out && typeof out === 'object' && 'image' in out && typeof out.image === 'string' && out.image) {
		return `data:image/jpeg;base64,${out.image}`;
	}
	if (out instanceof Uint8Array) return `data:image/png;base64,${toBase64(out)}`;
	if (out instanceof ReadableStream) {
		const bytes = new Uint8Array(await new Response(out).arrayBuffer());
		return `data:image/png;base64,${toBase64(bytes)}`;
	}
	throw new Error('John could not draw that picture');
}
