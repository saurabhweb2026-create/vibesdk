import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import type { AgentId } from '../../../services/credits/purchasedCredits';
import { AdPack, generateAdPack } from '../../../services/troop/louie';
import { defaultGreeting } from '../../../services/troop/jack';
import {
	InboxConversation,
	InboxLead,
	SavedAdPack,
	SiteInfo,
	canUseTroop,
	getBot,
	getOwnedSite,
	listAdPacks,
	listSites,
	loadInbox,
	saveAdPack,
	saveBot,
	takeUsage,
} from '../../../services/troop/troopStore';

interface SitesData {
	access: Record<AgentId, boolean>;
	required: boolean;
	sites: SiteInfo[];
}

interface JackSetupData {
	appId: string;
	businessName: string;
	knowledge: string;
	tone: string;
	greeting: string;
	enabled: boolean;
	embedSnippet: string;
	conversations: InboxConversation[];
	leads: InboxLead[];
}

const LOUIE_DAILY_LIMIT = 20;
const NOT_ALLOWED_LOUIE = 'Subscribe to Maria, or to Pro, to use this';
const NOT_ALLOWED_JACK = 'Subscribe to Jack, or to Pro, to use this';
const TONES = ['friendly', 'formal', 'short'];

function appIdFrom(request: Request): string {
	return new URL(request.url).searchParams.get('appId') ?? '';
}

export class TroopController extends BaseController {
	static logger = createLogger('TroopController');

	static async listSites(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<SitesData>>> {
		try {
			const user = context.user!;
			const [louie, jack, sites] = await Promise.all([
				canUseTroop(env, user.id, 'louie'),
				canUseTroop(env, user.id, 'jack'),
				listSites(env, user.id),
			]);
			const required = (env as unknown as Record<string, string | undefined>).TROOP_REQUIRE_PLAN === 'true';
			return TroopController.createSuccessResponse({ access: { caesar: true, louie, jack }, required, sites });
		} catch (error) {
			this.logger.error('Error listing websites:', error);
			return TroopController.createErrorResponse<SitesData>('Failed to load your websites', 500);
		}
	}

	static async generateAds(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<SavedAdPack>>> {
		try {
			const user = context.user!;
			if (!(await canUseTroop(env, user.id, 'louie'))) return TroopController.createErrorResponse<SavedAdPack>(NOT_ALLOWED_LOUIE, 403);

			const body = (await request.json()) as { appId?: string; goal?: string; budgetInr?: number; audience?: string; location?: string; tone?: string; offer?: string; formats?: string[] };
			const site = await getOwnedSite(env, user.id, String(body.appId ?? ''));
			if (!site) return TroopController.createErrorResponse<SavedAdPack>('Website not found', 404);

			const goal = String(body.goal ?? '').trim().slice(0, 200) || 'Get more customers';
			const budgetInr = Math.max(500, Math.min(10_000_000, Math.round(Number(body.budgetInr) || 10_000)));

			if (!(await takeUsage(env, `louie-user:${user.id}`, LOUIE_DAILY_LIMIT))) {
				return TroopController.createErrorResponse<SavedAdPack>('Maria has reached today\'s limit. Please try again tomorrow.', 429);
			}

			const pack: AdPack = await generateAdPack(env, site, {
				goal,
				budgetInr,
				audience: String(body.audience ?? '').trim().slice(0, 200),
				location: String(body.location ?? '').trim().slice(0, 100),
				tone: String(body.tone ?? '').trim().slice(0, 60),
				offer: String(body.offer ?? '').trim().slice(0, 200),
				formats: Array.isArray(body.formats) ? body.formats.map((f) => String(f).slice(0, 40)).slice(0, 6) : [],
			});
			const saved = await saveAdPack(env, { userId: user.id, appId: site.id, goal, budgetInr, content: pack });
			return TroopController.createSuccessResponse(saved);
		} catch (error) {
			this.logger.error('Error generating ads:', error);
			const message = error instanceof Error && error.message.startsWith('Maria') ? error.message : 'Maria could not write the ads. Please try again.';
			return TroopController.createErrorResponse<SavedAdPack>(message, 500);
		}
	}

	static async listAds(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ packs: SavedAdPack[] }>>> {
		try {
			const user = context.user!;
			const packs = await listAdPacks(env, user.id, appIdFrom(request));
			return TroopController.createSuccessResponse({ packs });
		} catch (error) {
			this.logger.error('Error listing ad packs:', error);
			return TroopController.createErrorResponse<{ packs: SavedAdPack[] }>('Failed to load ads', 500);
		}
	}

	static async getJack(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<JackSetupData>>> {
		try {
			const user = context.user!;
			const site = await getOwnedSite(env, user.id, appIdFrom(request));
			if (!site) return TroopController.createErrorResponse<JackSetupData>('Website not found', 404);

			const [bot, inbox] = await Promise.all([getBot(env, site.id), loadInbox(env, site.id)]);
			const businessName = bot?.businessName || site.title;
			const origin = new URL(request.url).origin;
			return TroopController.createSuccessResponse({
				appId: site.id,
				businessName,
				knowledge: bot?.knowledge ?? '',
				tone: bot?.tone ?? 'friendly',
				greeting: bot?.greeting || defaultGreeting(businessName),
				enabled: bot?.enabled ?? false,
				embedSnippet: `<script src="${origin}/api/jack/widget.js?bot=${site.id}" async></script>`,
				conversations: inbox.conversations,
				leads: inbox.leads,
			});
		} catch (error) {
			this.logger.error('Error loading Jack:', error);
			return TroopController.createErrorResponse<JackSetupData>('Failed to load Jack', 500);
		}
	}

	static async saveJack(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ saved: boolean }>>> {
		try {
			const user = context.user!;
			if (!(await canUseTroop(env, user.id, 'jack'))) return TroopController.createErrorResponse<{ saved: boolean }>(NOT_ALLOWED_JACK, 403);

			const body = (await request.json()) as { appId?: string; businessName?: string; knowledge?: string; tone?: string; greeting?: string; enabled?: boolean };
			const site = await getOwnedSite(env, user.id, String(body.appId ?? ''));
			if (!site) return TroopController.createErrorResponse<{ saved: boolean }>('Website not found', 404);

			const tone = TONES.includes(String(body.tone)) ? String(body.tone) : 'friendly';
			await saveBot(env, {
				appId: site.id,
				userId: user.id,
				businessName: String(body.businessName ?? '').trim().slice(0, 80),
				knowledge: String(body.knowledge ?? '').trim().slice(0, 6000),
				tone,
				greeting: String(body.greeting ?? '').trim().slice(0, 200),
				enabled: body.enabled === true,
			});
			return TroopController.createSuccessResponse({ saved: true });
		} catch (error) {
			this.logger.error('Error saving Jack:', error);
			return TroopController.createErrorResponse<{ saved: boolean }>('Failed to save Jack', 500);
		}
	}
}
