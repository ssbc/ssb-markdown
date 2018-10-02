'use strict'
const MarkdownIt = require('markdown-it')

const replaceNewlines = (text) => text.replace(/\n+(?!$)/g, ' ')

exports.block = function (text, opts) {
  // init
  const md = new MarkdownIt()
    .use(require('markdown-it-hashtag'))
    .use(require('markdown-it-emoji'))

  // XXX: why are these links disallowed? is there a whitelist or blacklist?
  md.linkify.add('magnet:', null)

  // hashtag
  md.renderer.rules.hashtag_open = function (tokens, idx) {
    var tagName = tokens[idx].content.toLowerCase()
    return '<a href="#/channel/' + tagName + '">'
  }

  // emoji
  md.renderer.rules.emoji = function (token, idx) {
    const emoji = token[idx].markup
    return `<img src="./img/emoji/${emoji}.png" alt=":${emoji}:" title=":${emoji}:" class="emoji" align="absmiddle" height="16" width="16">`
  }

  // links
  var oldRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    if (tokens[idx].attrs[0][1].indexOf('not-allowed-as-link') >= 0) {
      tokens[idx].attrs[0] = ['class', 'bad']
    } else {
      tokens[idx].attrPush(['target', '_blank'])
    }

    return oldRender(tokens, idx, options, env, self)
  }

  // image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    // XXX: doesnt support audio/video
    const token = tokens[idx]

    const hash = token.attrs[0][1]
    const encoded = encodeURIComponent(hash)

    return `<a href="#${hash}"><img src="/${encoded}" alt="${token.content}"></a>`
  }

  return md.render('' + (text || ''))
}

exports.inline = function (text, opts) {
  // init
  const md = new MarkdownIt()
    .use(require('markdown-it-emoji'))

  // emoji
  md.renderer.rules.emoji = function (token, idx) {
    const emoji = token[idx].markup
    return `<img src="./img/emoji/${emoji}.png" alt=":${emoji}:" title=":${emoji}:" class="emoji" align="absmiddle" height="12" width="12">`
  }

  // links
  md.renderer.rules.link_open = () => ''
  md.renderer.rules.link_close = () => ''

  // code
  md.renderer.rules.code_inline = (tokens, idx) => {
    // XXX: had to change test to pass because of fenced code blocks with an
    // embedded syntax name (like ```js and ``` js)
    return tokens[idx].content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    return tokens[idx].content
  }

  return replaceNewlines(md.renderInline('' + (text || '')))
}
