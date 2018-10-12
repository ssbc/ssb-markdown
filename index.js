'use strict'
const MarkdownIt = require('markdown-it')

const replaceNewlines = (text) => text.replace(/\n+(?!$)/g, ' ')

const defaults = {
  imageLink: ref => ref,
  toUrl: ref => ref,
  protocols: []
}

exports.block = function (text, opts) {
  const config = Object.assign({}, defaults, opts)

  // init
  const md = new MarkdownIt({ linkify: true })
    .use(require('markdown-it-hashtag'), { hashtagRegExp: '[\\w+-]+' })
    .use(require('markdown-it-emoji'))

  // protocols
  const defaultProtocols = ['http', 'https', 'ftp']
  const additionalProtocols = ['data', 'dat', 'magnet']
  Object.values(config.protocols).forEach(protocol => {
    if (!defaultProtocols.includes(protocol)) { md.linkify.add(protocol + ':', 'http:') }
  })
  Object.values(additionalProtocols).forEach(protocol => {
    if (!config.protocols.includes(protocol)) { md.linkify.add(protocol + ':', 'http:') }
  })

  // hashtag
  md.renderer.rules.hashtag_open = function (tokens, idx) {
    var tagName = tokens[idx].content.toLowerCase()
    const url = config.toUrl('#' + tagName)
    return '<a href="' + url + '">'
  }

  // emoji
  if (config.emoji) {
    md.renderer.rules.emoji = function (token, idx) {
      const emoji = token[idx].markup
      return config.emoji(emoji)
    }
  }

  // links
  var oldRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrs[0][1]
    if (href.indexOf('not-allowed-as-link') >= 0) {
      tokens[idx].attrs[0] = ['class', 'bad']
    } else if (!href.startsWith('#')) {
      tokens[idx].attrPush(['target', '_blank'])
    }

    return oldRender(tokens, idx, options, env, self)
  }

  // sigils
  ['@', '%', '&'].forEach(sigil => {
    md.linkify.add(sigil, {
      validate: function (text, pos, self) {
        var tail = text.slice(pos)

        if (!self.re.sigil) {
          self.re.sigil = new RegExp(
            '^([a-zA-Z0-9+/=]{44}.[a-z0-9]+)'
          )
        }
        if (self.re.sigil.test(tail)) {
          return tail.match(self.re.sigil)[0].length
        }
        return 0
      },
      normalize: function (match) {
        // shorten the link to 7 characters plus the sigil
        match.text = match.text.slice(0, 8)
        // linkify is percent-decoding, so we percent-encode the percent symbol
        match.text = match.text.replace('%', '%25')
        match.url = config.toUrl(match.raw)
      }
    })
  })

  // image
  md.renderer.rules.image = (tokens, idx) => {
    const token = tokens[idx]

    const text = token.attrs[0][1]
    const alt = token.content
    const url = config.imageLink(text)
    const src = config.toUrl(text, true)

    // XXX no support for `titleAttr`
    if (alt.startsWith('audio:')) {
      return `<video controls src="${src}" alt="${alt}" />`
    } else if (alt.startsWith('video:')) {
      return `<video controls src="${src}" alt="${alt}" />`
    } else {
      // XXX: do all images need to be wrapped in links?
      return `<a href="${url}"><img src="${src}" alt="${alt}"></a>`
    }
  }

  return md.render('' + (text || ''))
}

exports.inline = function (text, opts) {
  const config = Object.assign({}, defaults, opts)

  // init
  const md = new MarkdownIt()
    .use(require('markdown-it-emoji'))

  // emoji
  if (config.emoji) {
    md.renderer.rules.emoji = function (token, idx) {
      const emoji = token[idx].markup
      return config.emoji(emoji)
    }
  }

  // links
  md.renderer.rules.link_open = () => ''
  md.renderer.rules.link_close = () => ''

  // code
  md.renderer.rules.code_inline = (tokens, idx) => {
    return tokens[idx].content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // image
  md.renderer.rules.image = (tokens, idx) => {
    return tokens[idx].content
  }

  return replaceNewlines(md.renderInline('' + (text || '')))
}
