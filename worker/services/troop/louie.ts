import { parseJsonObject, troopComplete } from './troopLlm';
import type { SiteInfo } from './troopStore';

export interface AdPack {
	summary: string;
	audience: string[];
	googleSearch: { headlines: string[]; descriptions: string[]; keywords: string[] };
	metaAds: Array<{ primaryText: string; headline: string; cta: string }>;
	socialPosts: Array<{ caption: string; hashtags: string[] }>;
	whatsappMessage: string;
	budgetPlan: Array<{ channel: string; sharePercent: number; why: string }>;
	firstWeek: string[];
	videoScripts: Array<{ title: string; hook: string; scenes: string[]; voiceover: string; cta: string }>;
	creatives: Array<{ format: string; visual: string; overlayText: string; caption: string }>;
}

export interface AdRequest {
	goal: string;
	budgetInr: number;
	audience: string;
	location: string;
	tone: string;
	offer: string;
	formats: string[];
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
	if (!Array.isArray(v)) return [];
	return v
		.map((x) => str(x, maxLen))
		.filter((x) => x.length > 0)
		.slice(0, maxItems);
}

function objList(v: unknown, maxItems: number): Array<Record<string, unknown>> {
	if (!Array.isArray(v)) return [];
	return v
		.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
		.slice(0, maxItems);
}

function normalize(raw: Record<string, unknown>): AdPack {
	const google = (raw.googleSearch ?? {}) as Record<string, unknown>;
	return {
		summary: str(raw.summary, 400),
		audience: strList(raw.audience, 6, 120),
		googleSearch: {
			headlines: strList(google.headlines, 8, 30),
			descriptions: strList(google.descriptions, 4, 90),
			keywords: strList(google.keywords, 12, 60),
		},
		metaAds: objList(raw.metaAds, 4).map((a) => ({
			primaryText: str(a.primaryText, 400),
			headline: str(a.headline, 60),
			cta: str(a.cta, 30),
		})),
		socialPosts: objList(raw.socialPosts, 4).map((p) => ({
			caption: str(p.caption, 500),
			hashtags: strList(p.hashtags, 10, 40),
		})),
		whatsappMessage: str(raw.whatsappMessage, 600),
		budgetPlan: objList(raw.budgetPlan, 5).map((b) => ({
			channel: str(b.channel, 60),
			sharePercent: Math.max(0, Math.min(100, Math.round(Number(b.sharePercent) || 0))),
			why: str(b.why, 200),
		})),
		firstWeek: strList(raw.firstWeek, 7, 200),
		videoScripts: objList(raw.videoScripts, 3).map((v) => ({
			title: str(v.title, 80),
			hook: str(v.hook, 160),
			scenes: strList(v.scenes, 6, 200),
			voiceover: str(v.voiceover, 600),
			cta: str(v.cta, 80),
		})),
		creatives: objList(raw.creatives, 4).map((c) => ({
			format: str(c.format, 40),
			visual: str(c.visual, 300),
			overlayText: str(c.overlayText, 80),
			caption: str(c.caption, 300),
		})),
	};
}

const SYSTEM = `You are Louie, the advertising specialist of the Monkeytrooprs AI team. You write ready-to-use ad material for small businesses in India.
Write in clear, simple English. Be specific to the business. Never invent prices, offers or claims that are not in the brief.
Answer with ONE JSON object only, no markdown, with exactly these keys:
{
 "summary": "2 sentences: the angle of the campaign",
 "audience": ["3 to 5 short audience descriptions"],
 "googleSearch": {"headlines": ["6 headlines, each at most 30 characters"], "descriptions": ["3 descriptions, each at most 90 characters"], "keywords": ["8 to 10 search keywords"]},
 "metaAds": [{"primaryText": "short ad text", "headline": "short headline", "cta": "button text"}],
 "socialPosts": [{"caption": "post caption", "hashtags": ["#tag"]}],
 "whatsappMessage": "one short broadcast message",
 "budgetPlan": [{"channel": "name", "sharePercent": 50, "why": "one sentence"}],
 "firstWeek": ["5 simple actions for the first 7 days"],
 "videoScripts": [{"title": "short title", "hook": "first 3 seconds line", "scenes": ["4 to 5 shot descriptions, each one line"], "voiceover": "full voiceover for a 20 to 30 second reel", "cta": "closing line"}],
 "creatives": [{"format": "Instagram post | Story | Banner", "visual": "what the image shows, ready to give to a designer or image tool", "overlayText": "short text on the image", "caption": "post caption"}]
}
metaAds must have 3 items, socialPosts 3 items, videoScripts 2 items and creatives 4 items. budgetPlan shares must add up to 100.
Match the requested tone and use the offer exactly as given. Only fill the content types the user asked for; use empty arrays for the rest.`;

export async function generateAdPack(env: Env, site: SiteInfo, req: AdRequest): Promise<AdPack> {
	const brief = [
		`Business website: ${site.title}`,
		site.description ? `About: ${site.description}` : '',
		`Original idea: ${site.originalPrompt.slice(0, 600)}`,
		`Goal: ${req.goal}`,
		`Monthly budget: Rs ${req.budgetInr}`,
		req.audience ? `Target customers: ${req.audience}` : '',
		req.location ? `Location: ${req.location}` : '',
		req.tone ? `Tone: ${req.tone}` : '',
		req.offer ? `Offer to promote: ${req.offer}` : '',
		req.formats.length ? `Content wanted: ${req.formats.join(', ')}` : '',
	]
		.filter(Boolean)
		.join('\n');

	const text = await troopComplete(
		env,
		[
			{ role: 'system', content: SYSTEM },
			{ role: 'user', content: brief },
		],
		{ maxTokens: 4500, temperature: 0.8 },
	);

	const raw = parseJsonObject(text);
	if (!raw) throw new Error('Louie could not write the ads this time');
	const pack = normalize(raw);
	if (pack.googleSearch.headlines.length === 0 && pack.metaAds.length === 0) {
		throw new Error('Louie could not write the ads this time');
	}
	return pack;
}
