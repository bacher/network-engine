export type Position = {
  x: number;
  y: number;
};

export type PlayerState = {
  playerId: string;
  color: string;
  position: Position;
};

export type GameState = {
  players: PlayerState[];
};

export type NetworkListener = (message: NetworkMessage) => void;

export type MessageInitial = {
  type: 'INITIAL';
  data: {
    playerId: string;
    gameState: GameState;
  };
};

export type MessageGameStateUpdate = {
  type: 'GAME_STATE_UPDATE';
  data: {
    gameState: GameState;
  };
};

export type MessagePlayerPositionUpdate = {
  type: 'PLAYER_POSITION_UPDATE';
  data: {
    position: Position;
  };
};

export type NetworkMessage =
  | MessageInitial
  | MessageGameStateUpdate
  | MessagePlayerPositionUpdate;
