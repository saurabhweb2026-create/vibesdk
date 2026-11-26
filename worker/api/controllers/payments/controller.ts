import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { createLogger } from '../../../logger';
import {
    BillingStatus,
    cancelUserSubscription,
    createRazorpayOrder,
    createRazorpaySubscription,
    getBillingStatus,
    getPacks,
    PaidPlanId,
} from '../../../services/credits/purchasedCredits';

interface OrderData {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    packId: string;
}

interface SubscribeData {
    subscriptionId: string;
    keyId: string;
    plan: PaidPlanId;
}

interface CancelData {
    result: 'cancelling' | 'nothing';
}

// Messages that are safe and useful to show to the person using the app.
const FRIENDLY_ERRORS = ['Unknown plan', 'This plan is not available yet', 'You are already on this plan', 'You already have this with another plan'];

export class PaymentsController extends BaseController {
    static logger = createLogger('PaymentsController');

    // Plan, credits, plans on offer and credit packs, in one call
    static async listPacks(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<BillingStatus>>> {
        try {
            const user = context.user!;
            return PaymentsController.createSuccessResponse(await getBillingStatus(env, user.id));
        } catch (error) {
            this.logger.error('Error loading billing status:', error);
            return PaymentsController.createErrorResponse<BillingStatus>('Failed to load plans', 500);
        }
    }

    // Start a subscription for the chosen plan
    static async subscribe(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<SubscribeData>>> {
        try {
            const user = context.user!;
            const body = (await request.json()) as { plan?: string };
            const result = await createRazorpaySubscription(env, user.id, String(body.plan ?? ''));
            return PaymentsController.createSuccessResponse(result);
        } catch (error) {
            this.logger.error('Error creating subscription:', error);
            const message = error instanceof Error ? error.message : '';
            if (FRIENDLY_ERRORS.includes(message)) {
                return PaymentsController.createErrorResponse<SubscribeData>(message, 400);
            }
            return PaymentsController.createErrorResponse<SubscribeData>('Failed to start the subscription', 500);
        }
    }

    // Stop renewals at the end of the period already paid for
    static async cancel(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<CancelData>>> {
        try {
            const user = context.user!;
            const body = (await request.json()) as { plan?: string };
            const result = await cancelUserSubscription(env, user.id, String(body.plan ?? ''));
            return PaymentsController.createSuccessResponse({ result });
        } catch (error) {
            this.logger.error('Error cancelling subscription:', error);
            return PaymentsController.createErrorResponse<CancelData>('Failed to cancel the plan', 500);
        }
    }

    // Buy a one-time pack of extra credits
    static async createOrder(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<OrderData>>> {
        try {
            const user = context.user!;
            const body = (await request.json()) as { packId?: string };
            const pack = getPacks(env).find((p) => p.id === body.packId);
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
