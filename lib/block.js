const Emoji = require('node-emoji')
const emojiRegex = require('emoji-regex')
const hljs = require('highlight.js')
const util = require('./util')
const emojiByShortcode = require('markdown-it-emoji/lib/data/full.json')
const hashtagRegex = require('hashtag-regex')
const ssbRef = require('ssb-ref')

// The hashtag-regex module comes with a regex that auto-detects the number sign
// characters, but markdown-it-hashtag wants to handle that by itself. This
// function strips the # detection from the hashtag-regex output so that it
// can be used with the markdown-it-hashtag module. Yay, plumbing!
const getHashtagRegexCaptureGroup = () => {
  const string = hashtagRegex().toString()
  const start = string.indexOf('(')
  const end = string.lastIndexOf('/')

  return string.slice(start, end)
}

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
  .use(require('markdown-it-hashtag'), {
    hashtagRegExp: getHashtagRegexCaptureGroup()
  })
  .use(require('markdown-it-emoji'), {
    // default to emoji from markdown-it
    // seems like node-emoji has non-standard shortcode names
    defs: Object.assign({}, Emoji.emoji, emojiByShortcode),
    shortcuts: {}
  })

// hashtag
md.renderer.rules.hashtag_open = function (tokens, idx, options, env, self) {
  const tagName = tokens[idx].content.toLowerCase()
  const href = config.toUrl('#' + tagName)
  tokens[idx].tag = 'a'
  tokens[idx].attrSet('href', href)
  return self.renderToken(tokens, idx, options)
}

// links
var oldLinkOpenRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href')
  if (href.indexOf('not-allowed-as-link') >= 0) {
    tokens[idx].attrSet('class', 'bad')
    tokens[idx].attrs = tokens[idx].attrs
      .filter(([key]) =>
        key !== 'href'
      )
  } else {
    let decoded

    try {
      decoded = decodeURI(href)
    } catch (e) {
      decoded = href
    }

    const result = config.toUrl(decoded)

    if (result) {
      // If result is truthy it's a link handled by to-url
      tokens[idx].attrSet('href', result)
    } else {
      // Otherwise it's an external link, use `target="_blank"`
      // Maybe we shouldn't be doing this? https://css-tricks.com/use-target_blank/
      tokens[idx].attrSet('target', '_blank')

      // https://mathiasbynens.github.io/rel-noopener/
      tokens[idx].attrSet('rel', 'noopener')
    }
  }

  return oldLinkOpenRender(tokens, idx, options, env, self)
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
      match.url = encodeURI(match.raw)
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
    match.url = match.raw
    if (sigilRegExp.test(match.raw)) {
      match.text = util.formatSigilText(match.text)
    }
  }
})

// image
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]

  const rawSrc = token.attrGet('src')

  const link = ssbRef.parseLink(rawSrc)
  const srcText = ssbRef.isBlob(link ? link.link : '') ? rawSrc : ''

  const title = token.attrGet('title')
  const alt = token.content
  const src = config.toUrl(srcText, true)

  const media = {
    src,
    alt,
    title
  }

  Object
    .entries(media)
    .forEach(([key, value]) => {
      if (value != null) {
        tokens[idx].attrSet(key, value)
      }
    })

  if (alt.startsWith('audio:')) {
    tokens[idx].tag = 'audio'
    tokens[idx].attrSet('controls')
  } else if (alt.startsWith('video:')) {
    tokens[idx].tag = 'video'
    tokens[idx].attrSet('controls')
  }

  return self.renderToken(tokens, idx, options)
}

module.exports = (input, opts) => {
  // Ensure text is a string (or coerce to empty string)
  const text = '' + input || ''

  // Extend default config with custom options
  config = Object.assign({}, defaults, opts)

  // Handle additional protocols configured by options
  Object.values(config.protocols.concat(additionalProtocols)).forEach(protocol => {
    if (!existingProtocols.includes(protocol)) {
      existingProtocols.push(protocol)
      md.linkify.add(protocol + ':', 'http:')
    }
  })

  const oldConfigToUrl = config.toUrl || ((x) => x)

  // Ensure emoji are always URI-encoded in URIs so that they never get the
  // config.emoji() function applied to them.
  if (config.emoji) {
    const regex = emojiRegex()
    config.toUrl = (x) => {
      const result = oldConfigToUrl(x)
      if (typeof result === 'string') {
        return result.replace(regex, encodeURIComponent)
      } else {
        return result
      }
    }
  }

  // Apply all plugins defined in this file
  let result = md.render(text)

  if (config.emoji) {
    // Replace emoji with `config.emoji()` output
    const regex = emojiRegex()
    result = result.replace(regex, config.emoji)
  }

  // Circumvent bug that adds extra bytes
  return util.removeBadBytes(result)
}
