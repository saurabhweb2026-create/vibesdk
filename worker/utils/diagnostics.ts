/**
 * Persists a short failure record to D1 so production errors can be inspected
 * without log access. Never throws.
 */
export async function recordDiagnostic(env: Env, source: string, detail: unknown): Promise<void> {
	try {
		const message = detail instanceof Error ? `${detail.message}\n${detail.stack ?? ''}` : String(detail);
		await env.DB.prepare('CREATE TABLE IF NOT EXISTS llm_errors (ts TEXT, model TEXT, status INTEGER, body TEXT)').run();
		await env.DB
			.prepare('INSERT INTO llm_errors (ts, model, status, body) VALUES (?, ?, ?, ?)')
			.bind(new Date().toISOString(), source, 0, message.slice(0, 2000))
			.run();
	} catch {
		// Diagnostics must never affect the request.
	}
}
