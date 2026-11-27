import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { TeamData, buyOutfit, equipOutfit, giveBonus, loadTeam, renameMember } from '../../../services/troop/team';

interface TeamBody {
	agentId?: string;
	name?: string;
	outfitId?: string | null;
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
			await buyOutfit(env, context.user!.id, String(body.outfitId ?? ''));
			return { ok: true };
		}, 'Could not buy the outfit');
	}

	static async equip(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => {
			await equipOutfit(env, context.user!.id, String(body.agentId ?? ''), body.outfitId ? String(body.outfitId) : null);
			return { ok: true };
		}, 'Could not change the outfit');
	}

	static async bonus(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ reply: string }>>> {
		const body = (await request.json()) as TeamBody;
		return this.handle(async () => ({ reply: await giveBonus(env, context.user!.id, String(body.agentId ?? ''), Number(body.amount)) }), 'Could not give the bonus');
	}
}
