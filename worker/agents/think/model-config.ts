import { ModelSize, type AIModelConfig } from '../inferutils/config.types';

export const THINK_MODEL_ID = 'google-ai-studio/gemini-3.6-flash';

export const THINK_MODEL_CONFIG: AIModelConfig = {
	name: 'Gemini 3.6 Flash',
	size: ModelSize.REGULAR,
	provider: 'google-ai-studio',
	creditCost: 2,
	contextSize: 1_048_576,
};

/**
 * Resolves the builder model. `THINK_MODEL` (Cloudflare variable) overrides the
 * default; any Kimi model id works, e.g. `@cf/moonshotai/kimi-k2.6` or
 * `moonshotai/kimi-k3`. Bare `@cf/...` ids are routed through the gateway's
 * `workers-ai` provider.
 */
export function resolveThinkModel(override?: string): { id: string; config: AIModelConfig } {
	const raw = override?.trim();
	if (!raw) return { id: THINK_MODEL_ID, config: THINK_MODEL_CONFIG };
	const id = raw.startsWith('@cf/') ? `workers-ai/${raw}` : raw;
	if (id === THINK_MODEL_ID) return { id, config: THINK_MODEL_CONFIG };
	const lower = id.toLowerCase();
	const isKimi = lower.includes('kimi');
	return {
		id,
		config: {
			name: raw,
			size: ModelSize.REGULAR,
			provider: id.split('/')[0],
			creditCost: isKimi ? 3 : THINK_MODEL_CONFIG.creditCost,
			contextSize: lower.includes('kimi-k3') ? 1_000_000 : isKimi ? 262_144 : 200_000,
		},
	};
}
