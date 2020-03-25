var tape = require('tape')
var ssbref = require('ssb-ref')
var mlib = require('ssb-msgs')

var input = require('./input')
var output = require('./output')
var outputInline = require('./output-inline')
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
  'message with node-emoji shortcodes',
  'message with sigil links in proper Markdown',
  'message with non-ASCII unicode hashtag',
  'message with external image',
  'message with private image',
  'message with %70 link'
]

// behavior expected by current tests
var emoji = (emoji) => `<span class="emoji">${emoji}</span>`

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

      const link = ssbref.parseLink(ref)

      // standard ssb-refs
      if (ssbref.isFeedId(ref)) {
        return '#/profile/' + encodeURIComponent(ref)
      } else if (ssbref.isMsgId(ref)) {
        return '#/msg/' + encodeURIComponent(ref)
      } else if (ssbref.isBlobId(link ? link.link : ref)) {
        return '/' + encodeURIComponent(ref)
      } else if (ref && ref[0] === '#') {
        return '#/channel/' + ref.substr(1)
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
        emoji
      }),
      output[i]
    )
    t.end()
  })
  tape(e, function (t) {
    t.equal(
      markdown.inline(input[i].content.text, {
        emoji
      }),
      outputInline[i]
    )
    t.end()
  })
})
