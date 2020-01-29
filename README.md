# ssb-markdown

render patchwork/ssb messages to markdown.

[patchwork](https://github.com/ssbc/patchwork) has a few changes from
standard markdown.

* emoji - everybody hearts emoji
* ssb links - links to cryptographic objects see [ssb-ref](https://github.com/ssbc/ssb-ref)
* mentions - @mentions like on twitter or github. mentions allow people to convieniently talk to each other, but are written as both the name used, plus the cryptographic reference.

## api

```
var md = require('ssb-markdown')
```

### md.block(source, opts)

Render raw markdown `source` to html.
The output will be html content without a surrounding tag.

### md.inline (source, opts)

Render raw markdown to a single line of test,
suitable for a one line preview that is opened
to a view rendered with `block`.

### opts

An object containing custom markdown rendering functions. `opts` are the
same for both `md.block` and `md.inline`

`toUrl` is a function which accepts an [ssb-ref](https://github.com/ssbc/ssb-links) or @-mention string, and whether it is for an image or not,
and returns a url string.


`imageLink` is a function which accepts an [ssb-ref](https://github.com/ssbc/ssb-links) and will be used to generate links to wrap any images.

`emoji` is a function which accepts an emoji as markup and
over-rides the default emoji rendering behavior.


#### usage

```js
const opts = {
  toUrl: ref => renderUrlRef(ref),
  imageLink: ref => renderImageRef(ref),
  emoji: emojiAsMarkup => renderEmoji(emojiAsMarkup)
}

md.block(source, opts)

md.inline(source, opts)
```

## License

MIT
