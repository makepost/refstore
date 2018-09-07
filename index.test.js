// @ts-ignore
const { JSDOM } = require("jsdom");

const { test } = require("ava");
const { Component, render } = require("inferno");
const { createElement } = require("inferno-create-element");
const nullthrows = require("nullthrows").default;
const {
  autorun,
  decorate,
  inject,
  observable,
  observer,
  Provider,
  useStaticRendering
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
