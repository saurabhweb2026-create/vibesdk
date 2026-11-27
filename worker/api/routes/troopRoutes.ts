import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { TroopController } from '../controllers/troop/controller';
import { TeamController } from '../controllers/team/controller';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupTroopRoutes(app: Hono<AppEnv>): void {
	// Everything here needs a signed-in user; ownership of the website is checked in the controller.
	app.get('/api/troop/sites', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listSites));
	app.post('/api/louie/generate', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.generateAds));
	app.get('/api/louie/packs', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listAds));
	app.get('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.getJack));
	app.put('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.saveJack));
	app.get('/api/team', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.getTeam));
	app.put('/api/team/name', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.rename));
	app.post('/api/team/outfit/buy', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.buy));
	app.post('/api/team/outfit/equip', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.equip));
	app.post('/api/team/bonus', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.bonus));
}
