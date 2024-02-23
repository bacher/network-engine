import {
  ClientNetworkMessage,
  NetworkListener,
  ServerNetworkMessage,
} from './types.ts';

type RawNetworkListener = (rawMessage: string) => void;

type Packet = {
  messageId: number;
  message: string;
};

class UnderlyingTransport {
  internalListeners: RawNetworkListener[] = [];
  externalListeners: RawNetworkListener[] = [];
  linkParams: NetworkLinkParams;

  private pipedTransport: UnderlyingTransport | undefined;
  private sendingQueue: Packet[] = [];
  private lastPacketId = 0;
  private lastSentPacketId = 0;

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

  private deliverMessage(packet: Packet): void {
    if (!this.pipedTransport) {
      throw new Error('Unpiped transport');
    }

    for (const innerListener of this.pipedTransport.internalListeners) {
      innerListener(packet.message);
    }

    this.lastSentPacketId = packet.messageId;
  }

  pipe(transport: UnderlyingTransport) {
    this.pipedTransport = transport;

    this.externalListeners.push((message) => {
      const delay = Math.max(
        0,
        this.linkParams.avgDelay +
          2 * (Math.random() - 0.5) * this.linkParams.spread,
      );

      this.lastPacketId += 1;

      const item = {
        messageId: this.lastPacketId,
        message,
      };

      window.setTimeout(() => {
        if (this.lastSentPacketId === item.messageId - 1) {
          this.deliverMessage(item);
          this.emptyQueue();
        } else {
          this.sendingQueue.push(item);
        }
      }, delay);
    });
  }

  private emptyQueue() {
    if (this.sendingQueue.length === 0) {
      return;
    }

    window.setTimeout(() => {
      for (let i = 0; i < this.sendingQueue.length; i++) {
        const item = this.sendingQueue[i];

        if (this.lastSentPacketId === item.messageId - 1) {
          this.deliverMessage(item);
          this.sendingQueue.splice(i, 1);
          this.emptyQueue();
          return;
        }
      }
    }, 1);
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

export type NetworkLinkParams = {
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
