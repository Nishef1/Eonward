import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * One statement lifecycle at a time per native handle.
 * Expo Android has reported use-after-release crashes in concurrent statement calls.
 * This is a defensive JS boundary, not a substitute for a native SDK fix or device QA.
 */
const cache = new WeakMap<object, SQLiteDatabase>();
const METHODS = new Set(['getFirstAsync', 'getAllAsync', 'runAsync', 'execAsync']);

export function serializeDatabase<T extends SQLiteDatabase>(database: T): T {
  const known = cache.get(database);
  if (known) return known as T;

  let tail: Promise<void> = Promise.resolve();
  function queue<R>(task: () => Promise<R>): Promise<R> {
    const operation = tail.then(task, task);
    tail = operation.then(() => undefined, () => undefined);
    return operation;
  }

  const wrapper = new Proxy(database, {
    get(target, key) {
      const property = Reflect.get(target, key, target);
      if (key === 'withExclusiveTransactionAsync' && typeof property === 'function') {
        return (callback: (tx: SQLiteDatabase) => Promise<void>) =>
          queue(() => property.call(target, async (tx: SQLiteDatabase) => {
            // Real exclusive transactions have their own connection. If a testing
            // adapter reuses the same object, do not deadlock on the outer gate.
            await callback(tx === target ? tx : serializeDatabase(tx));
          }) as Promise<void>);
      }
      if (typeof key === 'string' && METHODS.has(key) && typeof property === 'function') {
        return (...args: unknown[]) =>
          queue(() => property.apply(target, args) as Promise<unknown>);
      }
      return typeof property === 'function' ? property.bind(target) : property;
    },
  });
  cache.set(database, wrapper as SQLiteDatabase);
  cache.set(wrapper, wrapper as SQLiteDatabase);
  return wrapper;
}
