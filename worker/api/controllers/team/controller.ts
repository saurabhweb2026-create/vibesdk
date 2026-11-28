import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { SkinData, buySkin, equipSkin, loadSkins } from '../../../services/troop/skins';
import { TeamData, buyItem, wearItem, giveBonus, loadTeam, renameMember } from '../../../services/troop/team';

interface TeamBody {
	agentId?: string;
	name?: string;
	slot?: string;
	itemId?: string | null;
	amount?: number;
}

export class TeamController extends BaseController {
	static logger = createLogger('TeamController');

	private static async handle<T>(run: () => Promise<T>, failure: string): Promise<ControllerResponse<ApiResponse<T>>> {
		try {
			return TeamController.createSuccessResponse(await run());
		} catch (error) {
			this.logger.error(failure, error);
			const message = error instanceof Error ? error.message : failure;
			return TeamController.createErrorResponse<T>(message, 400);
		}
	}

	static async getTeam(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<TeamData>>> {
		return this.handle(() => loadTeam(env, context.user!.id), 'Could not load your team');
	}

	static async rename(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ name: string }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => ({ name: await renameMember(env, context.user!.id, String(body.agentId ?? ''), String(body.name ?? '')) }), 'Could not rename');
	}

	static async buy(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => {
			await buyItem(env, context.user!.id, String(body.itemId ?? ''));
			return { ok: true };
		}, 'Could not buy this');
	}

	static async wear(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => {
			await wearItem(env, context.user!.id, String(body.agentId ?? ''), String(body.slot ?? ''), body.itemId ? String(body.itemId) : null);
			return { ok: true };
		}, 'Could not change the look');
	}

	static async getSkins(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<SkinData>>> {
		return this.handle(() => loadSkins(env, context.user!.id), 'Could not load the looks');
	}

	static async buySkin(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const body = (await request.json()) as { skinId?: string };
		return this.handle(async () => {
			await buySkin(env, context.user!.id, String(body.skinId ?? ''));
			return { ok: true };
		}, 'Could not unlock the look');
	}

	static async equipSkin(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const body = (await request.json()) as { skinId?: string };
		return this.handle(async () => {
			await equipSkin(env, context.user!.id, String(body.skinId ?? ''));
			return { ok: true };
		}, 'Could not switch the look');
	}

	static async bonus(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ reply: string }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => ({ reply: await giveBonus(env, context.user!.id, String(body.agentId ?? ''), Number(body.amount)) }), 'Could not give the bonus');
	}
}
