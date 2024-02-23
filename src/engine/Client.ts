import {
  GameState,
  ServerNetworkMessage,
  PlayerState,
  ClientNetworkMessage,
} from './types.ts';
import { NetworkInterface } from './network.ts';

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
        break;
      }

      case 'GAME_STATE_UPDATE': {
        this.serverGameState = message.data.gameState;
        this.gameState = {
          players: this.serverGameState.players.map((player) =>
            player.playerId === this.playerId ? this.playerState! : player,
          ),
        };
        // console.log(
        //   this.playerId,
        //   'Game state override',
        //   this.gameState.players.length,
        // );
        break;
      }
    }
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

    this.networkInterface.send({
      type: 'PLAYER_POSITION_UPDATE',
      data: {
        position: state.position,
      },
    });
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
}
