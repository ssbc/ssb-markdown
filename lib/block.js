const hljs = require('highlight.js')
const nodeEmoji = require('node-emoji')
const util = require('./util')

const defaults = {
  imageLink: ref => ref,
  toUrl: ref => ref,
  protocols: []
}

const existingProtocols = ['http', 'https', 'ftp']
const additionalProtocols = ['dat']

let config = {}

// init
const md = require('markdown-it')({
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value
      } catch (__) {}
    }

    return '' // use external default escaping
  }
})
  .use(require('markdown-it-hashtag'), { hashtagRegExp: '[\\w+-]+' })
  .use(require('markdown-it-emoji'), { shortcuts: {} })

// hashtag
md.renderer.rules.hashtag_open = function (tokens, idx) {
  var tagName = tokens[idx].content.toLowerCase()
  const url = config.toUrl('#' + tagName)
  return '<a href="' + url + '">'
}

const oldEmojiRender = md.renderer.rules.emoji || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

// emoji
md.renderer.rules.emoji = function (tokens, idx) {
  if (config.emoji) {
    const emoji = tokens[idx].markup
    return config.emoji(emoji)
  } else {
    return oldEmojiRender(tokens, idx)
  }
}

// links
var oldLinkOpenRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrs[0][1]
  if (href.indexOf('not-allowed-as-link') >= 0) {
    tokens[idx].attrs[0] = ['class', 'bad']
  } else if (!href.startsWith('#')) {
    tokens[idx].attrPush(['target', '_blank'])
  }

  const oldLinkOpenRenderResult = oldLinkOpenRender(tokens, idx, options, env, self)
  return oldLinkOpenRenderResult.replace('<a href="%25', '<a href="%')
}

const sigilRegExp = new RegExp(/^[a-zA-Z0-9+/=]{44}\.[a-z0-9]+/)

// sigils
const sigils = ['%', '&']
sigils.forEach(sigil => {
  md.linkify.add(sigil, {
    validate: function (text, pos, self) {
      var tail = text.slice(pos)

      if (!self.re.sigil) {
        self.re.sigil = sigilRegExp
      }
      if (self.re.sigil.test(tail)) {
        const match = tail.match(self.re.sigil)[0]
        const attempt = config.toUrl(sigil + match)
        if (attempt.length) {
          return match.length
        }
      }
      return 0
    },
    normalize: function (match) {
      match.text = util.formatSigilText(match.text)
      match.url = config.toUrl(match.raw)
      return match
    }
  })
})

// sigil @ and mention
md.linkify.add('@', {
  validate: function (text, pos, self) {
    var tail = text.slice(pos)

    if (!self.re.sigil) {
      self.re.sigil = sigilRegExp
    }
    if (!self.re.mention) {
      self.re.mention = new RegExp(
        /^[A-Za-z0-9._\-+=/]*[A-Za-z0-9_\-+=/]/
      )
    }

    if (self.re.sigil.test(tail)) {
      return tail.match(self.re.sigil)[0].length
    }
    if (self.re.mention.test(tail)) {
      const match = tail.match(self.re.mention)[0]
      const attempt = config.toUrl('@' + match)
      if (attempt.length) {
        return match.length
      }
    }
    return 0
  },
  normalize: function (match) {
    match.url = config.toUrl(match.raw)
    if (sigilRegExp.test(match.raw)) {
      match.text = util.formatSigilText(match.text)
    }
  }
})

// image
md.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx]

  const text = token.attrs[0][1]
  const title = token.attrs[1][1]
  const alt = token.content
  const url = config.imageLink(text)
  const src = config.toUrl(text, true)

  const media = {
    src,
    alt,
    title
  }

  let properties = ''

  Object.keys(media).forEach(key => {
    const value = media[key]
    if (value.length) {
      properties += ` ${key}="${value}"`
    }
  })

  if (alt.startsWith('audio:')) {
    return `<audio controls${properties}/>`
  } else if (alt.startsWith('video:')) {
    return `<video controls${properties}/>`
  } else {
    // XXX: do all images need to be wrapped in links?
    return `<a href="${url}"><img${properties}></a>`
  }
}

module.exports = (text, opts) => {
  const normalized = nodeEmoji.replace('' + text || '', (emoji) => `:${emoji.key}:`)
  config = Object.assign({}, defaults, opts)

  Object.values(config.protocols.concat(additionalProtocols)).forEach(protocol => {
    if (!existingProtocols.includes(protocol)) {
      existingProtocols.push(protocol)
      md.linkify.add(protocol + ':', 'http:')
    }
  })

  return md.render(normalized)
}
