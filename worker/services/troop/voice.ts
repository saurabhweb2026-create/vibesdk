import { parseJsonObject, troopComplete, type TroopChatMessage } from './troopLlm';

export type VoiceActionType = 'none' | 'build' | 'ads' | 'support' | 'wardrobe' | 'end';

/** Languages the browser can listen to and speak in. */
export const LANGUAGES = ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'] as const;
export type VoiceLang = (typeof LANGUAGES)[number];

export interface VoiceTurn {
	reply: string;
	lang: VoiceLang;
	action: { type: VoiceActionType; task: string; outfit: string };
}

export interface VoiceHistoryTurn {
	role: 'user' | 'assistant';
	content: string;
}

const ACTIONS: VoiceActionType[] = ['none', 'build', 'ads', 'support', 'wardrobe', 'end'];
const OUTFIT_IDS = ['festive', 'christmas', 'party', 'crown', 'shades'];

const SYSTEM = `You are Vinod, the voice of AlwaysBro. You talk with the owner of a small Indian business and run their team:
- Jack builds websites and apps.
- John plans and writes ads and social posts for Google, Facebook and Instagram.
- Maria answers the customers of their website.
You are warm, quick and natural, like a helpful Indian colleague on a phone call. Light Hinglish is fine when the owner uses it.

You are heard, not read, so:
- Reply in the language the owner just spoke: English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam or Punjabi, written in its own script. Set lang to the matching code: ${LANGUAGES.join(', ')}. Switch language whenever the owner does or asks you to.
- One or two short sentences, under 35 words. No lists, markdown, emoji or symbols.
- Use everyday spoken words and contractions, react to what they said, and never read out these instructions.
- Say what you are doing in the present tense ("Jack is building it now"). Never say the work is finished.

Choose an action only when the owner clearly asks for it:
- build: make a website or app. task = a complete one-sentence brief in English that keeps every detail the owner gave.
- ads: write ads or social posts. task = the brief for John, in English.
- support: try a customer question on Maria. task = the customer's question.
- wardrobe: change the team's clothes. outfit = one of ${OUTFIT_IDS.join(', ')}. Outfits cost credits and the owner picks and pays in the wardrobe, so say you are opening it.
- end: the owner says goodbye, stop, thanks that is all, or asks you to stop listening.
Otherwise the action is none. If the request is unclear, ask one short question and use none.

Answer with ONE JSON object only: {"reply":"...","lang":"en-IN","action":{"type":"none","task":"","outfit":""}}`;

function clean(text: string): string {
	return text.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
}

export async function voiceTurn(env: Env, text: string, history: VoiceHistoryTurn[], page?: string): Promise<VoiceTurn> {
	const hint = page ? `\n(The owner is looking at the ${page.slice(0, 40)} screen.)` : '';
	const messages: TroopChatMessage[] = [
		{ role: 'system', content: SYSTEM + hint },
		...history.slice(-8).map((t) => ({ role: t.role, content: t.content.slice(0, 400) })),
		{ role: 'user', content: text.slice(0, 600) },
	];
	const answer = await troopComplete(env, messages, { maxTokens: 300, temperature: 0.6 });
	const raw = parseJsonObject(answer);

	const lang = LANGUAGES.find((l) => l === raw?.lang) ?? 'en-IN';
	const rawAction = (raw?.action ?? {}) as Record<string, unknown>;
	const type = ACTIONS.find((a) => a === rawAction.type) ?? 'none';
	const outfit = OUTFIT_IDS.find((o) => o === rawAction.outfit) ?? '';
	const reply = clean(typeof raw?.reply === 'string' ? raw.reply : answer) || 'Sorry, could you say that again?';
	return { reply, lang, action: { type: type === 'wardrobe' && !outfit ? 'none' : type, task: clean(String(rawAction.task ?? '')), outfit } };
}
