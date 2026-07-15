import { describe, expect, it } from 'vitest';
import { fitCropToAspectRatio, resizeFromCorner } from './crop';

describe('fitCropToAspectRatio', () => {
  it('produces a box matching the requested aspect ratio', () => {
    const fitted = fitCropToAspectRatio({ x: 0, y: 0, width: 400, height: 400 }, 2, 400, 400);
    expect(fitted.width / fitted.height).toBeCloseTo(2);
  });

  it('keeps the box within the stage bounds', () => {
    const fitted = fitCropToAspectRatio({ x: 0, y: 0, width: 400, height: 400 }, 2, 400, 400);
    expect(fitted.x).toBeGreaterThanOrEqual(0);
    expect(fitted.y).toBeGreaterThanOrEqual(0);
    expect(fitted.x + fitted.width).toBeLessThanOrEqual(400 + 1e-9);
    expect(fitted.y + fitted.height).toBeLessThanOrEqual(400 + 1e-9);
  });

  it('keeps the box centered on the previous box', () => {
    const previous = { x: 50, y: 50, width: 200, height: 200 };
    const fitted = fitCropToAspectRatio(previous, 1, 400, 400);
    expect(fitted.x + fitted.width / 2).toBeCloseTo(previous.x + previous.width / 2);
    expect(fitted.y + fitted.height / 2).toBeCloseTo(previous.y + previous.height / 2);
  });

  it('shrinks to fit a narrower stage without stretching', () => {
    // A tall aspect ratio (1 col wide, many rows tall) in a wide stage.
    const fitted = fitCropToAspectRatio({ x: 0, y: 0, width: 400, height: 100 }, 0.25, 400, 100);
    expect(fitted.width / fitted.height).toBeCloseTo(0.25);
    expect(fitted.height).toBeLessThanOrEqual(100);
  });
});

describe('resizeFromCorner', () => {
  const stageWidth = 400;
  const stageHeight = 400;
  const start = { x: 100, y: 100, width: 100, height: 100 };

  it('keeps the opposite corner fixed while dragging se', () => {
    const result = resizeFromCorner('se', start, 50, 50, 1, stageWidth, stageHeight);
    expect(result.x).toBe(start.x);
    expect(result.y).toBe(start.y);
    expect(result.width).toBeGreaterThan(start.width);
    expect(result.width / result.height).toBeCloseTo(1);
  });

  it('keeps the opposite corner fixed while dragging nw', () => {
    const result = resizeFromCorner('nw', start, -50, -50, 1, stageWidth, stageHeight);
    expect(result.x + result.width).toBeCloseTo(start.x + start.width);
    expect(result.y + result.height).toBeCloseTo(start.y + start.height);
  });

  it('never exceeds the stage bounds', () => {
    const result = resizeFromCorner('se', start, 10000, 10000, 1, stageWidth, stageHeight);
    expect(result.x + result.width).toBeLessThanOrEqual(stageWidth + 1e-9);
    expect(result.y + result.height).toBeLessThanOrEqual(stageHeight + 1e-9);
  });

  it('never produces a stretched box - aspect ratio is always preserved', () => {
    const result = resizeFromCorner('se', start, 30, 90, 2, stageWidth, stageHeight);
    expect(result.width / result.height).toBeCloseTo(2);
  });

  it('never shrinks below the minimum crop size', () => {
    const result = resizeFromCorner('se', start, -1000, -1000, 1, stageWidth, stageHeight);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
