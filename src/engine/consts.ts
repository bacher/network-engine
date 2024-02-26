import { NetworkLinkParams } from './network.ts';
import { clamp } from 'lodash-es';

export const SERVER_UPDATES_RATE = 30;
export const SERVER_UPDATES_INTERVAL = 1000 / SERVER_UPDATES_RATE;

export const CLIENT_UPDATES_RATE = 30;
export const CLIENT_UPDATES_INTERVAL = 1000 / CLIENT_UPDATES_RATE;

export const SERVER_INITIAL_BUFFER_OFFSET = 4; /* ticks */

export const defaultLinkParams: NetworkLinkParams = {
  avgDelay: 100,
  spread: 0.25,
};

export const SKIP_TICK_PERIOD = 500;

export const SKIP_TICK_INTERPOLATION_STEP = clamp(
  1 / Math.ceil(SKIP_TICK_PERIOD / SERVER_UPDATES_INTERVAL),
  0,
  1,
);

export const SKIP_TICK_PREPARATION_PERIOD = 1000;

export const SKIP_TICK_PREPARATION_TICKS = Math.ceil(
  SKIP_TICK_PREPARATION_PERIOD / SERVER_UPDATES_INTERVAL,
);
