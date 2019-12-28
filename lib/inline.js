const Emoji = require('node-emoji')
const emojiRegex = require('emoji-regex')
const util = require('./util')
const emojiByShortcode = require('markdown-it-emoji/lib/data/full.json')

const defaults = {
  imageLink: ref => ref,
  toUrl: ref => ref,
  protocols: []
}

let config = {}

const md = require('markdown-it')()
  .use(require('markdown-it-emoji'), {
    // default to emoji from markdown-it
    // seems like node-emoji has non-standard shortcode names
    defs: Object.assign({}, Emoji.emoji, emojiByShortcode),
    shortcuts: {}
  })
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
module.exports = (input, opts) => {
  // Ensure text is a string (or coerce to empty string)
  const text = '' + input || ''

  // Extend default config with custom options
  config = Object.assign({}, defaults, opts)

  // Remove newlines and apply all plugins defined in this file
  let result = util.replaceNewlines(md.renderInline(text))

  if (config.emoji) {
    // Replace emoji with `config.emoji()` output
    const regex = emojiRegex()
    result = result.replace(regex, config.emoji)
  }

  // Circumvent bug that adds extra bytes
  return util.removeBadBytes(result)
}
