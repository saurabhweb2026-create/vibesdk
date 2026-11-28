import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import { isSpeaker, speech, voiceTurn, type VoiceHistoryTurn, type VoiceTurn } from '../../../services/troop/voice';

interface TurnBody {
	text?: string;
	history?: VoiceHistoryTurn[];
	who?: string;
}

interface SpeakBody {
	speaker?: string;
	text?: string;
}

export class VoiceController extends BaseController {
	static logger = createLogger('VoiceController');

	static async turn(request: Request, env: Env, _ctx: ExecutionContext, _context: RouteContext): Promise<ControllerResponse<ApiResponse<VoiceTurn>>> {
		const body = (await request.json()) as TurnBody;
		const text = String(body.text ?? '').trim();
		if (!text) return VoiceController.createErrorResponse<VoiceTurn>('Say something first', 400);
		try {
			const history = Array.isArray(body.history) ? body.history.filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string') : [];
			return VoiceController.createSuccessResponse(await voiceTurn(env, text, history, body.who));
		} catch (error) {
			this.logger.error('Voice turn failed', error);
			return VoiceController.createErrorResponse<VoiceTurn>('The team could not hear you. Please try again.', 500);
		}
	}

	static async speak(request: Request, env: Env, _ctx: ExecutionContext, _context: RouteContext): Promise<Response> {
		const body = (await request.json()) as SpeakBody;
		const text = String(body.text ?? '').trim();
		const speaker = String(body.speaker ?? '');
		if (!text || text.length > 450 || !isSpeaker(speaker)) return new Response('Bad request', { status: 400 });
		try {
			return await speech(env, speaker, text);
		} catch (error) {
			this.logger.error('Speech failed', error);
			return new Response('Speech unavailable', { status: 502 });
		}
	}
}
