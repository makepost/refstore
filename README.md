# refstore

State management for Inferno. Tiny bundle, MobX-like API.

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
 * @property {string} id
 * @property {LocaleService} localeService
 * @property {PostService} postService
 *
 * @extends Component<IProps>
 */
export class PostScreenView extends Component {
  componentDidMount() {
    this.props.postService.get(this.props.id);
  }

  render() {
    const { formatTime } = this.props.localeService;
    const { posts } = this.props.postService;

    const post = (posts || {})[this.props.id] || new Post();

    return (
      <blockquote id={this.props.id}>
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

See practical examples at https://github.com/makepost/serverside, import `refstore` where it has MobX.

## License

MIT
