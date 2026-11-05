# BolaBombaVR (Bola-Bomba)

Ping pong em VR para o Meta Quest 3, no navegador do óculos (WebXR), em que a bola é uma bomba
com pavio aceso. Se a bomba explodir enquanto está do seu lado da mesa, o ponto é do adversário;
do lado dele, o ponto é seu. Errar a bola continua valendo ponto normal. Torneio em escada contra
5 adversários, cada um com uma bomba diferente, numa pedreira de fogos de artifício ao entardecer.
Também joga no PC com o mouse. Tudo em português. Feito a partir do `PingPongVR`.

## Como rodar / jogar

**No PC:** `python serve.py` nesta pasta e abrir `http://localhost:8852` (o painel de
visualização usa isso pelo `.claude/launch.json`). Use o `serve.py`, e não o `python -m http.server`:
ele manda o navegador não guardar cache.

**No Quest (quando for publicado):** https://parappathe.github.io/BolaBombaVR/ e "Entrar em VR".
Para publicar: commitar e rodar `python publicar.py BolaBombaVR` em `C:\claude code` (só quando o
Eduardo pedir). Ainda **não publicado**.

**No Quest pela rede de casa (alternativa):** dois cliques em `jogar-no-quest.bat` (ou
`python serve.py --https`), abrir no Quest o endereço `https://192.168.x.x:8443` que a janela
mostra, aceitar o aviso de certificado e "Entrar em VR". No Quest do Eduardo esse caminho não
funcionou nos outros jogos (o navegador tratava o endereço como pesquisa).

### Controles

| | VR (Quest) | PC |
|---|---|---|
| Raquete | Na mão direita (ou esquerda, nas Opções). Velocidade e ângulo da batida definem força, direção e efeito | Segue o mouse num plano à frente da mesa |
| Sacar | Gatilho da mão livre (ou A/X) joga a bola para cima; aí bate com a raquete | Clique joga a bola; clique de novo para bater |
| Cortada | Bater forte (queima mais pavio) | Segurar o botão do mouse na hora da batida |
| Mira | A raquete | Lado da raquete que acerta a bola |
| Pausa | B ou Y | Esc ou P |
| Menu | Apontar com o controle e gatilho | Clique |
| FPS | Opções → Mostrar FPS | Tecla F |

No menu de pausa do VR tem "Recentralizar" (põe você atrás da mesa); também é feito sozinho ao
entrar no VR.

### Regras

- A bomba acende no saque. Pavio inicial de 5 a 9,5 s, conforme o adversário (sorteado a cada
  ponto). Cada batida queima 0,2 a 0,25 s a mais, e mais ainda se for forte (cerca de 0,1 s por
  m/s acima de 7 m/s).
- Explodiu com a bola do seu lado (z > 0): ponto do adversário. Do lado dele: ponto seu. Exceção:
  se a última batida já ia cair fora (ou na rede) e a bola ainda não quicou, vale o erro.
- Errou a bola: ponto normal, e a bomba apaga.
- Como a bomba avisa: a bola vai do grafite ao vermelho, pisca cada vez mais rápido, faísca no
  pavio, tique-taque que acelera e a barra do pavio embaixo do placar.
- Partida de 1 set até 7 com 2 de vantagem (ou melhor de 3, nas Opções). Saque troca a cada 2
  pontos e, no 6 x 6, a cada ponto. Saque simplificado como no PingPongVR (direto para o outro
  lado; rede no saque e bola certa repete).
- Torneio: vencer o adversário libera o próximo. Progresso e opções no localStorage, chave
  `bolabombavr.v1`.

Adversários (`OPPONENTS` em `js/ai.js`):

1. **Tonico Pavio** (pavio longo): iniciante, pavio de 8,5 a 9,5 s.
2. **Dona Balão** (bola alta): devolve alto e lento quando dá tempo, para a bomba estourar do seu
   lado.
3. **Faísca** (pavio curto): pavio de 5,8 a 6,6 s e batidas rápidas.
4. **Mágico Blefe** (bomba falsa): a bomba às vezes pisca e acelera o tique-taque como se fosse
   explodir e não explode (o marcador também mente); outras vezes o pavio queima 2,4 vezes mais
   rápido por um instante.
5. **Rainha Dinamite** (bomba dupla, a campeã): quando o primeiro pavio acaba, dá um estalo sem
   ponto e reacende com mais 3 s; o placar mostra as duas cargas.

A IA olha o pavio: com menos de 2,2 s devolve rápido e fundo; com tempo sobrando joga mais
devagar e preciso (queima menos); quem tem `lob` devolve alto e lento quando faltam menos de 6 s.

## Como testar

- `node tests/run.js` (ou `npm test`): física, regras, bomba (pavio, batida forte queima mais,
  bomba dupla, blefe, aceleração), explosão em cada lado dentro da partida, ponto normal apaga a
  bomba, IA com pressa bate mais rápido, partida até 7, e partidas IA x IA (terminam, a Rainha
  Dinamite ganha do Tonico, a bomba decide parte dos pontos). Tem que terminar com "Tudo certo".
  Não toca som.
- No navegador: abrir `http://localhost:8852/?mudo` (o `?mudo` nunca liga o som) e, no console,
  `bbvr.startMatch(0); bbvr.dev.autoplay = true; bbvr.dev.advance(60); bbvr.dev.state()`.
  `advance` roda segundos de jogo na hora (o painel escondido não anima); o autoplay não erra, então
  não mede dificuldade.
- **Só no óculos:** raquete na mão, sensação da batida, ver a cor/piscada da bomba no meio do
  rally, vibração, conforto, desempenho (meta 72 FPS).

## Estrutura

| Arquivo | O que tem |
|---|---|
| `index.html`, `css/style.css` | Página, botão "Entrar em VR", dica e FPS do modo PC |
| `js/physics.js` | Física da bola (igual ao PingPongVR). Sem navegador |
| `js/bomb.js` | A bomba: pavio, queima por batida, blefe, aceleração, bomba dupla, o que ela mostra. Sem navegador |
| `js/match.js` | Regras do ponto e do placar. Sem navegador |
| `js/ai.js` | Os 5 adversários (estilo e bomba de cada um) e a IA que olha o pavio. Sem navegador |
| `js/game.js` | `GameCore`: partida em passos de 1/240 s, liga a bomba e decide o ponto na explosão. Sem navegador |
| `js/main.js` | Renderização, controles do Quest, mouse, menus, placar, sons, efeitos, `window.bbvr` |
| `js/scene.js` | Pedreira, mesa sobre caixotes, placar com marcador do pavio, torcida, bola-bomba, partículas (faíscas, explosão, fogos no céu) |
| `js/ui.js` | Painel de menu 3D (canvas) |
| `js/audio.js` | Sons sintetizados (batida, tique-taque, estrondo, estalo) e a musiquinha |
| `js/tournament.js` | Progresso e opções salvos |
| `serve.py`, `jogar-no-quest.bat` | Servidor local sem cache; `--https` para o Quest na rede |
| `tests/run.js` | Testes automáticos |
| `vendor/three/three.module.js` | Three.js r170 (cópia local) |

Coordenadas: metros, mesa centrada na origem, jogador no lado +Z, adversário no -Z, rede em z = 0,
tampo a 0,76 m.

## Regras e convenções do projeto

- `physics.js`, `bomb.js`, `match.js`, `ai.js` e `game.js` não usam navegador nem Three.js (os
  testes rodam no Node). Mexeu neles: `node tests/run.js`.
- Ajustar uma bomba: campo `bomb` do adversário em `js/ai.js` (`fuse`, `hitBurn`, `speedBurn`,
  `fake`, `surge`, `relight`; explicados no topo de `js/bomb.js`).
- Nunca mexer na câmera no VR (nem tremor na explosão): conforto.
- Testes e navegador de teste sem som (`?mudo`).

## Decisões

- Pavio de 6 a 9 s com queima por batida: nas partidas IA x IA a bomba decide de 0% (Rainha x
  Tonico, que acaba rápido) a cerca de 40% dos pontos, com 5 a 6 batidas por ponto entre iguais.
  Assim tem rally e tensão no fim, sem a bomba decidir tudo.
- Bola que ia fora e explode do outro lado vale o erro: senão uma batida errada seria premiada.
- Bomba falsa mente também no marcador do placar: se o marcador mostrasse a verdade, o blefe não
  enganaria ninguém. A IA sabe o pavio de verdade.
- Explosão sem tremer a câmera: só clarão, partículas, som e vibração forte nas duas mãos.
- A bola-bomba é desenhada 15% maior que a física (que continua sendo a de uma bola de ping
  pong), para enxergar a cor e a piscada.
- Partida até 7 (e não 11): cada ponto é mais tenso e longo.

## Pendências / problemas conhecidos

- Nada testado no Quest ainda: raquete na mão, força das batidas, se dá para ler a bomba no meio
  do rally, vibração, FPS.
- Dificuldade contra pessoa não medida (o autoplay não erra).
- Não publicado no GitHub Pages; quando for, acrescentar o cartão no `SiteJogos`.
