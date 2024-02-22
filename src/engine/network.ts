import { NetworkListener, NetworkMessage } from './types.ts';

type RawNetworkListener = (rawMessage: string) => void;

class InnerPipe {
  innerListeners: RawNetworkListener[] = [];
  outerListeners: RawNetworkListener[] = [];
  linkParams: NetworkLinkParams;

  constructor(linkParams: NetworkLinkParams) {
    this.linkParams = linkParams;
  }

  send(message: string): void {
    for (const outerListener of this.outerListeners) {
      outerListener(message);
    }
  }

  onMessage(callback: RawNetworkListener): void {
    this.innerListeners.push(callback);
  }

  pipe(anotherInnerPipe: InnerPipe) {
    this.outerListeners.push((message) => {
      const delay =
        this.linkParams.avgDelay +
        2 * (Math.random() - 0.5) * this.linkParams.spread;

      window.setTimeout(() => {
        for (const innerListener of anotherInnerPipe.innerListeners) {
          innerListener(message);
        }
      }, delay);
    });
  }
}

export class NetworkInterface {
  listeners: NetworkListener[] = [];

  innerPipe: InnerPipe;

  constructor(innerPipe: InnerPipe) {
    this.innerPipe = innerPipe;
    this.innerPipe.onMessage((rawMessage) => {
      const message = JSON.parse(rawMessage) as NetworkMessage;

      for (const listener of this.listeners) {
        listener(message);
      }
    });
  }

  onMessage(listener: NetworkListener): void {
    this.listeners.push(listener);
  }

  send(message: NetworkMessage): void {
    this.innerPipe.send(JSON.stringify(message));
  }
}

type NetworkLinkParams = {
  avgDelay: number;
  spread: number;
};

export class NetworkLink {
  node1: NetworkInterface;
  node2: NetworkInterface;

  constructor({ avgDelay, spread }: NetworkLinkParams) {
    const innerPipe1 = new InnerPipe({ avgDelay, spread });
    const innerPipe2 = new InnerPipe({ avgDelay, spread });

    innerPipe1.pipe(innerPipe2);
    innerPipe2.pipe(innerPipe1);

    this.node1 = new NetworkInterface(innerPipe1);
    this.node2 = new NetworkInterface(innerPipe2);
  }
}
