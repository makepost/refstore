export const BrowserRouter: any;

export class History {
  public push(to: string): void;

  public replace(to: string): void;
}

export const Link: (props: { to: string }) => any;

// tslint:disable:max-classes-per-file
export class Location {
  public pathname: string;

  public search: string;
}

export const Provider: any;

export const Route: (
  props: { component: any; exact?: boolean; path?: string }
) => any;

export const StaticRouter: (props: { location: Location }) => any;

export function autorun(x: () => void): () => void;

export function decorate<T>(
  klass: new (...args: any[]) => T,
  modifiers: Y<T>
): void;

export function inject(...serviceNames: string[]): <T>(klass: T) => T;

export function isObservableProp(target: any, key: string): boolean;

export function matchPath(
  pathname: string,
  props: { exact?: boolean; path?: string }
): { params: { [name: string]: string } } | null;

export const observable: { ref: "Only observable.ref is supported." };

export function observer<T>(klass: T): T & { isObserver: true };

export function useStaticRendering(value: boolean): undefined;

export function withRouter<T extends { isObserver: true }>(klass: T): T;

type Y<T> = { [P in keyof T]?: "Only observable.ref is supported." };

interface IObserver {
  forceUpdate: () => void;

  subscriptions: Array<{ key: string; target: any }>;
}
