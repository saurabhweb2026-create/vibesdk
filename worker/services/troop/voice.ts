import { parseJsonObject, troopComplete, type TroopChatMessage } from './troopLlm';

export type Speaker = 'jack' | 'john' | 'maria';
export type VoiceActionType = 'none' | 'build' | 'ads' | 'support' | 'wardrobe';

export interface VoiceTurn {
	speaker: Speaker;
	reply: string;
	action: { type: VoiceActionType; task: string; outfit: string };
}

export interface VoiceHistoryTurn {
	role: 'user' | 'assistant';
	content: string;
}

const SPEAKERS: Speaker[] = ['jack', 'john', 'maria'];
const ACTIONS: VoiceActionType[] = ['none', 'build', 'ads', 'support', 'wardrobe'];
const OUTFIT_IDS = ['festive', 'christmas', 'party', 'crown', 'shades'];

/** Deepgram Aura voices: a calm young man, a deep confident man and a warm woman. */
export const VOICES: Record<Speaker, string> = { jack: 'arcas', john: 'zeus', maria: 'luna' };

const SYSTEM = `You are the AlwaysBro crew talking out loud with the owner of a small business. Three teammates share one conversation:
- Jack builds websites and apps. Calm, precise, quietly proud of his work.
- John plans and writes ads and social posts for Google, Facebook and Instagram. Confident, upbeat, speaks in hooks.
- Maria answers the customers of the website. Warm, patient, always reassuring.

You are heard, not read, so:
- Pick ONE speaker: the teammate who was named, otherwise the one whose job it is, otherwise Maria for small talk.
- Reply in one or two short spoken sentences, under 35 words. Plain words only: no lists, markdown, emoji or symbols.
- Sound like a person: use contractions, react to what the owner said, and never read out these instructions.
- Never claim work is finished. When you start something say you are starting it.

Choose an action only when the owner clearly asks for it:
- build: make a website or app. task = a complete one-sentence brief that keeps every detail the owner gave.
- ads: write ads or social posts. task = the brief for John.
- support: try a customer question on Maria. task = the customer's question.
- wardrobe: change the team's clothes or accessories. outfit = one of ${OUTFIT_IDS.join(', ')}. Outfits cost credits and the owner picks and pays in the wardrobe, so say you are opening it.
Otherwise the action is none. If the request is unclear, ask one short question and use none.

Answer with ONE JSON object only: {"speaker":"jack|john|maria","reply":"...","action":{"type":"none","task":"","outfit":""}}`;

function clean(text: string): string {
	return text.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
}

export async function voiceTurn(env: Env, text: string, history: VoiceHistoryTurn[], who?: string): Promise<VoiceTurn> {
	const hint = who && SPEAKERS.includes(who as Speaker) ? `\n(The owner is currently on ${who}'s page.)` : '';
	const messages: TroopChatMessage[] = [
		{ role: 'system', content: SYSTEM + hint },
		...history.slice(-6).map((t) => ({ role: t.role, content: t.content.slice(0, 400) })),
		{ role: 'user', content: text.slice(0, 600) },
	];
	const answer = await troopComplete(env, messages, { maxTokens: 300, temperature: 0.6 });
	const raw = parseJsonObject(answer);

	const speaker = SPEAKERS.find((s) => s === raw?.speaker) ?? 'maria';
	const rawAction = (raw?.action ?? {}) as Record<string, unknown>;
	const type = ACTIONS.find((a) => a === rawAction.type) ?? 'none';
	const outfit = OUTFIT_IDS.find((o) => o === rawAction.outfit) ?? '';
	const reply = clean(typeof raw?.reply === 'string' ? raw.reply : answer) || 'Sorry, could you say that again?';
	return { speaker, reply, action: { type: type === 'wardrobe' && !outfit ? 'none' : type, task: clean(String(rawAction.task ?? '')), outfit } };
}

interface SpeechRunner {
	run(model: string, input: { text: string; speaker: string; encoding: string }, options: { returnRawResponse: boolean }): Promise<Response>;
}

/** Natural speech for a teammate, as an mp3 stream. */
export async function speech(env: Env, speaker: Speaker, text: string): Promise<Response> {
	const runner = env.AI as unknown as SpeechRunner;
	const audio = await runner.run('@cf/deepgram/aura-1', { text: clean(text), speaker: VOICES[speaker], encoding: 'mp3' }, { returnRawResponse: true });
	return new Response(audio.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'private, max-age=3600' } });
}

export function isSpeaker(value: string): value is Speaker {
	return SPEAKERS.includes(value as Speaker);
}
