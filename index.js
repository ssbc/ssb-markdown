'use strict'
const MarkdownIt = require('markdown-it')
const ssbref = require('ssb-ref')

const replaceNewlines = (text) => text.replace(/\n+(?!$)/g, ' ')

const defaults = {
  imageLink: function (ref) {
    return '#' + ref
  },
  toUrl: function (ref) {
    // standard ssb-refs
    if (ssbref.isFeedId(ref)) {
      return '#/profile/' + encodeURIComponent(ref)
    } else if (ssbref.isMsgId(ref)) {
      return '#/msg/' + encodeURIComponent(ref)
    } else if (ssbref.isBlobId(ref)) {
      return '/' + encodeURIComponent(ref)
    } else if (ref && ref[0] === '#') {
      return '#/channel/' + encodeURIComponent(ref.substr(1))
    }
    return ''
  },
  protocols: ['http', 'https', 'ftp'],
  emoji: (emoji, size) => {
    size = size || 16
    const image = {
      src: `./img/emoji/${emoji}.png`,
      alt: `:${emoji}:`,
      title: `:${emoji}:`,
      class: 'emoji',
      align: 'absmiddle',
      height: size,
      width: size
    }

    let string = '<img'

    Object.keys(image).forEach(key => {
      const value = image[key]
      string += ` ${key}="${value}"`
    })

    string += '>'

    return string
  }
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
  md.renderer.rules.emoji = function (token, idx) {
    const emoji = token[idx].markup
    return config.emoji(emoji, 16)
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
  md.renderer.rules.emoji = function (token, idx) {
    const emoji = token[idx].markup
    return config.emoji(emoji, 12)
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
  md.renderer.rules.image = (tokens, idx) => {
    return tokens[idx].content
  }

  return replaceNewlines(md.renderInline('' + (text || '')))
}
