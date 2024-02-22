import { NetworkInterface } from './network.ts';
import { GameState, NetworkMessage } from './types.ts';

type ServerPlayerRepresentation = {
  playerId: string;
  networkInterface: NetworkInterface;
};

const COLORS = ['red', 'blue', 'yellow', 'orange'];

export class Server {
  onlinePlayers: ServerPlayerRepresentation[] = [];
  lastPlayerId = 0;
  gameLoopIntervalId: number | undefined;
  gameState: GameState = {
    players: [],
  };

  attachPlayerLink(networkInterface: NetworkInterface): void {
    this.lastPlayerId += 1;
    const playerId = `id:${this.lastPlayerId}`;

    this.onlinePlayers.push({
      playerId,
      networkInterface,
    });

    this.gameState.players.push({
      playerId,
      color: COLORS[this.gameState.players.length % COLORS.length],
      position: {
        x: 100 * (Math.random() - 0.5),
        y: 100 * (Math.random() - 0.5),
      },
    });

    networkInterface.send({
      type: 'INITIAL',
      data: {
        playerId,
        gameState: this.gameState,
      },
    });
  }

  startGameLoop() {
    this.gameLoopIntervalId = setInterval(() => {
      if (this.onlinePlayers.length === 0) {
        return;
      }

      const message: NetworkMessage = {
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
