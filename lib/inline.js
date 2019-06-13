const emoji = require('node-emoji')
const emojiRegex = require('emoji-regex')
const util = require('./util')

const defaults = {
  imageLink: ref => ref,
  toUrl: ref => ref,
  protocols: []
}

let config = {}

const md = require('markdown-it')()
  .use(require('markdown-it-emoji'), { shortcuts: {} })

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
module.exports = (text, opts) => {
  let normalized = emoji.unemojify('' + text || '')

  config = Object.assign({}, defaults, opts)

  let result = util.replaceNewlines(md.renderInline(normalized))

  if (config.emoji) {
    const regex = emojiRegex()
    result = result.replace(regex, x => config.emoji(emoji.which(x) || x))
  }

  return util.removeBadBytes(result)
}
