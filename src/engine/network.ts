import {
  ClientNetworkMessage,
  NetworkListener,
  ServerNetworkMessage,
} from './types.ts';

type RawNetworkListener = (rawMessage: string) => void;

class UnderlyingTransport {
  internalListeners: RawNetworkListener[] = [];
  externalListeners: RawNetworkListener[] = [];
  linkParams: NetworkLinkParams;

  constructor(linkParams: NetworkLinkParams) {
    this.linkParams = linkParams;
  }

  send(message: string): void {
    for (const outerListener of this.externalListeners) {
      outerListener(message);
    }
  }

  onMessage(callback: RawNetworkListener): void {
    this.internalListeners.push(callback);
  }

  pipe(transport: UnderlyingTransport) {
    this.externalListeners.push((message) => {
      const delay =
        this.linkParams.avgDelay +
        2 * (Math.random() - 0.5) * this.linkParams.spread;

      window.setTimeout(() => {
        for (const innerListener of transport.internalListeners) {
          innerListener(message);
        }
      }, delay);
    });
  }
}

export class NetworkInterface<SendMessage, ReceiveMessage> {
  listeners: NetworkListener<ReceiveMessage>[] = [];

  transport: UnderlyingTransport;

  constructor(transport: UnderlyingTransport) {
    this.transport = transport;
    this.transport.onMessage((rawMessage) => {
      const message = JSON.parse(rawMessage) as ReceiveMessage;

      for (const listener of this.listeners) {
        listener(message);
      }
    });
  }

  onMessage(listener: NetworkListener<ReceiveMessage>): void {
    this.listeners.push(listener);
  }

  send(message: SendMessage): void {
    this.transport.send(JSON.stringify(message));
  }
}

type NetworkLinkParams = {
  avgDelay: number;
  spread: number;
};

export class NetworkLink {
  client: NetworkInterface<ClientNetworkMessage, ServerNetworkMessage>;
  server: NetworkInterface<ServerNetworkMessage, ClientNetworkMessage>;

  constructor({ avgDelay, spread }: NetworkLinkParams) {
    const transport1 = new UnderlyingTransport({ avgDelay, spread });
    const transport2 = new UnderlyingTransport({ avgDelay, spread });

    transport1.pipe(transport2);
    transport2.pipe(transport1);

    this.client = new NetworkInterface(transport1);
    this.server = new NetworkInterface(transport2);
  }
}
