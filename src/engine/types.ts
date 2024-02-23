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

export type NetworkListener<Message> = (message: Message) => void;

export type ServerMessageInitial = {
  type: 'INITIAL';
  data: {
    playerId: string;
    gameState: GameState;
  };
};

export type ServerMessageGameStateUpdate = {
  type: 'GAME_STATE_UPDATE';
  data: {
    gameState: GameState;
  };
};

export type ClientMessagePlayerPositionUpdate = {
  type: 'PLAYER_POSITION_UPDATE';
  data: {
    position: Position;
  };
};

export type ServerNetworkMessage =
  | ServerMessageInitial
  | ServerMessageGameStateUpdate;

export type ClientNetworkMessage = ClientMessagePlayerPositionUpdate;
