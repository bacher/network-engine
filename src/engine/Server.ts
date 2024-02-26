import throttle from 'lodash-es/throttle';

import { NetworkInterface } from './network.ts';
import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
  Position,
} from './types.ts';
import {
  CLIENT_UPDATES_INTERVAL,
  CLIENT_UPDATES_RATE,
  SERVER_INITIAL_BUFFER_OFFSET,
  SERVER_UPDATES_INTERVAL,
} from './consts.ts';
import { IntervalTimer } from './timers.ts';
import { CyclicCounter } from '../utils/CyclicCounter.ts';

type ServerNetworkInterface = NetworkInterface<
  ServerNetworkMessage,
  ClientNetworkMessage
>;

type ServerPlayerRepresentation = {
  playerId: string;
  playerState: PlayerState;
  lastUpdateTime: number | undefined;
  updateTimeSpreadList: number[];
  updateTimeSpreadListIndex: number;
  updateTimeSpread: number;
  networkInterface: ServerNetworkInterface;
  buffer: { position: Position }[];
  closestTickIdInBuffer: number | undefined;
};

const COLORS = ['red', 'blue', 'yellow', 'orange'];

const counter = new CyclicCounter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
(window as any)._counter = counter;

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
          counter.increase(1);
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
    counter.next();

    if (this.onlinePlayers.length === 0) {
      return;
    }

    this.applyTickChanges();

    this.broadcastState();
  }

  private applyTickChanges() {
    const tickId = this.gameLoopIntervalTimer!.getTickId();

    for (const player of this.onlinePlayers) {
      if (
        player.closestTickIdInBuffer !== undefined &&
        tickId === player.closestTickIdInBuffer
      ) {
        const playerUpdate = player.buffer.shift();

        if (playerUpdate) {
          player.playerState.position = playerUpdate.position;
        } else {
          console.log(`missing player state update for ${player.playerId}`);
        }
        player.closestTickIdInBuffer += 1;
      }
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
