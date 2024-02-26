import { Client } from './Client.ts';
import { NetworkLink } from './network.ts';
import { Server } from './Server.ts';
import { defaultLinkParams } from './consts.ts';

export function bootstrap() {
  const player1Server = new NetworkLink(defaultLinkParams);
  const player2Server = new NetworkLink(defaultLinkParams);

  const player1 = new Client(player1Server.client);
  const player2 = new Client(player2Server.client);

  const server = new Server();

  return {
    server,
    players: [player1, player2],
    start: () => {
      server.startGameLoop();

      server.attachPlayerLink(player1Server.server);
      server.attachPlayerLink(player2Server.server);

      player1.startCircling();
    },
  };
}
