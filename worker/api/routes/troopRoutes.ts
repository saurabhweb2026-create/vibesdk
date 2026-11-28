import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { TroopController } from '../controllers/troop/controller';
import { DomainController } from '../controllers/domains/controller';
import { MetaController } from '../controllers/meta/controller';
import { completeConnect, readMedia } from '../../services/meta/metaService';
import { TeamController } from '../controllers/team/controller';
import { VoiceController } from '../controllers/voice/controller';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupTroopRoutes(app: Hono<AppEnv>): void {
	// Everything here needs a signed-in user; ownership of the website is checked in the controller.
	app.get('/api/troop/sites', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listSites));
	app.post('/api/louie/generate', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.generateAds));
	app.post('/api/louie/image', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.generateImage));
	app.get('/api/louie/packs', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.listAds));
	app.get('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.getJack));
	app.put('/api/jack/bot', setAuthLevel(AuthConfig.authenticated), adaptController(TroopController, TroopController.saveJack));
	app.get('/api/team', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.getTeam));
	app.put('/api/team/name', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.rename));
	app.post('/api/team/outfit/buy', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.buy));
	app.post('/api/team/outfit/equip', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.equip));
	app.get('/api/skins', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.getSkins));
	app.post('/api/skins/buy', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.buySkin));
	app.post('/api/skins/equip', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.equipSkin));
	app.get('/api/domains/:appId', setAuthLevel(AuthConfig.authenticated), adaptController(DomainController, DomainController.get));
	app.post('/api/domains/:appId', setAuthLevel(AuthConfig.authenticated), adaptController(DomainController, DomainController.connect));
	app.delete('/api/domains/:appId', setAuthLevel(AuthConfig.authenticated), adaptController(DomainController, DomainController.remove));
	app.get('/api/meta/status', setAuthLevel(AuthConfig.authenticated), adaptController(MetaController, MetaController.status));
	app.get('/api/meta/connect', setAuthLevel(AuthConfig.authenticated), adaptController(MetaController, MetaController.connect));
	app.delete('/api/meta/connection', setAuthLevel(AuthConfig.authenticated), adaptController(MetaController, MetaController.remove));
	app.post('/api/meta/post', setAuthLevel(AuthConfig.authenticated), adaptController(MetaController, MetaController.post));
	app.delete('/api/meta/post/:id', setAuthLevel(AuthConfig.authenticated), adaptController(MetaController, MetaController.cancel));
	// Meta redirects the browser here after sign-in; the signed state proves who started it.
	app.get('/api/meta/callback', setAuthLevel(AuthConfig.public), async (c) => {
		const code = c.req.query('code');
		const state = c.req.query('state');
		let result = 'connected';
		try {
			if (!code || !state) throw new Error('missing');
			await completeConnect(c.env, code, state);
		} catch (error) {
			console.error('Meta sign-in failed', error instanceof Error ? error.message : error);
			result = 'error';
		}
		return c.redirect(`/troop/louie?meta=${result}`);
	});
	// Instagram fetches the picture from this public address; keys are unguessable.
	app.get('/api/meta/media/:key', setAuthLevel(AuthConfig.public), async (c) => {
		const media = await readMedia(c.env, c.req.param('key'));
		if (!media) return c.notFound();
		return new Response(media.body, { headers: { 'content-type': media.type, 'cache-control': 'public, max-age=86400' } });
	});
	app.post('/api/voice/turn', setAuthLevel(AuthConfig.authenticated), adaptController(VoiceController, VoiceController.turn));
	app.post('/api/voice/speak', setAuthLevel(AuthConfig.authenticated), adaptController(VoiceController, VoiceController.speak));
	app.post('/api/team/bonus', setAuthLevel(AuthConfig.authenticated), adaptController(TeamController, TeamController.bonus));
}
