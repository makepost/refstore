export const Provider: any;

export function autorun(x: () => void): () => void;

export function decorate<T>(
  klass: new (...args: any[]) => T,
  modifiers: Y<T>
): void;

export function inject(...serviceNames: string[]): <T>(klass: T) => T;

export function isObservableProp(target: any, key: string): boolean;

export const observable: { ref: "Only observable.ref is supported." };

export function observer<T>(klass: T): T;

export function useStaticRendering(value: boolean): undefined;

type Y<T> = { [P in keyof T]?: "Only observable.ref is supported." };

interface IObserver {
  forceUpdate: () => void;

  subscriptions: Array<{ key: string; target: any }>;
}
