import { Client } from './Client.ts';
import { NetworkLink } from './network.ts';
import { Server } from './Server.ts';

export function bootstrap() {
  const player1Server = new NetworkLink({
    avgDelay: 32,
    spread: 5,
  });
  const player2Server = new NetworkLink({
    avgDelay: 32,
    spread: 5,
  });

  const player1 = new Client(player1Server.node1);
  const player2 = new Client(player2Server.node1);

  const server = new Server();

  server.startGameLoop();

  server.attachPlayerLink(player1Server.node2);
  server.attachPlayerLink(player2Server.node2);

  player1.startCircling();

  return {
    server,
    players: [player1, player2],
  };
}
