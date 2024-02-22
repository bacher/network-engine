import { useEffect, useRef } from 'react';

import { GameState } from '../../engine/types.ts';
import { render } from './render.ts';
import styles from './StateVisualizer.module.css';

type StateVisualizerProps = {
  getGameState: () => GameState | undefined;
};

export const StateVisualizer = ({ getGameState }: StateVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | undefined>();

  function renderLoop(): void {
    const gameState = getGameState();

    if (gameState) {
      render(ctxRef.current!, gameState);
    }
    requestAnimationFrame(renderLoop);
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctxRef.current = ctx;
    renderLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} width={300} height={300} />
    </div>
  );
};
