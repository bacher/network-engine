import { NetworkLinkParams } from './network.ts';

export const SERVER_UPDATES_RATE = 30;
export const SERVER_UPDATES_INTERVAL = 1000 / SERVER_UPDATES_RATE;

export const CLIENT_UPDATES_RATE = 30;
export const CLIENT_UPDATES_INTERVAL = 1000 / CLIENT_UPDATES_RATE;

export const SERVER_INITIAL_BUFFER_OFFSET = 4; /* ticks */

export const defaultLinkParams: NetworkLinkParams = {
  avgDelay: 100,
  spread: 0.25,
};
