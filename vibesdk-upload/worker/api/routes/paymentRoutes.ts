import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { PaymentsController } from '../controllers/payments/controller';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupPaymentRoutes(app: Hono<AppEnv>): void {
    // everything here needs a signed-in user; the user id always comes from the session, never from the request
    app.get('/api/payments/status', setAuthLevel(AuthConfig.authenticated), adaptController(PaymentsController, PaymentsController.listPacks));
    app.get('/api/payments/packs', setAuthLevel(AuthConfig.authenticated), adaptController(PaymentsController, PaymentsController.listPacks));
    app.post('/api/payments/subscribe', setAuthLevel(AuthConfig.authenticated), adaptController(PaymentsController, PaymentsController.subscribe));
    app.post('/api/payments/cancel', setAuthLevel(AuthConfig.authenticated), adaptController(PaymentsController, PaymentsController.cancel));
    app.post('/api/payments/order', setAuthLevel(AuthConfig.authenticated), adaptController(PaymentsController, PaymentsController.createOrder));
}
