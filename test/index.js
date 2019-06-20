var tape = require('tape')
var ssbref = require('ssb-ref')
var mlib = require('ssb-msgs')

var input = require('./input.json')
var output = require('./output.json')
var outputInline = require('./output-inline.json')
var markdown = require('../')

var tests = [
  'message with link',
  'message with image',
  'message with "@" mentions',
  'message with emoji',
  'message with ascii emoji',
  'message with inline html in code block',
  'message with hashtag',
  'message with customs protocols',
  'message with links, mentions, headers, and code',
  'message with both emoji and :shortcodes:',
  'message with compound emoji',
  "message with node-emoji shortcodes"
]

// behavior expected by current tests
var emoji = (size) => {
  size = size || 16
  return (emoji) => {
    const image = {
      src: `./img/emoji/${emoji}.png`,
      alt: `:${emoji}:`,
      title: `:${emoji}:`,
      class: 'emoji',
      align: 'absmiddle',
      height: size,
      width: size
    }

    let properties = ''
    Object.keys(image).forEach(key => {
      const value = image[key]
      properties += ` ${key}="${value}"`
    })

    return `<img${properties}>`
  }
}

// run tests over input and output for current defaults.
tests.forEach(function (e, i) {
  tape(e, function (t) {
    // extract mention names
    var mentionNames = {}
    mlib.links(input[i].content.mentions, 'feed').forEach(function (link) {
      if (link.name && typeof link.name === 'string') {
        var name = (link.name.charAt(0) === '@') ? link.name : '@' + link.name
        mentionNames[name] = link.link
      }
    })
    var toUrl = function (ref, isImage) {
      // @-mentions
      if (ref in mentionNames) {
        return '#/profile/' + encodeURIComponent(mentionNames[ref])
      }

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
    }

    var imageLink = function (ref) {
      return '#' + ref
    }

    t.equal(
      markdown.block(input[i].content.text, {
        toUrl: toUrl,
        imageLink: imageLink,
        emoji: emoji(16)
      }),
      output[i]
    )
    t.end()
  })
  tape(e, function (t) {
    t.equal(
      markdown.inline(input[i].content.text, {
        emoji: emoji(12)
      }),
      outputInline[i]
    )
    t.end()
  })
})
