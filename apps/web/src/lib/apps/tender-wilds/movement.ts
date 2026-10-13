export type Point = { x: number; y: number };
export const ARROWS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** Normalize diagonals and cap elapsed time so resuming a hidden tab cannot teleport the bird. */
export function moveBird(position: Point, direction: Point, seconds: number): Point {
  const length = Math.hypot(direction.x, direction.y);
  if (!length) return position;
  const distance = 150 * Math.min(0.04, Math.max(0, seconds));
  return {
    x: Math.max(80, Math.min(515, position.x + (direction.x / length) * distance)),
    y: Math.max(105, Math.min(525, position.y + (direction.y / length) * distance)),
  };
}
