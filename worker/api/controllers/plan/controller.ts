import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { canUseTroop, getOwnedSite, takeUsage } from '../../../services/troop/troopStore';
import type { MetaTarget } from '../../../services/meta/metaService';
import { approvePlanItem, editPlanItem, getBrand, learnBrand, listPlan, planMonth, type Brand, type PlanItem } from '../../../services/troop/plan';

export interface PlanData {
	brand: Brand | null;
	items: PlanItem[];
}

const TARGETS: MetaTarget[] = ['facebook', 'instagram', 'both'];
const PLANS_PER_DAY = 6;

export class PlanController extends BaseController {
	static logger = createLogger('PlanController');

	private static async handle<T>(context: RouteContext, run: (userId: string) => Promise<T>, failure: string): Promise<ControllerResponse<ApiResponse<T>>> {
		try {
			const userId = context.user!.id;
			return PlanController.createSuccessResponse(await run(userId));
		} catch (error) {
			this.logger.error(failure, error);
			return PlanController.createErrorResponse<T>(error instanceof Error ? error.message : failure, 400);
		}
	}

	private static async owned(env: Env, userId: string, appId: string) {
		if (!(await canUseTroop(env, userId, 'louie'))) throw new Error('John is part of the John or Pro plan');
		const site = await getOwnedSite(env, userId, appId);
		if (!site) throw new Error('Website not found');
		return site;
	}

	static async get(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<PlanData>>> {
		return this.handle(context, async (userId) => {
			const site = await this.owned(env, userId, context.pathParams?.appId ?? '');
			return { brand: await getBrand(env, userId, site.id), items: await listPlan(env, userId, site.id) };
		}, 'Could not load the content calendar');
	}

	static async learn(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ brand: Brand }>>> {
		return this.handle(context, async (userId) => {
			const site = await this.owned(env, userId, context.pathParams?.appId ?? '');
			const body = (await request.json().catch(() => ({}))) as { link?: string };
			return { brand: await learnBrand(env, userId, site, String(body.link ?? '')) };
		}, 'John could not learn your business');
	}

	static async generate(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<PlanData>>> {
		return this.handle(context, async (userId) => {
			const site = await this.owned(env, userId, context.pathParams?.appId ?? '');
			const brand = await getBrand(env, userId, site.id);
			if (!brand) throw new Error('Let John learn your business first');
			if (!(await takeUsage(env, `plan:${userId}`, PLANS_PER_DAY))) throw new Error('John has planned enough for today. Please try again tomorrow.');
			const body = (await request.json().catch(() => ({}))) as { focus?: string };
			return { brand, items: await planMonth(env, userId, site, brand, String(body.focus ?? '').trim().slice(0, 200)) };
		}, 'John could not plan the month');
	}

	static async edit(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		return this.handle(context, async (userId) => {
			const body = (await request.json()) as { caption?: string; day?: string; skip?: boolean };
			await editPlanItem(env, userId, context.pathParams?.id ?? '', {
				caption: typeof body.caption === 'string' ? body.caption : undefined,
				day: typeof body.day === 'string' ? body.day : undefined,
				skip: typeof body.skip === 'boolean' ? body.skip : undefined,
			});
			return { ok: true };
		}, 'Could not save the change');
	}

	static async approve(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ item: PlanItem }>>> {
		return this.handle(context, async (userId) => {
			if (!(await canUseTroop(env, userId, 'louie'))) throw new Error('John is part of the John or Pro plan');
			const body = (await request.json()) as { message?: string; image?: string; video?: string; target?: string };
			const target = TARGETS.find((t) => t === body.target);
			if (!target) throw new Error('Choose where to post');
			const item = await approvePlanItem(env, userId, context.pathParams?.id ?? '', {
				message: String(body.message ?? ''),
				image: typeof body.image === 'string' ? body.image : undefined,
				video: typeof body.video === 'string' ? body.video : undefined,
				target,
			});
			return { item };
		}, 'Could not schedule the post');
	}
}
