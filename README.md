# refstore

State management for Inferno. [Tiny bundle](https://bundlephobia.com/result?p=refstore), MobX-like API. Built-in optional router.

## Usage

Load data in your service:

```js
import { decorate, observable } from "refstore";
import { Post } from "../../domain/Post/Post";

export class PostService {
  async get(id = "") {
    const _ = encodeURIComponent;

    /** @type {{ [id: string]?: Post }?} */
    this.posts = {
      ...(this.posts || {}),
      [id]: await fetch(`/api/posts/${_(id)}`).then(x => x.json())
    };

    // Note: Only tracks reference. Don't mutate; replace.
  }
}

decorate(PostService, { posts: observable.ref });
```

Make your view an observer, and inject the service:

```js
import { Component } from "inferno";
import { inject, observer } from "refstore";

/**
 * @typedef IProps
 * @property {{ params: { id: string } }} match
 * @property {LocaleService} localeService
 * @property {PostService} postService
 *
 * @extends Component<IProps>
 */
export class PostScreenView extends Component {
  componentDidMount() {
    this.props.postService.get(this.props.match.params.id);
  }

  render() {
    const { formatTime } = this.props.localeService;
    const { params } = this.props.match;
    const { posts } = this.props.postService;

    const post = (posts || {})[params.id] || new Post();

    return (
      <blockquote id={params.id}>
        <small>
          {post.name} {formatTime(post.createdAt)}
        </small>

        {post.text || "..."}
      </blockquote>
    );
  }
}

export const PostScreen = inject("localeService", "postService")(
  observer(PostScreenView)
);
```

Configure the routes:

```js
import { Route, Switch } from "refstore";

export class App extends Component {
  static routes = [
    { component: HomeScreen, exact: true, path: "/" },
    { component: PostScreen, "/posts/:id" }
  ];

  render() {
    return (
      <Switch>
        {App.routes.map(route => (
          <Route {...route} />
        ))}
      </Switch>
    );
  }
}
```

See practical examples at https://github.com/makepost/serverside, import `refstore` everywhere it has MobX or React Router.

[TypeScript definitions](./index.d.ts) list components and other exports, which should be familiar if you have used the libraries mentioned above: BrowserRouter, History, Link, Location, Provider, Route, StaticRouter, Switch, autorun, decorate, inject, isObservableProp, matchPath, observable, observer, useStaticRendering, withRouter.

## License

MIT
