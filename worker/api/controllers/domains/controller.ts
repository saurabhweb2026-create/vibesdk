import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { connectDomain, getDomain, removeDomain, type DomainState } from '../../../services/domains/customDomains';

export class DomainController extends BaseController {
	static logger = createLogger('DomainController');

	private static async handle<T>(run: () => Promise<T>, failure: string): Promise<ControllerResponse<ApiResponse<T>>> {
		try {
			return DomainController.createSuccessResponse(await run());
		} catch (error) {
			this.logger.error(failure, error);
			return DomainController.createErrorResponse<T>(error instanceof Error ? error.message : failure, 400);
		}
	}

	static async get(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ domain: DomainState | null }>>> {
		const appId = context.pathParams?.appId ?? '';
		return this.handle(async () => ({ domain: await getDomain(env, context.user!.id, appId) }), 'Could not check the domain');
	}

	static async connect(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ domain: DomainState }>>> {
		const appId = context.pathParams?.appId ?? '';
		const body = (await request.json()) as { hostname?: string };
		return this.handle(async () => ({ domain: await connectDomain(env, context.user!.id, appId, String(body.hostname ?? '')) }), 'Could not connect the domain');
	}

	static async remove(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		const appId = context.pathParams?.appId ?? '';
		return this.handle(async () => {
			await removeDomain(env, context.user!.id, appId);
			return { ok: true };
		}, 'Could not remove the domain');
	}
}
