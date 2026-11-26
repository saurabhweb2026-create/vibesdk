import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { TroopController } from '../controllers/troop/controller';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupTroopRoutes(app: Hono<AppEnv>): void {
	// Everything here needs a signed-in user; ownership of the website is checked in the controller.
	app.get('/api/troop/sites', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listSites));
	app.post('/api/louie/generate', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.generateAds));
	app.get('/api/louie/packs', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listAds));
	app.get('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.getJack));
	app.put('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.saveJack));
}
