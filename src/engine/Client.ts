import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
} from './types.ts';
import { NetworkInterface } from './network.ts';
import { CLIENT_UPDATES_RATE } from './consts.ts';

type ClientNetworkInterface = NetworkInterface<
  ClientNetworkMessage,
  ServerNetworkMessage
>;

export class Client {
  networkInterface: ClientNetworkInterface;
  serverGameState: GameState | undefined;
  gameState: GameState | undefined;
  playerState: PlayerState | undefined;
  playerId: string | undefined;
  animationFrameId: number | undefined;
  stateSyncIntervalId: number | undefined;

  constructor(networkInterface: ClientNetworkInterface) {
    this.networkInterface = networkInterface;

    this.networkInterface.onMessage((message) => this.onMessage(message));
  }

  onMessage(message: ServerNetworkMessage): void {
    switch (message.type) {
      case 'INITIAL': {
        this.playerId = message.data.playerId;
        this.serverGameState = message.data.gameState;
        this.gameState = message.data.gameState;
        this.playerState = message.data.gameState.players.find(
          (player) => player.playerId === this.playerId,
        );
        this.initStateSync();
        break;
      }

      case 'GAME_STATE_UPDATE': {
        this.serverGameState = message.data.gameState;
        this.gameState = {
          players: this.serverGameState.players.map((player) =>
            player.playerId === this.playerId ? this.playerState! : player,
          ),
        };
        break;
      }
    }
  }

  initStateSync() {
    if (this.stateSyncIntervalId) {
      return;
    }

    this.stateSyncIntervalId = window.setInterval(() => {
      this.networkInterface.send({
        type: 'PLAYER_POSITION_UPDATE',
        data: {
          position: this.playerState!.position,
        },
      });
    }, 1000 / CLIENT_UPDATES_RATE);
  }

  startCircling() {
    this.animationFrameId = requestAnimationFrame(() => {
      this.circlingLogic();
      this.startCircling();
    });
  }

  private circlingLogic() {
    if (!this.playerState) {
      return;
    }

    const now = performance.now() * 0.001;

    this.updatePlayerState({
      position: {
        x: 100 * Math.sin(now),
        y: 100 * Math.cos(now),
      },
    });
  }

  private updatePlayerState(state: Pick<PlayerState, 'position'>) {
    this.playerState!.position = state.position;
    this.gameState!.players.find(
      (player) => player.playerId === this.playerId,
    )!.position = state.position;
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.stateSyncIntervalId) {
      window.clearInterval(this.stateSyncIntervalId);
      this.stateSyncIntervalId = undefined;
    }
  }
}
