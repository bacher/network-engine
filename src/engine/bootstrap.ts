import { Client } from './Client.ts';
import { NetworkLink, NetworkLinkParams } from './network.ts';
import { Server } from './Server.ts';

const defaultLinkParams: NetworkLinkParams = {
  avgDelay: 100,
  spread: 0.3,
};

export function bootstrap() {
  const player1Server = new NetworkLink(defaultLinkParams);
  const player2Server = new NetworkLink(defaultLinkParams);

  const player1 = new Client(player1Server.client);
  const player2 = new Client(player2Server.client);

  const server = new Server();

  server.startGameLoop();

  server.attachPlayerLink(player1Server.server);
  server.attachPlayerLink(player2Server.server);

  player1.startCircling();

  return {
    server,
    players: [player1, player2],
  };
}
