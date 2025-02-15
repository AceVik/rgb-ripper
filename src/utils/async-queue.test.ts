import { createQueue } from './async-queue';

describe('createQueue', () => {
  it('should process tasks with a concurrency limit', async () => {
    const queue = createQueue<number>(2);
    const results: number[] = [];
    const task = (value: number) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      results.push(value);
      return value;
    };

    const tasks = [
      queue.add(task(1)),
      queue.add(task(2)),
      queue.add(task(3)),
      queue.add(task(4)),
    ];

    const resolved = await Promise.all(tasks);

    expect(resolved).toEqual([1, 2, 3, 4]);
    expect(results).toEqual([1, 2, 3, 4]);
  });

  it('should process tasks sequentially if concurrency is 1', async () => {
    const queue = createQueue<number>(1);
    const results: number[] = [];
    const task = (value: number) => async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      results.push(value);
      return value;
    };

    const tasks = [
      queue.add(task(1)),
      queue.add(task(2)),
      queue.add(task(3)),
    ];

    const resolved = await Promise.all(tasks);

    expect(resolved).toEqual([1, 2, 3]);
    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle task failures and continue processing', async () => {
    const queue = createQueue<number>(2);
    const results: number[] = [];
    const task = (value: number) => async () => {
      if (value === 2) {
        throw new Error('Task failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      results.push(value);
      return value;
    };

    const tasks = [
      queue.add(task(1)),
      queue.add(task(2)).catch((err) => err.message),
      queue.add(task(3)),
    ];

    const resolved = await Promise.all(tasks);

    expect(resolved).toEqual([1, 'Task failed', 3]);
    expect(results).toEqual([1, 3]);
  });

  it('should not exceed concurrency limit', async () => {
    const queue = createQueue<number>(3);
    let activeTasks = 0;
    const maxConcurrent: number[] = [];

    const task = (value: number) => async () => {
      activeTasks++;
      maxConcurrent.push(activeTasks);
      await new Promise((resolve) => setTimeout(resolve, 100));
      activeTasks--;
      return value;
    };

    const tasks = [
      queue.add(task(1)),
      queue.add(task(2)),
      queue.add(task(3)),
      queue.add(task(4)),
      queue.add(task(5)),
    ];

    await Promise.all(tasks);

    expect(Math.max(...maxConcurrent)).toBeLessThanOrEqual(3);
  });
});