'use strict'
const MarkdownIt = require('markdown-it')
const ssbref = require('ssb-ref')

const replaceNewlines = (text) => text.replace(/\n+(?!$)/g, ' ')

exports.block = function (text, opts) {
  const defaults = {
    imageLink: function (ref) {
      return '#' + ref
    },
    toUrl: function (ref, isImage) {
      // standard ssb-refs
      if (ssbref.isFeedId(ref))
        return '#/profile/'+encodeURIComponent(ref)
      else if (ssbref.isMsgId(ref))
        return '#/msg/'+encodeURIComponent(ref)
      else if (ssbref.isBlobId(ref))
        return '/'+encodeURIComponent(ref)
      else if (ref && ref[0] === '#')
        return '#/channel/'+encodeURIComponent(ref.substr(1))
      return ''
    },
    protocols: ['http', 'https', 'dat']
  }

  opts = Object.assign({}, defaults, opts)

  // init
  const md = new MarkdownIt({ linkify: true })
    .use(require('markdown-it-hashtag'))
    .use(require('markdown-it-emoji'))

  // protocols
  Object.values(opts.protocols).forEach(protocol =>
    md.linkify.add(protocol + ':', 'http:')
  )

  // hashtag
  md.renderer.rules.hashtag_open = function (tokens, idx) {
    var tagName = tokens[idx].content.toLowerCase()
    const url = opts.toUrl('#' + tagName)
    return '<a href="' + url + '">'
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

  // sigils
  ['@', '%', '&'].forEach(sigil => {
    md.linkify.add(sigil, {
      validate: function (text, pos, self) {
        var tail = text.slice(pos);

        if (!self.re.sigil) {
          self.re.sigil = new RegExp(
            '^([a-zA-Z0-9\/=]+\.[a-z0-9]+)'
          );
        }
        if (self.re.sigil.test(tail)) {
          return tail.match(self.re.sigil)[0].length;
        }
        return 0;
      },
      normalize: function (match) {
        match.url = opts.toUrl(match.raw)
      }
    });
  })

  // image
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]

    const text = token.attrs[0][1]
    const alt = token.content
    const url = opts.imageLink(text)
    const src = opts.toUrl(text, true)

    // XXX no support for `titleAttr`
    if (alt.startsWith('audio:')) {
      return `<video controls src="${src}" alt="${alt}" />`
    }  else if (alt.startsWith('video:')) {
      return `<video controls src="${src}" alt="${alt}" />`
    } else {
      return `<a href="${url}"><img src="${src}" alt="${alt}"></a>`
    }
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
