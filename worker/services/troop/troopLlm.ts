import { THINK_MODEL_ID } from '../../agents/think/model-config';

export interface TroopChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface CompletionResponse {
	choices?: Array<{ message?: { content?: string | null } }>;
}

// One plain completion through the platform AI Gateway (the same route the builder uses).
export async function troopComplete(
	env: Env,
	messages: TroopChatMessage[],
	opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
	const gateway = env.AI.gateway(env.CLOUDFLARE_AI_GATEWAY);
	const baseUrl = `${await gateway.getUrl()}compat`;
	const token = env.CLOUDFLARE_AI_GATEWAY_TOKEN || env.CLOUDFLARE_API_TOKEN;

	const res = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
			'cf-aig-authorization': `Bearer ${token}`,
		},
		body: JSON.stringify({
			model: THINK_MODEL_ID,
			messages,
			max_tokens: opts.maxTokens ?? 2048,
			temperature: opts.temperature ?? 0.7,
		}),
	});

	if (!res.ok) {
		throw new Error(`AI request failed (${res.status})`);
	}
	const data = (await res.json()) as CompletionResponse;
	const text = data.choices?.[0]?.message?.content;
	if (!text) throw new Error('AI returned an empty answer');
	return text;
}

// Pulls the first JSON object out of a model answer, tolerating code fences and extra text.
export function parseJsonObject(text: string): Record<string, unknown> | null {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end <= start) return null;
	try {
		const parsed: unknown = JSON.parse(text.slice(start, end + 1));
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}
