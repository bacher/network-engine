import { GameState } from '../../engine/types.ts';

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width, height } = ctx.canvas;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);

  for (const player of state.players) {
    const { color, position } = player;

    ctx.beginPath();
    ctx.arc(position.x, position.y, 5, 0, Math.PI * 2, true);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
}
