// @ts-ignore
const { JSDOM } = require("jsdom");

const { test } = require("ava");
const { Component, render } = require("inferno");
const { createElement } = require("inferno-create-element");
const nullthrows = require("nullthrows").default;
const {
  BrowserRouter,
  History,
  Link,
  Location,
  Provider,
  Route,
  StaticRouter,
  Switch,
  autorun,
  decorate,
  inject,
  matchPath,
  observable,
  observer,
  useStaticRendering,
  withRouter
} = require("./index");

test("autoruns", t => {
  let _ = "";

  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  const valueService = new ValueService();
  t.is(_, "");

  const unsubscribe = autorun(() => (_ = valueService.value));
  t.is(_, "...");

  valueService.value = "Success.";
  t.is(_, "Success.");

  unsubscribe();
  valueService.value = "No more observation.";
  t.is(_, "Success.");
});

test("decorates", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  const valueService = new ValueService();
  t.is(valueService.value, "...");

  valueService.value = "Success.";
  t.is(valueService.value, "Success.");
});

test("decorates, initializing on get", t => {
  class ValueService {
    componentDidMount() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  const valueService = new ValueService();
  t.is(valueService.value, undefined);

  valueService.componentDidMount();
  t.is(valueService.value, "...");
});

test.serial("injects", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  /**
   * @typedef IProps
   * @property {ValueService?} [valueService]
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        value: nullthrows(this.props.valueService).value
      });
    }
  }

  const Value = inject("valueService")(observer(ValueView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  render(
    createElement(Provider, { valueService }, createElement(Value)),
    dom.window.document.body
  );

  const $input = dom.window.document.querySelector("input");
  t.is($input.value, "...");

  render(null, dom.window.document.body);
});

test.serial("injects, accepting many services", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  class VisibilityService {
    constructor() {
      this.isVisible = false;
    }
  }

  /**
   * @typedef IProps
   * @property {VisibilityService?} [visibilityService]
   * @property {ValueService?} [valueService]
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        hidden: !nullthrows(this.props.visibilityService).isVisible,
        value: nullthrows(this.props.valueService).value
      });
    }
  }

  const Value = inject("valueService", "visibilityService")(
    observer(ValueView)
  );

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();
  const visibilityService = new VisibilityService();

  render(
    createElement(
      Provider,
      { valueService, visibilityService },
      createElement(Value)
    ),
    dom.window.document.body
  );

  const $input = dom.window.document.querySelector("input");
  t.is($input.hidden, true);
  t.is($input.value, "...");

  render(null, dom.window.document.body);
});

test.serial("injects, inheriting static methods", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  /**
   * @typedef IProps
   * @property {ValueService?} [valueService]
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    /**
     * @param {IProps} props
     */
    static loadData(props) {
      t.is(nullthrows(props.valueService).value, "...");
      nullthrows(props.valueService).value = "Success.";
    }

    render() {
      return createElement("input", {
        value: nullthrows(this.props.valueService).value
      });
    }
  }

  const Value = inject("valueService")(observer(ValueView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  Value.loadData({ valueService });

  render(
    createElement(Provider, { valueService }, createElement(Value)),
    dom.window.document.body
  );

  t.is(valueService.value, "Success.");

  render(null, dom.window.document.body);
});

test.serial("injects, preferring prop", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  /**
   * @typedef IProps
   * @property {ValueService?} [valueService]
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        value: nullthrows(this.props.valueService).value
      });
    }
  }

  const Value = inject("valueService")(observer(ValueView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();
  valueService.value = "Success.";

  const valueService1 = new ValueService();

  render(
    createElement(
      Provider,
      { valueService },
      createElement(Value, { valueService: valueService1 })
    ),
    dom.window.document.body
  );

  const $input = dom.window.document.querySelector("input");
  t.is($input.value, "...");

  render(null, dom.window.document.body);
});

test.serial("injects, skipping names not mentioned", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  /**
   * @typedef IProps
   * @property {ValueService?} [valueService]
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        value: nullthrows(this.props.valueService).value
      });
    }
  }

  const Value = inject("valueSrvice")(observer(ValueView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  let error;

  try {
    render(
      createElement(Provider, { valueService }, createElement(Value)),
      dom.window.document.body
    );
  } catch (_) {
    error = _;
  }

  t.is(!!error, true);

  render(null, dom.window.document.body);
});

test.serial("links, injecting browser history", t => {
  /**
   * @typedef IProps
   * @property {Location} location
   *
   * @extends Component<IProps>
   */
  class NavView extends Component {
    render() {
      const { pathname, search } = this.props.location;
      return createElement(Link, { to: `${pathname}?123` }, pathname + search);
    }
  }

  const Nav = withRouter(observer(NavView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;

  dom.reconfigure({ url: "https://example.com/test" });

  render(
    createElement(BrowserRouter, undefined, createElement(Nav)),
    dom.window.document.body
  );

  const $a = dom.window.document.querySelector("a");
  t.is($a.textContent, "/test");

  let didOverride = false;
  $a.onclick({ preventDefault: () => (didOverride = true) });
  t.is(didOverride, true);
  t.is($a.textContent, "/test?123");

  render(null, dom.window.document.body);
});

test.serial("links, injecting static location", t => {
  /**
   * @typedef IProps
   * @property {{ pathname: string, search: string }} location
   *
   * @extends Component<IProps>
   */
  class NavView extends Component {
    render() {
      const { pathname, search } = this.props.location;
      return createElement(Link, { to: `${pathname}?123` }, pathname + search);
    }
  }

  const Nav = withRouter(observer(NavView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const location = { pathname: "/test", search: "" };

  render(
    createElement(StaticRouter, { location }, createElement(Nav)),
    dom.window.document.body
  );

  const $a = dom.window.document.querySelector("a");
  t.is($a.textContent, "/test");

  $a.onclick({});
  t.is($a.textContent, "/test");

  render(null, dom.window.document.body);
});

test.serial("links, keeping default modifier key behavior", t => {
  /**
   * @typedef IProps
   * @property {Location} location
   *
   * @extends Component<IProps>
   */
  class NavView extends Component {
    render() {
      const { pathname, search } = this.props.location;
      return createElement(Link, { to: `${pathname}?123` }, pathname + search);
    }
  }

  const Nav = withRouter(observer(NavView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;

  dom.reconfigure({ url: "https://example.com/test" });

  render(
    createElement(BrowserRouter, undefined, createElement(Nav)),
    dom.window.document.body
  );

  const $a = dom.window.document.querySelector("a");
  t.is($a.textContent, "/test");

  $a.onclick({ altKey: true });
  $a.onclick({ button: 1 });
  $a.onclick({ button: 2 });
  $a.onclick({ ctrlKey: true });
  $a.onclick({ metaKey: true });
  $a.onclick({ shiftKey: true });
  t.is($a.textContent, "/test");

  let didOverride = false;
  $a.onclick({ button: 0, preventDefault: () => (didOverride = true) });
  t.is(didOverride, true);
  t.is($a.textContent, "/test?123");

  render(null, dom.window.document.body);
});

test("matches path", t => {
  const Screen = {
    Home: 0,
    NotFound: 4,
    Other: 3,
    Settings: 1,
    Test: 2
  };

  const routes = [
    { component: Screen.Home, exact: true, path: "/" },
    { component: Screen.Settings, path: "/settings" },
    { component: Screen.Test, path: "/:id/:test([0-9]+)" },
    { component: Screen.Other, exact: true, path: "/:id" },
    { component: Screen.NotFound }
  ];

  const _ = (/** @type {string} */ path) =>
    routes.findIndex(route => !!matchPath(path, route));

  t.is(_("/"), Screen.Home);

  t.is(_("/rules/012q"), Screen.NotFound);
  t.is(_("/rules/foobar"), Screen.NotFound);

  t.is(_("/rules"), Screen.Other);

  t.is(_("/settings"), Screen.Settings);
  t.is(_("/settings/0"), Screen.Settings);
  t.is(_("/settings/foobar"), Screen.Settings);

  t.is(_("/rules/0"), Screen.Test);
  t.is(_("/rules/0/foobar"), Screen.Test);

  const { params } = nullthrows(
    matchPath("/rules/0/foobar", routes[Screen.Test])
  );
  t.is(params.id, "rules");
  t.is(params.test, "0");
});

test.serial("observes", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", { value: this.props.valueService.value });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  render(createElement(Value, { valueService }), dom.window.document.body);

  const $input = dom.window.document.querySelector("input");
  t.is($input.value, "...");

  valueService.value = "Success.";
  t.is($input.value, "Success.");

  render(null, dom.window.document.body);
});

test.serial("observes, inheriting mount and unmount", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  let mounts = 0;
  let unmounts = 0;

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    componentDidMount() {
      t.is(this.props.valueService.value, "...");
      this.props.valueService.value = "Success.";
      mounts++;
    }

    componentWillUnmount() {
      t.is(this.props.valueService.value, "Success.");
      unmounts++;
    }

    render() {
      return createElement("input", { value: this.props.valueService.value });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  render(createElement(Value, { valueService }), dom.window.document.body);

  t.is(mounts, 1);
  t.is(unmounts, 0);

  render(null, dom.window.document.body);

  t.is(mounts, 1);
  t.is(unmounts, 1);
});

test.serial("observes, inheriting static methods", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    /**
     * @param {IProps} props
     */
    static loadData(props) {
      t.is(props.valueService.value, "...");
      props.valueService.value = "Success.";
    }

    render() {
      return createElement("input", { value: this.props.valueService.value });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  Value.loadData({ valueService });

  render(createElement(Value, { valueService }), dom.window.document.body);

  t.is(valueService.value, "Success.");

  render(null, dom.window.document.body);
});

test.serial("observes, subscribing to many services", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  class VisibilityService {
    constructor() {
      this.isVisible = false;
    }
  }

  decorate(VisibilityService, { isVisible: observable.ref });

  /**
   * @typedef IProps
   * @property {VisibilityService} visibilityService
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        hidden: !this.props.visibilityService.isVisible,
        value: this.props.valueService.value
      });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();
  const visibilityService = new VisibilityService();

  render(
    createElement(Value, { valueService, visibilityService }),
    dom.window.document.body
  );

  const $input = dom.window.document.querySelector("input");
  t.is($input.hidden, true);
  t.is($input.value, "...");

  valueService.value = "Success.";
  t.is($input.hidden, true);
  t.is($input.value, "Success.");

  visibilityService.isVisible = true;
  t.is($input.hidden, false);
  t.is($input.value, "Success.");

  render(null, dom.window.document.body);
});

test.serial("observes, subscribing to properties of same service", t => {
  class ValueService {
    constructor() {
      this.isVisible = false;
      this.value = "...";
    }
  }

  decorate(ValueService, {
    isVisible: observable.ref,
    value: observable.ref
  });

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", {
        hidden: !this.props.valueService.isVisible,
        value: this.props.valueService.value
      });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  render(createElement(Value, { valueService }), dom.window.document.body);

  const $input = dom.window.document.querySelector("input");
  t.is($input.hidden, true);
  t.is($input.value, "...");

  valueService.value = "Success.";
  t.is($input.hidden, true);
  t.is($input.value, "Success.");

  valueService.isVisible = true;
  t.is($input.hidden, false);
  t.is($input.value, "Success.");

  render(null, dom.window.document.body);
});

test.serial("observes, unmounting correctly after mount error", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  let mounts = 0;
  let unmounts = 0;

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    componentDidMount() {
      t.is(this.props.valueService.value, "...");
      this.props.valueService.value = "Success.";
      mounts++;
      throw new Error();
    }

    componentWillUnmount() {
      t.is(this.props.valueService.value, "Success.");
      unmounts++;
    }

    render() {
      return createElement("input", { value: this.props.valueService.value });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  const valueService = new ValueService();

  let error;

  try {
    render(createElement(Value, { valueService }), dom.window.document.body);
  } catch (_) {
    error = _;
  }

  t.is(!!error, true);

  t.is(mounts, 1);
  t.is(unmounts, 0);

  render(null, dom.window.document.body);

  t.is(mounts, 1);
  t.is(unmounts, 1);
});

test.serial("routes", t => {
  /**
   * @typedef IProps
   * @property {History} history
   * @property {Location} location
   * @property {{ params: { id: string, test: string } }} match
   *
   * @extends Component<IProps>
   */
  class MatchScreen extends Component {
    render() {
      const { push } = this.props.history;
      const { pathname } = this.props.location;
      const { params } = this.props.match;

      return createElement(
        "button",
        {
          onclick: () =>
            push(pathname === "/settings/1" ? "/settings/012" : "/settings")
        },
        JSON.stringify({ params, pathname })
      );
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/settings/1" });

  render(
    createElement(
      BrowserRouter,
      undefined,
      createElement(Route, {
        component: MatchScreen,
        path: "/:id/:test([0-9]+)"
      })
    ),
    dom.window.document.body
  );

  const $btn = dom.window.document.querySelector("button");
  t.is(
    $btn.textContent,
    JSON.stringify({
      params: { id: "settings", test: "1" },
      pathname: "/settings/1"
    })
  );

  $btn.onclick();
  t.is(
    $btn.textContent,
    JSON.stringify({
      params: { id: "settings", test: "012" },
      pathname: "/settings/012"
    })
  );

  $btn.onclick();
  t.is(dom.window.document.querySelector("button"), null);

  render(null, dom.window.document.body);
});

test.serial("routes, adding match to context", t => {
  /**
   * @typedef IProps
   * @property {History?} [history]
   * @property {Location?} [location]
   * @property {{ params: { id: string, test: string } }?} [match]
   *
   * @extends Component<IProps>
   */
  class MatchView extends Component {
    render() {
      const { push } = nullthrows(this.props.history);
      const { pathname } = nullthrows(this.props.location);
      const { params } = nullthrows(this.props.match);

      return createElement(
        "button",
        {
          onclick: () =>
            push(pathname === "/settings/1" ? "/settings/012" : "/settings")
        },
        JSON.stringify({
          params,
          pathname
        })
      );
    }
  }

  const Match = withRouter(observer(MatchView));

  class MatchScreen extends Component {
    render() {
      return createElement(Match);
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/settings/1" });

  render(
    createElement(
      BrowserRouter,
      undefined,
      createElement(Route, {
        component: MatchScreen,
        path: "/:id/:test([0-9]+)"
      })
    ),
    dom.window.document.body
  );

  const $btn = dom.window.document.querySelector("button");
  t.is(
    $btn.textContent,
    JSON.stringify({
      params: { id: "settings", test: "1" },
      pathname: "/settings/1"
    })
  );

  $btn.onclick();
  t.is(
    $btn.textContent,
    JSON.stringify({
      params: { id: "settings", test: "012" },
      pathname: "/settings/012"
    })
  );

  $btn.onclick();
  t.is(dom.window.document.querySelector("button"), null);

  render(null, dom.window.document.body);
});

test.serial("routes, decoding uri", t => {
  /**
   * @typedef IProps
   * @property {Location} location
   * @property {{ params: { id: string, test: string } }} match
   *
   * @extends Component<IProps>
   */
  class MatchScreen extends Component {
    render() {
      const { pathname, search } = this.props.location;
      const { params } = this.props.match;

      return createElement(
        "pre",
        undefined,
        JSON.stringify({ params, pathname, search })
      );
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({
    url: `https://example.com/маршрути/${encodeURIComponent(
      "бус-123к"
    )}?${encodeURIComponent("рейси")}=${encodeURIComponent("всі")}`
  });

  render(
    createElement(
      BrowserRouter,
      undefined,
      createElement(Route, { component: MatchScreen, path: "/:id/:test" })
    ),
    dom.window.document.body
  );

  const pre = dom.window.document.querySelector("pre");
  t.is(
    pre.textContent,
    JSON.stringify({
      params: { id: "маршрути", test: "бус-123к" },
      pathname: "/маршрути/бус-123к",
      search: "?рейси=всі"
    })
  );

  render(null, dom.window.document.body);
});

test.serial("routes, not interfering with regular observers", t => {
  class HomeService {
    constructor() {
      this.value = "";
    }
  }

  decorate(HomeService, { value: observable.ref });

  /** @extends {Component<{homeService?: HomeService}>} */
  class HomeScreenView extends Component {
    render() {
      const { value } = nullthrows(this.props.homeService);

      return createElement("textarea", {
        oninput: (/** @type {any} */ ev) =>
          (nullthrows(this.props.homeService).value = ev.target.value),
        value
      });
    }
  }

  const HomeScreen = inject("homeService")(observer(HomeScreenView));

  class ValueService {
    constructor() {
      this.value = "";
    }
  }

  decorate(ValueService, { value: observable.ref });

  /** @extends {Component<{ valueService?: ValueService}>} */
  class ValueScreenView extends Component {
    render() {
      const { value } = nullthrows(this.props.valueService);

      return createElement("input", {
        oninput: (/** @type {any} */ ev) =>
          (nullthrows(this.props.valueService).value = ev.target.value),
        value
      });
    }
  }

  const ValueScreen = inject("valueService")(observer(ValueScreenView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/" });

  const homeService = new HomeService();
  const valueService = new ValueService();

  /** @type {any} */
  let history = null;

  render(
    createElement(
      Provider,
      { homeService, valueService },
      createElement(
        BrowserRouter,
        { ref: _ => (history = _) },
        createElement(
          "div",
          undefined,
          createElement(Route, {
            component: HomeScreen,
            exact: true,
            path: "/"
          }),
          createElement(Route, { component: ValueScreen, path: "/value" })
        )
      )
    ),
    dom.window.document.body
  );

  let $home = dom.window.document.querySelector("textarea");
  let $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "");
  t.is($home.value, "");
  t.is(valueService.value, "");
  t.is($value, null);

  $home.oninput({
    stopPropagation: () => undefined,
    target: { value: "test" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home.value, "test");
  t.is(valueService.value, "");
  t.is($value, null);

  history.push("/value");
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home, null);
  t.is(valueService.value, "");
  t.is($value.value, "");

  $value.oninput({
    stopPropagation: () => undefined,
    target: { value: "foobar" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home, null);
  t.is(valueService.value, "foobar");
  t.is($value.value, "foobar");

  history.push("/");
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home.value, "test");
  t.is(valueService.value, "foobar");
  t.is($value, null);

  $home.oninput({
    stopPropagation: () => undefined,
    target: { value: "bazqux" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "bazqux");
  t.is($home.value, "bazqux");
  t.is(valueService.value, "foobar");
  t.is($value, null);

  render(null, dom.window.document.body);
});

test.serial("routes, showing route that allows any path", t => {
  /**
   * @typedef IProps
   * @property {History?} [history]
   * @property {Location?} [location]
   * @property {{ params: { id: string, test: string } }?} [match]
   *
   * @extends Component<IProps>
   */
  class MatchView extends Component {
    render() {
      const { push } = nullthrows(this.props.history);
      const { pathname } = nullthrows(this.props.location);
      const { params } = nullthrows(this.props.match);

      return createElement(
        "button",
        {
          onclick: () =>
            push(pathname === "/settings/1" ? "/settings/012" : "/settings")
        },
        JSON.stringify({ params, pathname })
      );
    }
  }

  const Match = withRouter(observer(MatchView));

  class MatchScreen extends Component {
    render() {
      return createElement(Match);
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/settings/1" });

  render(
    createElement(
      BrowserRouter,
      undefined,
      createElement(Route, { component: MatchScreen })
    ),
    dom.window.document.body
  );

  const $btn = dom.window.document.querySelector("button");
  t.is(
    $btn.textContent,
    JSON.stringify({ params: {}, pathname: "/settings/1" })
  );

  $btn.onclick();
  t.is(
    $btn.textContent,
    JSON.stringify({ params: {}, pathname: "/settings/012" })
  );

  $btn.onclick();
  t.is($btn.textContent, JSON.stringify({ params: {}, pathname: "/settings" }));

  render(null, dom.window.document.body);
});

test.serial("switches", t => {
  class HomeScreen extends Component {
    render() {
      return createElement("h1", undefined, "Welcome home");
    }
  }

  /** @extends {Component<{ match: { params: { name: string, value: string } } }>} */
  class InputScreen extends Component {
    render() {
      return createElement("input", this.props.match.params);
    }
  }

  class NotFoundScreen extends Component {
    render() {
      return createElement("marquee", undefined, "n o t   f o u n d");
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/settings/012" });

  /** @type {any} */
  let history = null;

  render(
    createElement(
      BrowserRouter,
      { ref: (/** @type {any} */ _) => (history = _) },
      createElement(
        Switch,
        undefined,
        createElement(Route, { component: HomeScreen, exact: true, path: "/" }),
        createElement(Route, { component: InputScreen, path: "/:name/:value" }),
        createElement(Route, { component: NotFoundScreen })
      )
    ),
    dom.window.document.body
  );

  let $input = dom.window.document.querySelector("input");
  let $h1 = dom.window.document.querySelector("h1");
  let $marquee = dom.window.document.querySelector("marquee");
  t.is($input.name, "settings");
  t.is($input.value, "012");
  t.is($h1, null);
  t.is($marquee, null);

  history.push("/");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  $marquee = dom.window.document.querySelector("marquee");
  t.is($input, null);
  t.is($h1.textContent, "Welcome home");
  t.is($marquee, null);

  history.push("/settings");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  $marquee = dom.window.document.querySelector("marquee");
  t.is($input, null);
  t.is($h1, null);
  t.is($marquee.textContent, "n o t   f o u n d");

  render(null, dom.window.document.body);
});

test.serial("switches, defaulting to null if no fallback", t => {
  class HomeScreen extends Component {
    render() {
      return createElement("h1", undefined, "Welcome home");
    }
  }

  /** @extends {Component<{ match: { params: { name: string, value: string } } }>} */
  class InputScreen extends Component {
    render() {
      return createElement("input", this.props.match.params);
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/settings/012" });

  /** @type {any} */
  let history = null;

  render(
    createElement(
      BrowserRouter,
      { ref: (/** @type {any} */ _) => (history = _) },
      createElement(
        Switch,
        undefined,
        createElement(Route, { component: HomeScreen, exact: true, path: "/" }),
        createElement(Route, { component: InputScreen, path: "/:name/:value" })
      )
    ),
    dom.window.document.body
  );

  let $input = dom.window.document.querySelector("input");
  let $h1 = dom.window.document.querySelector("h1");
  t.is($input.name, "settings");
  t.is($input.value, "012");
  t.is($h1, null);

  history.push("/");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  t.is($input, null);
  t.is($h1.textContent, "Welcome home");

  history.push("/settings");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  t.is($input, null);
  t.is($h1, null);

  render(null, dom.window.document.body);
});

test.serial("switches, not interfering with regular observers", t => {
  class HomeService {
    constructor() {
      this.value = "";
    }
  }

  decorate(HomeService, { value: observable.ref });

  /** @extends {Component<{homeService?: HomeService}>} */
  class HomeScreenView extends Component {
    render() {
      const { value } = nullthrows(this.props.homeService);

      return createElement("textarea", {
        oninput: (/** @type {any} */ ev) =>
          (nullthrows(this.props.homeService).value = ev.target.value),
        value
      });
    }
  }

  const HomeScreen = inject("homeService")(observer(HomeScreenView));

  class ValueService {
    constructor() {
      this.value = "";
    }
  }

  decorate(ValueService, { value: observable.ref });

  /** @extends {Component<{ valueService?: ValueService}>} */
  class ValueScreenView extends Component {
    render() {
      const { value } = nullthrows(this.props.valueService);

      return createElement("input", {
        oninput: (/** @type {any} */ ev) =>
          (nullthrows(this.props.valueService).value = ev.target.value),
        value
      });
    }
  }

  const ValueScreen = inject("valueService")(observer(ValueScreenView));

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;
  g.window = dom.window;
  dom.reconfigure({ url: "https://example.com/" });

  const homeService = new HomeService();
  const valueService = new ValueService();

  /** @type {any} */
  let history = null;

  render(
    createElement(
      Provider,
      { homeService, valueService },
      createElement(
        BrowserRouter,
        { ref: _ => (history = _) },
        createElement(
          Switch,
          undefined,
          createElement(Route, {
            component: HomeScreen,
            exact: true,
            path: "/"
          }),
          createElement(Route, { component: ValueScreen, path: "/value" })
        )
      )
    ),
    dom.window.document.body
  );

  let $home = dom.window.document.querySelector("textarea");
  let $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "");
  t.is($home.value, "");
  t.is(valueService.value, "");
  t.is($value, null);

  $home.oninput({
    stopPropagation: () => undefined,
    target: { value: "test" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home.value, "test");
  t.is(valueService.value, "");
  t.is($value, null);

  history.push("/value");
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home, null);
  t.is(valueService.value, "");
  t.is($value.value, "");

  $value.oninput({
    stopPropagation: () => undefined,
    target: { value: "foobar" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home, null);
  t.is(valueService.value, "foobar");
  t.is($value.value, "foobar");

  history.push("/");
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "test");
  t.is($home.value, "test");
  t.is(valueService.value, "foobar");
  t.is($value, null);

  $home.oninput({
    stopPropagation: () => undefined,
    target: { value: "bazqux" }
  });
  $home = dom.window.document.querySelector("textarea");
  $value = dom.window.document.querySelector("input");
  t.is(homeService.value, "bazqux");
  t.is($home.value, "bazqux");
  t.is(valueService.value, "foobar");
  t.is($value, null);

  render(null, dom.window.document.body);
});

test.serial("switches, using static rendering", t => {
  class HomeScreen extends Component {
    render() {
      return createElement("h1", undefined, "Welcome home");
    }
  }

  /** @extends {Component<{ match: { params: { name: string, value: string } } }>} */
  class InputScreen extends Component {
    render() {
      return createElement("input", this.props.match.params);
    }
  }

  class NotFoundScreen extends Component {
    render() {
      return createElement("marquee", undefined, "n o t   f o u n d");
    }
  }

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  useStaticRendering(true);
  const go = (/** @type {string} */ pathname) =>
    render(
      createElement(
        StaticRouter,
        { location: { pathname, search: "" } },
        createElement(
          Switch,
          undefined,
          createElement(Route, {
            component: HomeScreen,
            exact: true,
            path: "/"
          }),
          createElement(Route, {
            component: InputScreen,
            path: "/:name/:value"
          }),
          createElement(Route, { component: NotFoundScreen })
        )
      ),
      dom.window.document.body
    );

  go("/settings/012");
  let $input = dom.window.document.querySelector("input");
  let $h1 = dom.window.document.querySelector("h1");
  let $marquee = dom.window.document.querySelector("marquee");
  t.is($input.name, "settings");
  t.is($input.value, "012");
  t.is($h1, null);
  t.is($marquee, null);

  go("/");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  $marquee = dom.window.document.querySelector("marquee");
  t.is($input, null);
  t.is($h1.textContent, "Welcome home");
  t.is($marquee, null);

  go("/settings");
  $input = dom.window.document.querySelector("input");
  $h1 = dom.window.document.querySelector("h1");
  $marquee = dom.window.document.querySelector("marquee");
  t.is($input, null);
  t.is($h1, null);
  t.is($marquee.textContent, "n o t   f o u n d");

  render(null, dom.window.document.body);
  useStaticRendering(false);
});

test.serial("uses static rendering", t => {
  class ValueService {
    constructor() {
      this.value = "...";
    }
  }

  decorate(ValueService, { value: observable.ref });

  /**
   * @typedef IProps
   * @property {ValueService} valueService
   *
   * @extends Component<IProps>
   */
  class ValueView extends Component {
    render() {
      return createElement("input", { value: this.props.valueService.value });
    }
  }

  const Value = observer(ValueView);

  // @ts-ignore
  const g = global;
  const dom = new JSDOM();
  g.document = dom.window.document;

  useStaticRendering(true);

  const valueService = new ValueService();

  render(createElement(Value, { valueService }), dom.window.document.body);

  const $input = dom.window.document.querySelector("input");
  t.is($input.value, "...");

  valueService.value = "Success.";
  t.is($input.value, "...");

  render(null, dom.window.document.body);
});
