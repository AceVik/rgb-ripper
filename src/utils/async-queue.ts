const DEBUG = false;

export const createQueue = <T>(concurrency: number) => {
  let activeCount = 0;
  const queue: Array<{
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  const log = (message: string, ...optionalParams: unknown[]) => {
    if (DEBUG) console.log(message, ...optionalParams);
  };

  const next = (): void => {
    if (queue.length > 0 && activeCount < concurrency) {
      log(`Starting a new task. Active tasks: ${activeCount + 1}, Queue size: ${queue.length - 1}`);
      const { task, resolve, reject } = queue.shift()!;
      activeCount++;
      task()
        .then((result) => {
          log(`Task completed. Active tasks: ${activeCount - 1}`);
          resolve(result);
        })
        .catch((error) => {
          log(`Task failed. Active tasks: ${activeCount - 1}`, error);
          reject(error);
        })
        .finally(() => {
          activeCount--;
          next();
        });
    } else if (queue.length === 0 && activeCount === 0) {
      log('All tasks are complete. Queue is empty.');
    }
  };

  const add = (task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      log(`Adding a new task to the queue. Current queue size: ${queue.length}`);
      queue.push({ task, resolve, reject });
      next();
    });

  return { add };
};
