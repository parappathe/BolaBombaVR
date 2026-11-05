// Testes automáticos: node tests/run.js  (tem que terminar com "Tudo certo")
import { TABLE, BALL_R, DT, makeBall, stepBall, paddleHit, solveShot, landing, spinFor, assistShot } from '../js/physics.js';
import { Rally, Match } from '../js/match.js';
import { AIPlayer, OPPONENTS } from '../js/ai.js';
import { GameCore } from '../js/game.js';
import { Bomb } from '../js/bomb.js';

let fails = 0, count = 0;
function ok(cond, msg) {
  count++;
  if (!cond) { fails++; console.log('  FALHOU: ' + msg); }
}
function section(name) { console.log(name); }

// Gerador aleatório com semente, para os testes darem sempre o mesmo resultado.
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function run(b, seconds, ev) { for (let t = 0; t < seconds; t += DT) stepBall(b, DT, ev); }

section('Física');
{
  // Queda de 30 cm acima da mesa: quica e volta a uns 80% da altura.
  const b = makeBall(); b.py = TABLE.y + 0.3 + BALL_R; b.pz = 0.5;
  const ev = []; let maxAfter = 0, bounced = false;
  for (let t = 0; t < 1; t += DT) {
    const n = ev.length; stepBall(b, DT, ev);
    if (ev.length > n && ev[n].type === 'table') bounced = true;
    if (bounced) maxAfter = Math.max(maxAfter, b.py - BALL_R - TABLE.y);
  }
  ok(bounced, 'bola deveria quicar na mesa');
  ok(maxAfter > 0.2 && maxAfter < 0.28, `altura do quique ${maxAfter.toFixed(3)} fora de 0.20..0.28`);
  ok(ev[0].side === 0, 'quique em z>0 deveria ser no lado do jogador');
}
{
  // Bola baixa e reta bate na rede e não passa.
  const b = makeBall(); b.py = TABLE.y + 0.08; b.pz = 0.6; b.vz = -6; b.vy = 0.3;
  const ev = []; run(b, 0.5, ev);
  ok(ev.some(e => e.type === 'net'), 'bola baixa deveria bater na rede');
  ok(b.pz > -0.05, 'bola baixa não deveria atravessar a rede');
}
{
  // Topspin faz cair antes; backspin faz ir mais longe.
  const shoot = (top) => {
    const b = makeBall(); b.py = 1.0; b.pz = 1.6; b.vz = -8; b.vy = 1.2;
    const w = spinFor(0, -1, top, 0); b.wx = w.wx; b.wy = w.wy; b.wz = w.wz;
    return landing(b, -1, 0, -1).s;
  };
  ok(shoot(120) < shoot(0) && shoot(0) < shoot(-120), 'topspin deveria encurtar e backspin alongar a bola');
}
{
  // Bola rápida contra raquete rápida não atravessa (colisão contínua).
  const b = makeBall(); b.py = 1; b.pz = 1.2; b.vz = 15;
  const pad = { r: 0.075, vx: 0, vy: 0, vz: -10 };
  let hit = false; let pz = 1.6;
  for (let i = 0; i < 40 && !hit; i++) {
    const prev = { px: b.px, py: b.py, pz: b.pz };
    stepBall(b, DT);
    const nz = pz - 10 * DT;
    Object.assign(pad, { ax: 0, ay: 1, az: pz, anx: 0, any: 0, anz: 1, bx: 0, by: 1, bz: nz, bnx: 0, bny: 0, bnz: 1 });
    pz = nz;
    hit = paddleHit(b, prev, pad);
  }
  ok(hit, 'raquete deveria acertar a bola rápida');
  ok(b.vz < -15, `bola deveria voltar rápida (vz=${b.vz.toFixed(1)})`);
}
{
  // Raquete inclinada com movimento para cima gera topspin.
  const b = makeBall(); b.py = 0.95; b.pz = 1.5; b.vz = 6;
  const prev = { px: 0, py: 0.95, pz: 1.5 - 6 * DT };
  b.pz = 1.5 + 0.005;
  const pad = { r: 0.075, vx: 0, vy: 4, vz: -3, ax: 0, ay: 0.95, az: 1.505, bx: 0, by: 0.95, bz: 1.505, anx: 0, any: 0, anz: 1, bnx: 0, bny: 0, bnz: 1 };
  paddleHit(b, prev, pad);
  ok(b.wx < -20, `raspar a bola para cima deveria dar topspin para quem recebe do outro lado (wx=${b.wx.toFixed(0)})`);
}
{
  // O resolvedor de jogada acerta o alvo, com e sem efeito.
  for (const [top, side] of [[0, 0], [100, 0], [-80, 0], [60, 80]]) {
    const w = spinFor(0, -1, top, side);
    const v = solveShot(0.2, 1.0, 1.6, -0.4, -0.9, 8, w.wx, w.wy, w.wz);
    const b = makeBall(); Object.assign(b, { px: 0.2, py: 1.0, pz: 1.6, vx: v.vx, vy: v.vy, vz: v.vz, ...w });
    const ev = []; run(b, 1.5, ev);
    const t = ev.find(e => e.type === 'table');
    ok(v.ok && t && Math.hypot(t.x + 0.4, t.z + 0.9) < 0.06, `jogada com efeito (${top},${side}) deveria cair em (-0.4,-0.9), caiu ${t ? t.x.toFixed(2) + ',' + t.z.toFixed(2) : 'fora'}`);
  }
}

{
  // Ajuda na mira: batidas ruins (longa, na rede, aberta) entram com ajuda alta; boa não muda.
  const firstBounce = (v) => {
    const b = makeBall(); Object.assign(b, { px: 0.1, py: 0.95, pz: 1.55, ...v });
    const ev = []; run(b, 2, ev);
    return ev.find(e => e.type === 'table' || e.type === 'floor');
  };
  const cases = { longa: { vx: 0, vy: 2.5, vz: -12 }, rede: { vx: 0, vy: -1.5, vz: -9 }, aberta: { vx: 3, vy: 1, vz: -8 } };
  for (const [name, v] of Object.entries(cases)) {
    const raw = firstBounce(v);
    ok(!(raw.type === 'table' && raw.side === 1), `caso de teste "${name}" deveria errar sem ajuda`);
    const b = makeBall(); Object.assign(b, { px: 0.1, py: 0.95, pz: 1.55, ...v });
    assistShot(b, 1);
    const fixed = firstBounce({ vx: b.vx, vy: b.vy, vz: b.vz });
    ok(fixed.type === 'table' && fixed.side === 1, `batida "${name}" com ajuda total deveria cair na mesa do adversário`);
  }
  const good = makeBall(); Object.assign(good, { px: 0.1, py: 0.95, pz: 1.55 });
  const sv = solveShot(0.1, 0.95, 1.55, 0.3, -0.8, 8); Object.assign(good, { vx: sv.vx, vy: sv.vy, vz: sv.vz });
  ok(!assistShot(good, 1), 'batida boa não deveria ser alterada pela ajuda');
}

section('Regras');
{
  const r = new Rally(0);
  ok(r.onHit(0) === null, 'saque válido');
  ok(r.onTable(1) === null, 'saque cai do outro lado');
  ok(r.onHit(1) === null, 'devolução');
  const res = r.onTable(1);
  ok(res && res.winner === 0 && res.reason === 'quicou no próprio lado', 'quicar no próprio lado é ponto do outro');
}
{
  const r = new Rally(1); r.onHit(1); r.onTable(0); const res = r.onTable(0);
  ok(res && res.winner === 1, 'dois quiques sem devolver: ponto de quem bateu');
}
{
  const r = new Rally(0); r.onHit(0); const res = r.onFloor();
  ok(res && res.winner === 1, 'bola direto no chão: ponto do outro');
}
{
  const r = new Rally(0); r.onHit(0); r.onNet(); const res = r.onTable(1);
  ok(res && res.let, 'saque que toca a rede e entra: repete');
}
{
  const r = new Rally(0); r.onHit(0);
  ok(r.onHit(1, true).winner === 1, 'voleio em bola que ia sair: ponto de quem pegou');
  const r2 = new Rally(0); r2.onHit(0);
  ok(r2.onHit(1, false).winner === 0, 'voleio em bola que ia entrar: ponto de quem bateu');
}
{
  const m = new Match({ firstServer: 0 });
  const servers = [];
  for (let i = 0; i < 6; i++) { servers.push(m.server); m.addPoint(i % 2); }
  ok(servers.join('') === '001100', `saque a cada 2 pontos (${servers.join('')})`);
  const d = new Match({ firstServer: 0 });
  for (let i = 0; i < 10; i++) { d.addPoint(0); d.addPoint(1); }
  const s1 = d.server; d.addPoint(0); const s2 = d.server;
  ok(s1 !== s2, 'no 10 x 10 o saque troca a cada ponto');
  ok(!d.over, '11 x 10 não termina');
  d.addPoint(0);
  ok(d.over && d.winner === 0, '12 x 10 termina');
  const b3 = new Match({ bestOf: 3, firstServer: 0 });
  for (let i = 0; i < 11; i++) b3.addPoint(1);
  ok(!b3.over && b3.games[1] === 1 && b3.server === 1, 'melhor de 3: segundo game começa com o outro sacando');
}

section('IA e partida');
{
  // Cada adversário consegue devolver uma bola normal.
  for (const p of OPPONENTS) {
    let returned = 0;
    const rng = seeded(7);
    for (let k = 0; k < 20; k++) {
      const ai = new AIPlayer(p, -1, rng);
      const b = makeBall();
      const tx = (rng() * 2 - 1) * 0.5, tz = -0.5 - rng() * 0.7;
      const v = solveShot(0, 1.0, 1.6, tx, tz, 7);
      Object.assign(b, { px: 0, py: 1.0, pz: 1.6, vx: v.vx, vy: v.vy, vz: v.vz });
      ai.planFor(b);
      const ev = [];
      let landed = null;
      for (let t = 0; t < 3; t += DT) {
        stepBall(b, DT, ev);
        const s = ai.tick(DT, b);
        if (s) { Object.assign(b, s); ev.length = 0; landed = 'hit'; }
        if (landed === 'hit') { const e = ev.find(e => e.type === 'table' || e.type === 'floor'); if (e) { landed = e.type === 'table' && e.side === 0 ? 'in' : 'out'; break; } }
      }
      if (landed === 'in') returned++;
    }
    ok(returned >= 12, `${p.name} devolveu ${returned}/20 bolas normais`);
  }
}
section('Bomba');
{
  // Sem batidas, o pavio dura o sorteado e explode uma vez só.
  const bomb = new Bomb({ fuse: [7, 7] }, seeded(1));
  ok(!bomb.lit && bomb.tick(DT) === null, 'bomba apagada não queima');
  bomb.light();
  let t = 0, ev = null;
  while (t < 20 && ev !== 'boom') { ev = bomb.tick(DT); t += DT; }
  ok(ev === 'boom' && Math.abs(t - 7) < 0.02, `pavio de 7 s explodiu em ${t.toFixed(2)} s`);
  ok(bomb.tick(DT) === null && bomb.exploded, 'depois de explodir, não explode de novo');
}
{
  // Batida forte queima mais pavio que batida fraca.
  const a = new Bomb({ fuse: [7, 7] }, seeded(2)); a.light();
  const b = new Bomb({ fuse: [7, 7] }, seeded(2)); b.light();
  const fraca = a.onHit(5), forte = b.onHit(13);
  ok(forte > fraca + 0.3, `batida forte deveria queimar mais (${fraca.toFixed(2)} x ${forte.toFixed(2)} s)`);
  const c = new Bomb({ fuse: [1, 1] }, seeded(3)); c.light(); c.onHit(30);
  ok(c.fuse > 0 && c.tick(DT) === 'boom', 'batida que acaba o pavio explode no passo seguinte');
}
{
  // Bomba dupla: estalo no fim do primeiro pavio, explosão só no fim do segundo.
  const bomb = new Bomb({ fuse: [4, 4], relight: 3 }, seeded(4)); bomb.light();
  const evs = []; let t = 0;
  while (t < 10 && !bomb.exploded) { const e = bomb.tick(DT); t += DT; if (e) evs.push([e, t]); }
  ok(evs.length === 2 && evs[0][0] === 'pop' && Math.abs(evs[0][1] - 4) < 0.02 && evs[1][0] === 'boom' && Math.abs(evs[1][1] - 7) < 0.02,
    `bomba dupla: ${evs.map(e => e[0] + '@' + e[1].toFixed(2)).join(', ')}`);
}
{
  // Bomba falsa: em algum momento mostra quase zero sem estar perto de explodir.
  const bomb = new Bomb({ fuse: [8, 8], fake: true }, seeded(5)); bomb.light();
  let blefe = false;
  for (let t = 0; t < 5; t += DT) { bomb.tick(DT); const sh = bomb.shown(); if (sh.fake && sh.secs < 1 && bomb.fuse > 2.5) blefe = true; }
  ok(blefe, 'bomba falsa deveria fingir que vai explodir');
  ok(!bomb.exploded, 'bomba falsa não explode antes da hora');
  // Aceleração: o pavio acaba antes do normal.
  const sg = new Bomb({ fuse: [8, 8], surge: true }, seeded(6)); sg.light();
  let t = 0; while (!sg.exploded && t < 20) { sg.tick(DT); t += DT; }
  ok(t < 7.9, `pavio que acelera deveria acabar antes de 8 s (${t.toFixed(2)} s)`);
}
{
  // Explosão em cada lado da mesa, dentro da partida.
  const setup = (z, opts = {}) => {
    const rng = seeded(11);
    let pt = null, boom = null;
    const core = new GameCore({ opponent: OPPONENTS[0], playerAI: new AIPlayer(OPPONENTS[0], 1, rng), rng, firstServer: 1,
      onEvent: (t, d) => { if (t === 'point') pt = d; if (t === 'explode') boom = d; } });
    let n = 0;
    while (core.state !== 'rally' && n++ < 240 * 5) core.step();
    for (const a of core.ai) a.plan = null;
    Object.assign(core.ball, { px: 0, py: 1.6, pz: z, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 });
    core.rally.bounces = opts.bounces ?? 1;
    core.rally.lastHitter = opts.lastHitter ?? (z > 0 ? 1 : 0);
    core.doomed = opts.doomed ?? false;
    core.bomb.fuse = 0.02;
    for (let k = 0; k < 20 && !pt; k++) core.step();
    return { pt, boom, core };
  };
  const a = setup(0.6);
  ok(a.boom && a.pt && a.pt.winner === 1 && a.pt.explode, 'bomba explodindo do lado do jogador: ponto do adversário');
  const b = setup(-0.6);
  ok(b.boom && b.pt && b.pt.winner === 0, 'bomba explodindo do lado do adversário: ponto do jogador');
  const c = setup(-0.6, { bounces: 0, lastHitter: 0, doomed: true });
  ok(c.pt && c.pt.winner === 1, 'bola que ia cair fora explode do outro lado: vale o erro, ponto de quem ia receber');
  ok(a.core.match.score[1] === 1 && b.core.match.score[0] === 1, 'explosão conta no placar');
}
{
  // Errar a bola continua valendo ponto normal, e a bomba apaga (não explode depois).
  let evs = [];
  for (let seed = 12; seed < 40; seed++) {
    const rng = seeded(seed);
    evs = [];
    const core = new GameCore({ opponent: OPPONENTS[0], playerAI: new AIPlayer(OPPONENTS[0], 1, rng), rng, firstServer: 1, onEvent: (t, d) => evs.push([t, d]) });
    let n = 0;
    while (core.state !== 'rally' && n++ < 240 * 5) core.step();
    for (const a of core.ai) a.plan = null;
    core.ai[0].planFor = () => {}; // o jogador não devolve
    while (core.state === 'rally' && n++ < 240 * 10) core.step();
    if (evs.some(e => e[0] === 'table' && e[1].side === 0)) break; // saque entrou: serve para o teste
  }
  const p = evs.find(e => e[0] === 'point');
  ok(p && !p[1].explode && p[1].winner === 1, 'bola não devolvida: ponto normal de quem bateu');
  ok(evs.some(e => e[0] === 'fizzle') && !evs.some(e => e[0] === 'explode'), 'ponto normal apaga a bomba');
}
{
  // A IA com pouco pavio devolve mais rápido e mais fundo que com pavio sobrando.
  const avg = (fuse) => {
    const rng = seeded(21); let sp = 0, dz = 0, n = 0;
    for (let k = 0; k < 60; k++) {
      const ai = new AIPlayer(OPPONENTS[1], -1, rng); ai.fuseLeft = fuse;
      const b = makeBall(); Object.assign(b, { px: 0, py: 1.0, pz: -1.7 });
      const v = ai.shot(b, 0);
      sp += Math.hypot(v.vx, v.vz); n++;
    }
    return sp / n;
  };
  const pressa = avg(1.2), calma = avg(5);
  ok(pressa > calma + 1.5, `com pouco pavio a IA deveria bater mais rápido (${pressa.toFixed(1)} x ${calma.toFixed(1)} m/s)`);
}
{
  const m = new Match({ pointsToWin: 7, firstServer: 0 });
  for (let i = 0; i < 6; i++) { m.addPoint(0); m.addPoint(1); }
  m.addPoint(0);
  ok(!m.over, '7 x 6 não termina (2 de vantagem)');
  m.addPoint(0);
  ok(m.over && m.winner === 0, '8 x 6 termina');
}

section('Partidas IA x IA');
{
  const results = [];
  let allPts = 0, allBoom = 0;
  for (const [a, b] of [[4, 0], [2, 1], [3, 3]]) {
    let winsA = 0, totalHits = 0, points = 0, booms = 0;
    for (let m = 0; m < 4; m++) {
      const rng = seeded(100 + m);
      const core = new GameCore({ opponent: OPPONENTS[b], playerAI: new AIPlayer(OPPONENTS[a], 1, rng), rng,
        onEvent: (t) => { if (t === 'hit') totalHits++; if (t === 'point') points++; if (t === 'explode') booms++; } });
      let steps = 0;
      while (core.state !== 'matchOver' && steps < 240 * 60 * 30) { core.step(); steps++; }
      ok(core.state === 'matchOver', 'partida IA x IA deveria terminar');
      if (core.match.winner === 0) winsA++;
    }
    allPts += points; allBoom += booms;
    results.push(`${OPPONENTS[a].name} x ${OPPONENTS[b].name}: ${winsA}/4, ${(totalHits / points).toFixed(1)} batidas por ponto, ${(100 * booms / points).toFixed(0)}% dos pontos na explosão`);
    if (a !== 4 || b !== 0) ok(totalHits / points > 3, `rallies muito curtos em ${OPPONENTS[a].name} x ${OPPONENTS[b].name}`);
    if (a === 4 && b === 0) ok(winsA >= 3, 'A Rainha Dinamite deveria ganhar do Tonico Pavio quase sempre');
  }
  ok(allBoom / allPts > 0.08 && allBoom / allPts < 0.7, `a bomba deveria decidir parte dos pontos (${(100 * allBoom / allPts).toFixed(0)}%)`);
  console.log('  ' + results.join('\n  '));
}

console.log(fails ? `\n${fails} de ${count} verificações falharam.` : `\nTudo certo (${count} verificações).`);
process.exit(fails ? 1 : 0);
