import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { LANGUAGES, isSpeaker, voiceTurn, type Speaker, type VoiceHistoryTurn, type VoiceTurn } from '../../../services/troop/voice';

interface TurnBody {
	text?: string;
	history?: VoiceHistoryTurn[];
	page?: string;
	speaker?: string;
	lang?: string;
}

export class VoiceController extends BaseController {
	static logger = createLogger('VoiceController');

	static async turn(request: Request, env: Env, _ctx: ExecutionContext, _context: RouteContext): Promise<ControllerResponse<ApiResponse<VoiceTurn>>> {
		const body = (await request.json()) as TurnBody;
		const text = String(body.text ?? '').trim();
		if (!text) return VoiceController.createErrorResponse<VoiceTurn>('Say something first', 400);
		try {
			const history = Array.isArray(body.history) ? body.history.filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string').map((t) => ({ ...t, speaker: isSpeaker(String(t.speaker)) ? t.speaker : undefined })) : [];
			return VoiceController.createSuccessResponse(
				await voiceTurn(env, {
					text,
					history,
					page: body.page,
					speaker: isSpeaker(String(body.speaker)) ? (body.speaker as Speaker) : 'bob',
					lang: LANGUAGES.some((l) => l === body.lang) ? String(body.lang) : '',
				}),
			);
		} catch (error) {
			this.logger.error('Voice turn failed', error);
			return VoiceController.createErrorResponse<VoiceTurn>('The team could not hear you. Please try again.', 500);
		}
	}
}
