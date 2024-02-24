import throttle from 'lodash-es/throttle';

import { NetworkInterface } from './network.ts';
import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
} from './types.ts';
import {
  CLIENT_UPDATES_INTERVAL,
  CLIENT_UPDATES_RATE,
  SERVER_UPDATES_INTERVAL,
} from './consts.ts';

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
};

const COLORS = ['red', 'blue', 'yellow', 'orange'];

export class Server {
  onlinePlayers: ServerPlayerRepresentation[] = [];
  lastPlayerId = 0;
  gameLoopIntervalId: number | undefined;
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

            report`${player.playerId}
              min spread: ${min}
              max spread: ${max}
              spread window: ${max - min}
              spread bias: ${min + max}`;
          }

          player.updateTimeSpreadList[player.updateTimeSpreadListIndex] =
            spread;

          player.updateTimeSpreadListIndex += 1;
          if (player.updateTimeSpreadListIndex === CLIENT_UPDATES_RATE) {
            player.updateTimeSpreadListIndex = 0;
          }
        }

        player.playerState.position = message.data.position;
        break;
      }
    }
  }

  startGameLoop() {
    this.gameLoopIntervalId = window.setInterval(() => {
      if (this.onlinePlayers.length === 0) {
        return;
      }

      const message: ServerNetworkMessage = {
        type: 'GAME_STATE_UPDATE',
        data: {
          gameState: this.gameState,
        },
      };

      for (const player of this.onlinePlayers) {
        player.networkInterface.send(message);
      }
    }, SERVER_UPDATES_INTERVAL);
  }

  destroy() {
    if (this.gameLoopIntervalId) {
      window.clearInterval(this.gameLoopIntervalId);
      this.gameLoopIntervalId = undefined;
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
