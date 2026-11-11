import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import {
    createRazorpayOrder,
    getPacks as loadPacks,
    getPurchasedBalance,
    CreditPack,
} from '../../../services/credits/purchasedCredits';

interface PacksData {
    packs: CreditPack[];
    balance: number;
}

interface OrderData {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    packId: string;
}

export class PaymentsController extends BaseController {
    static logger = createLogger('PaymentsController');

    // List credit packs and the user's purchased balance
    static async listPacks(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<PacksData>>> {
        try {
            const user = context.user!;
            const balance = await getPurchasedBalance(env, user.id);
            return PaymentsController.createSuccessResponse({ packs: loadPacks(env), balance });
        } catch (error) {
            this.logger.error('Error loading credit packs:', error);
            return PaymentsController.createErrorResponse<PacksData>('Failed to load credit packs', 500);
        }
    }

    // Create a Razorpay order for the chosen pack
    static async createOrder(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<OrderData>>> {
        try {
            const user = context.user!;
            const body = (await request.json()) as { packId?: string };
            const pack = loadPacks(env).find((p) => p.id === body.packId);
            if (!pack) {
                return PaymentsController.createErrorResponse<OrderData>('Unknown credit pack', 400);
            }
            const order = await createRazorpayOrder(env, user.id, pack);
            return PaymentsController.createSuccessResponse({ ...order, packId: pack.id });
        } catch (error) {
            this.logger.error('Error creating payment order:', error);
            return PaymentsController.createErrorResponse<OrderData>('Failed to start payment', 500);
        }
    }
}
