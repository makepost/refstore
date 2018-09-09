// tslint:disable:forin
const { Component, createComponentVNode, createVNode } = require("inferno");

const $ = new class ModuleState {
  constructor() {
    /** @type {IObserver[]} */
    this.observers = [];

    /** @type {{ key: string, target: any }[]} */
    this.subscriptions = [];

    this.useStaticRendering = false;
  }

  /**
   * @param {any} target
   * @param {any} prototype
   */
  defineObservables(target, prototype) {
    const keys = Object.getOwnPropertyNames(prototype);
    const properties = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      if (isObservableProp(prototype, key)) {
        properties[key] = {
          enumerable: true,

          get: function() {
            $.subscriptions.push({ key, target: this });
            return this[`__${key}`];
          },

          set: function(/** @type {any} */ _) {
            this[`__${key}`] = _;
            $.forceUpdate({ key, target: this });
          }
        };
      }
    }

    Object.defineProperties(target, properties);
  }

  /**
   * @param {{ key: string, target: any }} subscription
   */
  forceUpdate(subscription) {
    for (let i = 0; i < this.observers.length; i++) {
      const x = this.observers[i];

      for (let j = 0; j < x.subscriptions.length; j++) {
        const y = x.subscriptions[j];

        if (y.target === subscription.target && y.key === subscription.key) {
          x.forceUpdate();
          break;
        }
      }
    }
  }

  /**
   * @param {IObserver} x
   */
  reaction(x) {
    this.observers.push(x);

    return () => this.observers.splice(this.observers.indexOf(x), 1);
  }
}();

class BrowserRouter extends Component {
  constructor(/** @type {any} */ props) {
    super(props);

    this.push = (/** @type {string} */ path) => {
      window.history.pushState(undefined, undefined, path);
      this.update();
    };

    this.update = () =>
      (this.location = {
        pathname: window.location.pathname,
        search: window.location.search
      });

    this.update();
  }

  componentDidMount() {
    window.addEventListener("popstate", this.update);
  }

  componentWillUnmount() {
    window.removeEventListener("popstate", this.update);
  }

  getChildContext() {
    return { history: this };
  }

  render() {
    return this.props.children;
  }
}

/** @extends {Component<{ className?: string, history?: BrowserRouter, to: string }>} */
class Link extends Component {
  render() {
    const { history } = this.props;

    return createVNode(
      1,
      "a",
      this.props.className,
      this.props.children,
      0,
      {
        href: this.props.to,
        onclick: () =>
          !!history && !!history.push && !!history.push(this.props.to)
      },
      undefined,
      undefined
    );
  }
}

class Provider extends Component {
  getChildContext() {
    return this.props;
  }

  render() {
    return this.props.children;
  }
}

/** @extends {Component<{ component: any, history: BrowserRouter, path?: string }>} */
class Route extends Component {
  get match() {
    return this.props.path
      ? matchPath(this.props.history.location.pathname, this.props)
      : { params: {} };
  }

  getChildContext() {
    return { route: this };
  }

  render() {
    const { component, history } = this.props;
    const match = this.match;

    return match
      ? createComponentVNode(
          4,
          component,
          { history, location: history.location, match },
          null,
          null
        )
      : null;
  }
}

/** @extends {Component<{ location: typeof BrowserRouter.prototype.location }>} */
class StaticRouter extends Component {
  getChildContext() {
    return { history: { location: this.props.location } };
  }

  render() {
    return this.props.children;
  }
}

/** @extends {Component<{ children: any[], location: typeof BrowserRouter.prototype.location }>} */
class Switch extends Component {
  render() {
    const routes = this.props.children;
    const { pathname } = this.props.location;

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];

      if (matchPath(pathname, route.props)) {
        return route;
      }
    }

    return null;
  }
}

/**
 * @param {() => void} x
 */
function autorun(x) {
  const klass = class {};
  klass.prototype.forceUpdate = x;
  klass.prototype.render = x;

  /** @type {any} */
  const instance = new (observer(klass))();
  instance.componentDidMount();

  const _ = $.useStaticRendering;
  $.useStaticRendering = false;
  instance.render();
  $.useStaticRendering = _;

  return () => instance.componentWillUnmount();
}

/**
 * @template T
 * @param {new(...args: any[])=>T} klass
 * @param {Y<T>} modifiers
 */
function decorate(klass, modifiers) {
  const keys = Object.getOwnPropertyNames(modifiers);
  const properties = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    properties[key] = {
      get: function() {
        $.defineObservables(this, klass.prototype);
        return this[key];
      },

      set: function(/** @type {any} */ _) {
        $.defineObservables(this, klass.prototype);
        this[key] = _;
      }
    };
  }

  Object.defineProperties(klass.prototype, properties);
}

/** @type {(...serviceNames: string[]) => <T>(klass: T) => T} */
const inject = (...serviceNames) => klass => {
  /** @type {any} */
  const _ = klass;

  /** @type {any} */
  const __ = class extends Component {
    render() {
      const props = {};

      for (let i = 0; i < serviceNames.length; i++) {
        const key = serviceNames[i];
        props[key] = this.context[key];

        if (key === "history") {
          props.location = props[key].location;
        }

        if (key === "route" && props[key]) {
          props.match = props[key].match || { params: {} };
        }
      }

      for (let key in this.props) {
        props[key] = this.props[key];
      }

      return createComponentVNode(4, _, props, null, null);
    }
  };

  const keys = Object.getOwnPropertyNames(_);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (
      key !== "arguments" &&
      key !== "caller" &&
      typeof _[key] === "function"
    ) {
      __[key] = _[key];
    }
  }

  return __;
};

/**
 * @param {any} target
 * @param {string} key
 */
function isObservableProp(target, key) {
  const prop = Object.getOwnPropertyDescriptor(target, key);

  return !!prop && !!prop.get && !!prop.set;
}

/**
 * @param {string} pathname
 * @param {{ exact?: boolean, path?: string }} props
 */
function matchPath(pathname, props) {
  if (!props.path) {
    return { params: {} };
  }

  const names = [""];
  const res = [""];
  const xs = props.path.split("/");

  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const _ = /^:([^(]+)(\(.+)?/.exec(x);

    names.push(_ ? _[1] : "");
    res.push(_ ? _[2] || "([^/]+)" : x ? `(${x})` : "");
  }

  const matches = new RegExp(
    `^${res.slice(1).join("/")}${props.exact ? "$" : "(/|$)"}`
  ).exec(pathname);

  if (!matches) {
    return null;
  }

  const params = {};

  for (let i = 1; i < names.length; i++) {
    const name = names[i];

    if (name) {
      params[name] = matches[i - 1];
    }
  }

  return { params };
}

/** @type {{ ref: "Only observable.ref is supported." }} */
const observable = { ref: "Only observable.ref is supported." };

/**
 * @template T
 * @param {T} klass
 * @returns {T}
 */
function observer(klass) {
  /** @type {any} */
  const _ = klass;
  _.isObserver = true;

  /** @type {typeof $.subscriptions} */
  const subscriptions = [];

  /** @type {(() => void) | undefined} */
  let unsubscribe;

  const { componentDidMount, componentWillUnmount, render } = _.prototype;

  _.prototype.componentDidMount = function() {
    if (componentDidMount) {
      componentDidMount.call(this);
    }

    const x = {
      forceUpdate: () => this.forceUpdate(),
      subscriptions
    };

    unsubscribe = $.reaction(x);
  };

  _.prototype.componentWillUnmount = function() {
    if (unsubscribe) {
      unsubscribe();
    }

    if (componentWillUnmount) {
      componentWillUnmount.call(this);
    }
  };

  _.prototype.render = function() {
    if ($.useStaticRendering) {
      return render.call(this);
    }

    $.subscriptions.splice(0);

    const __ = render.call(this);

    subscriptions.splice(0, subscriptions.length, ...$.subscriptions.splice(0));

    return __;
  };

  return _;
}

/**
 * @param {boolean} value
 */
function useStaticRendering(value) {
  $.useStaticRendering = value;
}

/**
 * @template T
 * @typedef {{ [P in keyof T]?: "Only observable.ref is supported." }} Y
 */

/**
 * @typedef IObserver
 * @property {() => void} forceUpdate
 * @property {{ key: string, target: any }[]} subscriptions
 */

decorate(BrowserRouter, { location: observable.ref });

exports.BrowserRouter = BrowserRouter;
exports.History = BrowserRouter;
exports.Link = inject("history")(Link);
exports.Location = {};
exports.Provider = Provider;
exports.Route = inject("history")(observer(Route));
exports.StaticRouter = StaticRouter;
exports.Switch = observer(inject("history")(Switch));
exports.autorun = autorun;
exports.decorate = decorate;
exports.inject = inject;
exports.isObservableProp = isObservableProp;
exports.matchPath = matchPath;
exports.observable = observable;
exports.observer = observer;
exports.useStaticRendering = useStaticRendering;
exports.withRouter = (/** @type {any} */ _) =>
  observer(inject("history", "route")(_));
