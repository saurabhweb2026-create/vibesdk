// Human-sounding Indian voices from Sarvam AI Bulbul. Without a key the browser falls back to the device voice.
import type { Speaker, VoiceLang } from './voice';

const ENDPOINT = 'https://api.sarvam.ai/text-to-speech';
const MODEL = 'bulbul:v3';

/** One distinct Bulbul speaker per teammate; Maria gets a female voice. */
const SPEAKER_VOICE: Record<Speaker, string> = { bob: 'shubh', jack: 'aditya', john: 'rohan', maria: 'priya' };
const PACE: Record<Speaker, number> = { bob: 1, jack: 1.05, john: 0.95, maria: 1 };

interface SarvamSecret {
	SARVAM_API_KEY?: string;
}

export const ttsConfigured = (env: Env): boolean => Boolean((env as unknown as SarvamSecret).SARVAM_API_KEY);

function fromBase64(text: string): Uint8Array {
	const binary = atob(text);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function request(key: string, body: Record<string, unknown>): Promise<Response> {
	return fetch(ENDPOINT, {
		method: 'POST',
		headers: { 'api-subscription-key': key, 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
}

/** Returns WAV audio for the sentence in the teammate's voice. */
export async function speakAs(env: Env, text: string, lang: VoiceLang, who: Speaker): Promise<Uint8Array> {
	const key = (env as unknown as SarvamSecret).SARVAM_API_KEY;
	if (!key) throw new Error('Voice is not configured');
	const base = { text: text.slice(0, 600), target_language_code: lang, model: MODEL, pace: PACE[who] };
	let res = await request(key, { ...base, speaker: SPEAKER_VOICE[who] });
	// An unknown speaker name should not silence the call: retry with the default voice.
	if (res.status === 400) res = await request(key, base);
	if (!res.ok) throw new Error(`Voice service answered ${res.status}`);
	const data = (await res.json()) as { audios?: string[] };
	const audio = data.audios?.[0];
	if (!audio) throw new Error('Voice service sent no audio');
	return fromBase64(audio);
}
