import { THINK_MODEL_ID } from '../../agents/think/model-config';

export interface TroopChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface CompletionResponse {
	choices?: Array<{ message?: { content?: string | null } }>;
}

interface WorkersAiAnswer {
	response?: unknown;
	result?: { response?: unknown };
	choices?: Array<{ message?: { content?: string | null }; text?: string | null }>;
}

interface WorkersAiRunner {
	run(model: string, input: { messages: TroopChatMessage[]; max_tokens: number; temperature: number }): Promise<WorkersAiAnswer | string>;
}

// Workers AI models answer in either the classic { response } shape or the OpenAI-style { choices } shape.
function readWorkersAiText(out: WorkersAiAnswer | string): string {
	if (typeof out === 'string') return out;
	const picked = out.response || out.result?.response || out.choices?.[0]?.message?.content || out.choices?.[0]?.text || '';
	// Workers AI parses JSON answers into objects; hand callers text either way.
	return typeof picked === 'string' ? picked : JSON.stringify(picked);
}

// TROOP_MODEL can name a Cloudflare Workers AI model (starts with @cf/) to run John and Maria on the free daily allowance.
async function completeWithWorkersAi(env: Env, model: string, messages: TroopChatMessage[], maxTokens: number, temperature: number): Promise<string> {
	const runner = env.AI as unknown as WorkersAiRunner;
	const out = await runner.run(model, { messages, max_tokens: maxTokens, temperature });
	const text = readWorkersAiText(out);
	if (!text) throw new Error('AI returned an empty answer');
	return text;
}

const FALLBACK_WORKERS_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// One plain completion through the platform AI Gateway (the same route the builder uses).
export async function troopComplete(
	env: Env,
	messages: TroopChatMessage[],
	opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
	const override = (env as unknown as Record<string, string | undefined>).TROOP_MODEL?.trim();
	// Plain (non-reasoning) models first: a reasoning model can spend a small token budget thinking and return nothing.
	const workersModels = [override && override.startsWith('@cf/') ? override : '', FALLBACK_WORKERS_MODEL].filter((m, i, all) => m && all.indexOf(m) === i);
	for (const model of workersModels) {
		try {
			return await completeWithWorkersAi(env, model, messages, opts.maxTokens ?? 2048, opts.temperature ?? 0.7);
		} catch (error) {
			console.error(`Workers AI model ${model} failed`, error);
		}
	}

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
			model: override && !override.startsWith('@cf/') ? override : THINK_MODEL_ID,
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
