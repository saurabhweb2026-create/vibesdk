import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { canUseTroop, getOwnedSite } from '../../../services/troop/troopStore';
import {
	MetaPostRow,
	MetaStatus,
	MetaTarget,
	cancelPost,
	connectUrl,
	createPost,
	disconnect,
	getStatus,
} from '../../../services/meta/metaService';

interface PostBody {
	appId?: string;
	message?: string;
	image?: string;
	video?: string;
	target?: string;
	scheduleAt?: number;
}

const TARGETS: MetaTarget[] = ['facebook', 'instagram', 'both'];

export class MetaController extends BaseController {
	static logger = createLogger('MetaController');

	private static async handle<T>(run: () => Promise<T>, failure: string): Promise<ControllerResponse<ApiResponse<T>>> {
		try {
			return MetaController.createSuccessResponse(await run());
		} catch (error) {
			this.logger.error(failure, error);
			return MetaController.createErrorResponse<T>(error instanceof Error ? error.message : failure, 400);
		}
	}

	static async status(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<MetaStatus>>> {
		return this.handle(() => getStatus(env, context.user!.id), 'Could not load your Meta connection');
	}

	static async connect(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ url: string }>>> {
		return this.handle(async () => ({ url: await connectUrl(env, context.user!.id) }), 'Could not start the Meta sign-in');
	}

	static async remove(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		return this.handle(async () => {
			await disconnect(env, context.user!.id);
			return { ok: true };
		}, 'Could not disconnect Meta');
	}

	static async post(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ post: MetaPostRow }>>> {
		return this.handle(async () => {
			const user = context.user!;
			if (!(await canUseTroop(env, user.id, 'louie'))) throw new Error('John is part of the John or Pro plan');
			const body = (await request.json()) as PostBody;
			const appId = String(body.appId ?? '');
			if (!(await getOwnedSite(env, user.id, appId))) throw new Error('Website not found');
			const target = TARGETS.find((t) => t === body.target);
			if (!target) throw new Error('Choose where to post');
			const post = await createPost(env, user.id, {
				appId,
				message: String(body.message ?? ''),
				image: typeof body.image === 'string' ? body.image : undefined,
				video: typeof body.video === 'string' ? body.video : undefined,
				target,
				scheduleAt: typeof body.scheduleAt === 'number' ? body.scheduleAt : undefined,
			});
			return { post };
		}, 'Could not post to Meta');
	}

	static async cancel(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<{ ok: boolean }>>> {
		return this.handle(async () => {
			await cancelPost(env, context.user!.id, context.pathParams?.id ?? '');
			return { ok: true };
		}, 'Could not cancel the post');
	}
}
