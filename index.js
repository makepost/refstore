const { Component, createComponentVNode } = require("inferno");

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

class Provider extends Component {
  getChildContext() {
    return this.props;
  }

  render() {
    return this.props.children;
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
const inject = () => klass => {
  /** @type {any} */
  const _ = klass;

  /** @type {any} */
  const __ = class extends Component {
    render() {
      return createComponentVNode(
        4,
        _,
        { ...this.context, ...this.props },
        null,
        null
      );
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

exports.Provider = Provider;
exports.autorun = autorun;
exports.decorate = decorate;
exports.inject = inject;
exports.isObservableProp = isObservableProp;
exports.observable = observable;
exports.observer = observer;
exports.useStaticRendering = useStaticRendering;
