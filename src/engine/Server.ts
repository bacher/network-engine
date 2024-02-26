import throttle from 'lodash-es/throttle';

import { CyclicCounter } from '../utils/CyclicCounter.ts';
import { lerpPosition } from '../utils/lerp.ts';

import { NetworkInterface } from './network.ts';
import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
  ClientMessagePlayerPositionUpdate,
} from './types.ts';
import {
  CLIENT_UPDATES_INTERVAL,
  CLIENT_UPDATES_RATE,
  SERVER_INITIAL_BUFFER_OFFSET,
  SERVER_UPDATES_INTERVAL,
  SKIP_TICK_INTERPOLATION_STEP,
  SKIP_TICK_PREPARATION_TICKS,
} from './consts.ts';
import { IntervalTimer } from './timers.ts';

type ServerNetworkInterface = NetworkInterface<
  ServerNetworkMessage,
  ClientNetworkMessage
>;

type PlayerUpdate = ClientMessagePlayerPositionUpdate['data'];

type ServerPlayerRepresentation = {
  playerId: string;
  playerState: PlayerState;
  lastUpdateTime: number | undefined;
  updateTimeSpreadList: number[];
  updateTimeSpreadListIndex: number;
  updateTimeSpread: number;
  networkInterface: ServerNetworkInterface;
  buffer: PlayerUpdate[];
  closestTickIdInBuffer: number | undefined;
  interpolation: number;
  bufferExtraSizeHistory: CyclicCounter;
};

const COLORS = ['red', 'blue', 'yellow', 'orange'];

const incomingUpdatesCounter = new CyclicCounter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
(window as any)._counter = incomingUpdatesCounter;

const bufferSizeCounter = new CyclicCounter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
(window as any)._extraBufferSizeCounter = bufferSizeCounter;

export class Server {
  onlinePlayers: ServerPlayerRepresentation[] = [];
  lastPlayerId = 0;
  gameLoopIntervalTimer: IntervalTimer | undefined;
  gameState: GameState = {
    players: [],
  };

  attachPlayerLink(networkInterface: ServerNetworkInterface): void {
    this.lastPlayerId += 1;
    const playerId = `id:${this.lastPlayerId}`;

    const playerState: PlayerState = {
      playerId,
      color: COLORS[this.gameState.players.length % COLORS.length],
      position: {
        x: 100 * (Math.random() - 0.5),
        y: 100 * (Math.random() - 0.5),
      },
    };

    const player: ServerPlayerRepresentation = {
      playerId,
      playerState,
      lastUpdateTime: undefined,
      updateTimeSpreadList: Array(CLIENT_UPDATES_RATE).fill(0) as number[],
      updateTimeSpreadListIndex: 0,
      updateTimeSpread: 0,
      networkInterface,
      buffer: [],
      closestTickIdInBuffer: undefined,
      interpolation: 0,
      bufferExtraSizeHistory: new CyclicCounter(SKIP_TICK_PREPARATION_TICKS),
    };

    this.onlinePlayers.push(player);

    this.gameState.players.push(playerState);

    networkInterface.send({
      type: 'INITIAL',
      data: {
        playerId,
        gameState: this.gameState,
      },
    });

    networkInterface.onMessage((message) => {
      this.onPlayerMessage(player, message);
    });
  }

  onPlayerMessage(
    player: ServerPlayerRepresentation,
    message: ClientNetworkMessage,
  ): void {
    switch (message.type) {
      case 'PLAYER_POSITION_UPDATE': {
        player.buffer.push(message.data);

        if (player.closestTickIdInBuffer === undefined) {
          player.closestTickIdInBuffer =
            this.gameLoopIntervalTimer!.getTickId() +
            SERVER_INITIAL_BUFFER_OFFSET;
        }

        if (player.playerId === 'id:1') {
          incomingUpdatesCounter.increase(1);
        }

        const prevUpdateTime = player.lastUpdateTime;
        player.lastUpdateTime = performance.now();
        if (prevUpdateTime) {
          const lastDelta = player.lastUpdateTime - prevUpdateTime;
          const spread = CLIENT_UPDATES_INTERVAL - lastDelta;

          player.updateTimeSpread +=
            -player.updateTimeSpreadList[player.updateTimeSpreadListIndex] +
            spread;

          if (player.playerId === 'id:1') {
            const min = player.updateTimeSpreadList.reduce(
              (acc, value) => Math.min(acc, value),
              0,
            );

            const max = player.updateTimeSpreadList.reduce(
              (acc, value) => Math.max(acc, value),
              0,
            );

            const overallBias = player.updateTimeSpreadList.reduce(
              (acc, value) => acc + value,
            );

            report`${player.playerId}
              min spread: ${min}
              max spread: ${max}
              spread window: ${max - min}
              spread bias: ${(min + max) / 2}
              spread sum bias: ${overallBias}`;
          }

          player.updateTimeSpreadList[player.updateTimeSpreadListIndex] =
            spread;

          player.updateTimeSpreadListIndex += 1;
          if (player.updateTimeSpreadListIndex === CLIENT_UPDATES_RATE) {
            player.updateTimeSpreadListIndex = 0;
          }
        }
        break;
      }
    }
  }

  startGameLoop() {
    this.gameLoopIntervalTimer = new IntervalTimer(
      SERVER_UPDATES_INTERVAL,
      () => {
        this.tick();
      },
    );

    this.gameLoopIntervalTimer.start();
  }

  private tick() {
    incomingUpdatesCounter.next();

    if (this.onlinePlayers.length === 0) {
      return;
    }

    this.applyTickChanges();

    this.broadcastState();
  }

  private applyTickChanges() {
    const tickId = this.gameLoopIntervalTimer!.getTickId();

    for (const player of this.onlinePlayers) {
      // TODO: temporary
      if (player.playerId !== 'id:1') {
        continue;
      }

      if (player.closestTickIdInBuffer === undefined) {
        continue;
      }

      player.bufferExtraSizeHistory.next(
        player.buffer.length - 1 + (player.interpolation ? -1 : 0),
      );

      if (player.buffer.length === 0) {
        console.warn(`empty buffer for player ${player.playerId}`);
        continue;
      }

      if (tickId !== player.closestTickIdInBuffer) {
        if (player.closestTickIdInBuffer < tickId) {
          const shift = Math.max(
            0,
            SERVER_INITIAL_BUFFER_OFFSET - player.buffer.length,
          );
          player.closestTickIdInBuffer = tickId + shift;

          console.error(
            `resetting buffer by ${shift} ticks for ${player.playerId}`,
          );
        } else {
          console.error(
            `closestTickIdInBuffer ${player.closestTickIdInBuffer} != current tick ${tickId} for ${player.playerId}`,
          );
        }

        continue;
      }

      const playerUpdate = player.buffer.shift();

      if (playerUpdate) {
        if (player.interpolation && player.buffer.length === 0) {
          console.warn(
            `resetting interpolation to 0 because of empty buffer for player ${player.playerId}`,
          );
          player.interpolation = 0;
        }

        // player.buffer.length >= 3
        if (!player.interpolation) {
          let haveExtraFrame = true;

          for (const extra of player.bufferExtraSizeHistory.buffer) {
            if (extra < 1) {
              haveExtraFrame = false;
              break;
            }
          }

          if (haveExtraFrame) {
            player.interpolation = SKIP_TICK_INTERPOLATION_STEP;

            for (
              let i = 0;
              i < player.bufferExtraSizeHistory.buffer.length;
              i += 1
            ) {
              player.bufferExtraSizeHistory.buffer[i] -= 1;
            }
          }
        }

        let finalState: PlayerUpdate = playerUpdate;

        if (player.interpolation) {
          const nextUpdate = player.buffer[0];

          finalState = {
            position: lerpPosition(
              playerUpdate.position,
              nextUpdate.position,
              player.interpolation,
            ),
          };

          player.interpolation += SKIP_TICK_INTERPOLATION_STEP;

          if (player.interpolation > 0.999) {
            player.interpolation = 0;
            player.buffer.shift();

            console.log(`drop one buffer item for ${player.playerId}`);
          }
        }

        player.playerState.position = finalState.position;

        if (player.playerId === 'id:1') {
          bufferSizeCounter.next(player.buffer.length);
        }
      } else {
        player.interpolation = 0;
        console.log(`missing player state update for ${player.playerId}`);
      }

      player.closestTickIdInBuffer += 1;
    }
  }

  private broadcastState() {
    const message: ServerNetworkMessage = {
      type: 'GAME_STATE_UPDATE',
      data: {
        gameState: this.gameState,
      },
    };

    for (const player of this.onlinePlayers) {
      player.networkInterface.send(message);
    }
  }

  destroy() {
    if (this.gameLoopIntervalTimer) {
      this.gameLoopIntervalTimer.stop();
      this.gameLoopIntervalTimer = undefined;
    }
  }
}

function reportLogic(strings: TemplateStringsArray, ...args: unknown[]): void {
  const reportNode = document.querySelector('.js-report');

  if (!reportNode) {
    return;
  }

  const stringBuilder = [];

  for (let i = 0; i < strings.length; i += 1) {
    stringBuilder.push(strings[i]);
    if (i < args.length) {
      const rawValue = args[i];
      let value = rawValue;

      if (typeof rawValue === 'number') {
        value = rawValue.toFixed(1).padStart(6);
      }

      stringBuilder.push(value);
    }
  }

  (reportNode as HTMLDivElement).innerText = stringBuilder.join('');
}

const report = throttle(reportLogic, 500);
