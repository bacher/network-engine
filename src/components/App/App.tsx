import { useEffect, useRef } from 'react';

import { bootstrap } from '../../engine/bootstrap.ts';
import { Server } from '../../engine/Server.ts';
import { Client } from '../../engine/Client.ts';
import { StateVisualizer } from '../StateVisualizer/StateVisualizer.tsx';
import { ReportBlock } from '../ReportBlock/ReportBlock.tsx';
import styles from './App.module.css';

export default function App() {
  const ref = useRef<{
    server: Server;
    player1: Client;
    player2: Client;
  }>();

  useEffect(() => {
    const {
      server,
      players: [player1, player2],
      start,
    } = bootstrap();

    ref.current = {
      server,
      player1,
      player2,
    };

    const delayedStartTimerId = window.setTimeout(() => {
      start();
    }, 50);

    return () => {
      window.clearTimeout(delayedStartTimerId);
      player1.destroy();
      player2.destroy();
      server.destroy();
    };
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <h2 className={styles.sectionHeader}>Player 1</h2>
        <StateVisualizer getGameState={() => ref.current?.player1.gameState} />
      </div>
      <div className={styles.section}>
        <h2 className={styles.sectionHeader}>Game Server</h2>
        <StateVisualizer getGameState={() => ref.current?.server.gameState} />
      </div>
      <div className={styles.section}>
        <h2 className={styles.sectionHeader}>Player 2</h2>
        <StateVisualizer getGameState={() => ref.current?.player2.gameState} />
      </div>

      <ReportBlock />
    </div>
  );
}
