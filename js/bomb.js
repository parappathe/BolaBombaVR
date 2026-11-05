// A bomba: pavio que queima durante o ponto. Não depende de navegador.
// Regra: quando o pavio acaba, a bomba explode e perde o ponto quem estiver com ela do seu
// lado da mesa (z > 0 é o lado do jogador). Cada batida queima um pedaço extra do pavio,
// e quanto mais forte a batida, mais queima.
//
// Configuração (vem do adversário, campo `bomb`):
//   fuse: [min, max]  duração inicial do pavio em segundos (sorteada a cada ponto)
//   hitBurn           segundos queimados em toda batida
//   speedBurn         segundos extras por m/s acima de 7 m/s
//   fake              bomba falsa: de vez em quando pisca e acelera o tique-taque como se
//                     fosse explodir, mas é só aparência (o pavio de verdade segue igual)
//   surge             às vezes o pavio queima 2,4 vezes mais rápido por um instante
//   relight           bomba dupla: quando o primeiro pavio acaba, dá um estalo (sem ponto)
//                     e reacende com este tanto de segundos; a explosão de verdade é a segunda

const lerp = (a, b, t) => a + (b - a) * t;
export const SURGE_RATE = 2.4;

export class Bomb {
  constructor(cfg, rng = Math.random) {
    this.cfg = { fuse: [7, 8], hitBurn: 0.2, speedBurn: 0.08, fake: false, surge: false, relight: 0, ...cfg };
    this.rng = rng;
    this.reset();
  }

  // Bomba nova, apagada, pronta para o próximo ponto.
  reset() {
    const c = this.cfg;
    this.full = lerp(c.fuse[0], c.fuse[1], this.rng());
    this.fuse = this.full;
    this.stageFull = this.full;
    this.charges = c.relight > 0 ? 2 : 1;
    this.lit = false;
    this.rate = 1;
    this.surgeT = 0;
    this.fakeT = 0;
    this.exploded = false;
  }

  light() { this.lit = true; }
  defuse() { this.lit = false; }

  // Segundos até a explosão de verdade (sem contar aceleração e batidas futuras).
  timeLeft() {
    if (this.exploded) return 0;
    return Math.max(0, this.fuse) + (this.charges > 1 ? this.cfg.relight : 0);
  }

  // Batida: queima pavio. Devolve quanto queimou.
  onHit(speed) {
    if (!this.lit) return 0;
    const burn = this.cfg.hitBurn + Math.max(0, speed - 7) * this.cfg.speedBurn;
    this.fuse = Math.max(0.004, this.fuse - burn); // explode no passo seguinte, nunca na batida
    return burn;
  }

  // Um passo. Devolve 'boom' (explodiu), 'pop' (estalo da bomba dupla), 'surge' (começou a
  // acelerar), 'fake' (começou um blefe) ou null.
  tick(dt) {
    if (!this.lit) return null;
    const c = this.cfg;
    let ev = null;
    if (this.surgeT > 0) this.surgeT -= dt;
    else if (c.surge && this.fuse > 1.6 && this.rng() < dt * 0.14) { this.surgeT = lerp(1.0, 1.6, this.rng()); ev = 'surge'; }
    this.rate = this.surgeT > 0 ? SURGE_RATE : 1;
    if (this.fakeT > 0) this.fakeT -= dt;
    else if (c.fake && this.fuse > 2.6 && this.rng() < dt * 0.2) { this.fakeT = lerp(0.9, 1.4, this.rng()); ev = 'fake'; }
    this.fuse -= dt * this.rate;
    if (this.fuse <= 0) {
      if (this.charges > 1) {
        this.charges--;
        this.fuse = this.stageFull = c.relight;
        this.surgeT = 0; this.fakeT = 0;
        return 'pop';
      }
      this.fuse = 0;
      this.lit = false;
      this.exploded = true;
      return 'boom';
    }
    return ev;
  }

  // O que a bomba mostra (cor, piscada, tique-taque, marcador): no blefe mostra quase zero.
  shown() {
    const secs = this.fakeT > 0 ? Math.min(this.fuse, 0.45 + this.fakeT * 0.2) : this.fuse;
    return {
      secs, frac: Math.max(0, Math.min(1, secs / this.stageFull)),
      charges: this.charges, lit: this.lit, surge: this.surgeT > 0, fake: this.fakeT > 0, exploded: this.exploded,
    };
  }
}
