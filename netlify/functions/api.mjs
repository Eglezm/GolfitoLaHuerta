// API de Golfito La Huerta (Netlify Functions + Netlify Blobs)
//   GET  /api/ping                      → { ok: true }
//   POST /api/game  { player, tee }     → crea una partida con código de 4 letras (mismo viento y salidas para todos)
//   POST /api/game/CODE/join { player } → entra a la partida
//   POST /api/game/CODE/score { player, scores } → guarda los golpes del jugador hoyo por hoyo
//   POST /api/game/CODE/ball { player, ball } → posición de la bola y trayectoria del último tiro
//   GET  /api/game/CODE                 → partida, jugadores (tarjeta en vivo) y bolas
//   POST /api/round { player, tee, scores } → ronda completa al ranking compartido
//   GET  /api/ranking                   → ranking compartido
import { getStore } from '@netlify/blobs';

const HOLES = 9, MAX_PLAYERS = 8, LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const cleanName = n => typeof n === 'string' ? n.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) : '';
const keyName = n => encodeURIComponent(n.toLowerCase());
const cleanScores = s => Array.isArray(s) ? s.slice(0, HOLES).map(v => v == null ? null : Number.isInteger(v) && v >= 1 && v <= 20 ? v : undefined) : null;

export function makeHandler(store) {
  return async req => {
    const url = new URL(req.url), parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch (e) { return json({ error: 'JSON inválido' }, 400); } }
    const [a, code, b] = parts;

    if (a === 'ping') return json({ ok: true });

    if (a === 'game' && req.method === 'POST' && !code) {
      const player = cleanName(body.player); if (!player) return json({ error: 'Falta el nombre' }, 400);
      const tee = [0, 1, 2].includes(body.tee) ? body.tee : 1;
      let c = '';
      for (let k = 0; k < 20; k++) {
        c = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
        if (!(await store.get(`g/${c}/meta`))) break;
      }
      const meta = { code: c, host: player, tee, windDir: Math.random() * Math.PI * 2, windSpeed: 0.5 + Math.random() * 4.5, created: new Date().toISOString() };
      await store.setJSON(`g/${c}/meta`, meta);
      await store.setJSON(`g/${c}/p/${keyName(player)}`, { name: player, scores: [], updated: Date.now() });
      return json(meta);
    }

    if (a === 'game' && code) {
      if (!/^[A-Z]{4}$/.test(code)) return json({ error: 'Código inválido' }, 400);
      const meta = await store.get(`g/${code}/meta`, { type: 'json' });
      if (!meta) return json({ error: 'No existe esa partida' }, 404);
      const listPlayers = async () => {
        const { blobs } = await store.list({ prefix: `g/${code}/p/` });
        return (await Promise.all(blobs.map(x => store.get(x.key, { type: 'json' })))).filter(Boolean);
      };
      if (req.method === 'GET' && !b) {
        const { blobs } = await store.list({ prefix: `g/${code}/b/` });
        const balls = (await Promise.all(blobs.map(x => store.get(x.key, { type: 'json' })))).filter(Boolean);
        return json({ ...meta, players: await listPlayers(), balls });
      }
      if (req.method === 'POST' && b === 'ball') {
        const player = cleanName(body.player), bl = body.ball || {};
        const num = v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 5000;
        const path = Array.isArray(bl.path) ? bl.path.slice(0, 160) : [];
        if (!player || !Number.isInteger(bl.hole) || bl.hole < 0 || bl.hole >= HOLES || !num(bl.x) || !num(bl.z) || !Number.isInteger(bl.shot) || bl.shot < 0
          || !path.every(q => Array.isArray(q) && q.length === 4 && q.every(num))) return json({ error: 'Bola inválida' }, 400);
        if (!(await store.get(`g/${code}/p/${keyName(player)}`))) return json({ error: 'No estás en esta partida' }, 404);
        await store.setJSON(`g/${code}/b/${keyName(player)}`, { name: player, hole: bl.hole, x: bl.x, z: bl.z, shot: bl.shot, strokes: Number.isInteger(bl.strokes) ? bl.strokes : 0, holed: !!bl.holed, path, t: Date.now() });
        return json({ ok: true });
      }
      if (req.method === 'POST' && (b === 'join' || b === 'score')) {
        const player = cleanName(body.player); if (!player) return json({ error: 'Falta el nombre' }, 400);
        const key = `g/${code}/p/${keyName(player)}`, prev = await store.get(key, { type: 'json' });
        if (b === 'join') {
          if (!prev && (await listPlayers()).length >= MAX_PLAYERS) return json({ error: `La partida ya tiene ${MAX_PLAYERS} jugadores` }, 409);
          if (!prev) await store.setJSON(key, { name: player, scores: [], updated: Date.now() });
          return json({ ...meta, players: await listPlayers() });
        }
        const scores = cleanScores(body.scores); if (!scores || scores.includes(undefined)) return json({ error: 'Golpes inválidos' }, 400);
        if (!prev) return json({ error: 'No estás en esta partida' }, 404);
        await store.setJSON(key, { name: prev.name, scores, updated: Date.now() });
        return json({ ok: true });
      }
    }

    if (a === 'round' && req.method === 'POST') {
      const player = cleanName(body.player), scores = cleanScores(body.scores);
      if (!player || !scores || scores.length !== HOLES || scores.some(v => v == null || v === undefined)) return json({ error: 'Ronda incompleta' }, 400);
      const tee = [0, 1, 2].includes(body.tee) ? body.tee : 1, date = new Date().toISOString();
      await store.setJSON(`r/${date}-${Math.random().toString(36).slice(2, 8)}`, { player, tee, scores, total: scores.reduce((s, v) => s + v, 0), date, game: /^[A-Z]{4}$/.test(body.game || '') ? body.game : null });
      return json({ ok: true });
    }

    if (a === 'ranking' && req.method === 'GET') {
      const { blobs } = await store.list({ prefix: 'r/' });
      const rounds = (await Promise.all(blobs.map(x => store.get(x.key, { type: 'json' })))).filter(Boolean);
      return json({ rounds });
    }
    return json({ error: 'No encontrado' }, 404);
  };
}

export default async req => makeHandler(getStore({ name: 'golfito', consistency: 'strong' }))(req);
export const config = { path: '/api/*' };
