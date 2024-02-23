import { NetworkInterface } from './network.ts';
import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
} from './types.ts';

type ServerNetworkInterface = NetworkInterface<
  ServerNetworkMessage,
  ClientNetworkMessage
>;

type ServerPlayerRepresentation = {
  playerId: string;
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

    this.onlinePlayers.push({
      playerId,
      networkInterface,
    });

    const player: PlayerState = {
      playerId,
      color: COLORS[this.gameState.players.length % COLORS.length],
      position: {
        x: 100 * (Math.random() - 0.5),
        y: 100 * (Math.random() - 0.5),
      },
    };

    this.gameState.players.push(player);

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
    playerState: PlayerState,
    message: ClientNetworkMessage,
  ): void {
    switch (message.type) {
      case 'PLAYER_POSITION_UPDATE': {
        playerState.position = message.data.position;
        break;
      }
    }
  }

  startGameLoop() {
    this.gameLoopIntervalId = setInterval(() => {
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
    }, 10);
  }

  destroy() {
    if (this.gameLoopIntervalId) {
      window.clearInterval(this.gameLoopIntervalId);
      this.gameLoopIntervalId = undefined;
    }
  }
}
