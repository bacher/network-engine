export function lerp(value1: number, value2: number, mix: number): number {
  return value1 + (value2 - value1) * mix;
}

type Position = {
  x: number;
  y: number;
};

export function lerpPosition(
  pos1: Position,
  pos2: Position,
  mix: number,
): Position {
  return {
    x: lerp(pos1.x, pos2.x, mix),
    y: lerp(pos1.y, pos2.y, mix),
  };
}
