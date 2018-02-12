'use strict'
var emojiNamedCharacters = require('emoji-named-characters')
var marked = require('ssb-marked')
var ssbref = require('ssb-ref')
var mlib   = require('ssb-msgs')

var blockRenderer = new marked.Renderer()
var inlineRenderer = new marked.Renderer()

// override to only allow external links or hashes, and correctly link to ssb objects
blockRenderer.urltransform = function (url) {
  var c = url.charAt(0)
  var hasSigil = (c === '@' || c === '&' || c === '%' || c === '#')

  if (this.options.sanitize && !hasSigil) {
    // sanitize - only allow ssb refs or external links
    try {
      var prot = decodeURIComponent(unescape(url.replace(/[^\w:]/g, ''))).toLowerCase();
    } catch (e) {
      return false;
    }
    if (!isFullLink(this.options.protocols, prot)) {
      return false;
    }
  }

  // use our own link if this is an ssb ref
  var isSsbRef = ssbref.isLink(url)
  if ((hasSigil || isSsbRef) && this.options.toUrl) {
    return this.options.toUrl(url, false)
  }
  return url
}

// override to make http/s (or other specified protocol) links external
blockRenderer.link = function(href, title, text) {
  href = this.urltransform(href)
  var out
  if (href !== false) {
    if ((href.indexOf('/%26') === 0 || href.indexOf('/&') === 0) && (title || text)) // add ?name param if this is a link to a blob
      href += '?name='+encodeURIComponent(title || text)
    out = '<a href="' + href + '"';
  } else
    out = '<a class="bad"'
  if (title) {
    out += ' title="' + title + '"';
  }

  // make a popup if its a external link
  if (href && isFullLink(this.options.protocols, href))
    out += ' target="_blank"'

  out += '>' + text + '</a>';
  return out;
};

blockRenderer.image  = function (href, title, text) {
  href = href.replace(/^&amp;/, '&')
  if (this.options.toUrl) {
    var url = this.options.toUrl(href, true)
    var hrefAttr = this.options.imageLink
      ? ' href="' + this.options.imageLink(href) + '"'
      : ''
    var titleAttr = title
      ? ' title="' + title + '"'
      : ''

    return '<a' + hrefAttr + '><img src="'+url+'" alt="' + text + '"' + titleAttr + '></a>'
  }
  return text
}

// inline renderer just spits out the text of links and images
inlineRenderer.urltransform = function (url) { return false }
inlineRenderer.link = function (href, title, text) { return unquote(shortenIfLink(text)) }
inlineRenderer.image  = function (href, title, text) { return unquote(shortenIfLink(text)) }
inlineRenderer.code = function(code, lang, escaped) { return escaped ? code : escape(code) }
inlineRenderer.blockquote = function(quote) { return unquote(quote) }
inlineRenderer.html = function(html) { return false }
inlineRenderer.heading = function(text, level, raw) { return unquote(text)+' ' }
inlineRenderer.hr = function() { return ' --- ' }
inlineRenderer.br = function() { return ' ' }
inlineRenderer.list = function(body, ordered) { return unquote(body) }
inlineRenderer.listitem = function(text) { return '- '+unquote(text) }
inlineRenderer.paragraph = function(text) { return unquote(text)+' ' }
inlineRenderer.table = function(header, body) { return unquote(header + ' ' + body) }
inlineRenderer.tablerow = function(content) { return unquote(content) }
inlineRenderer.tablecell = function(content, flags) { return unquote(content) }
inlineRenderer.strong = function(text) { return unquote(text) }
inlineRenderer.em = function(text) { return unquote(text) }
inlineRenderer.codespan = function(text) { return unquote(text) }
inlineRenderer.del = function(text) { return unquote(text) }
inlineRenderer.mention = function(preceding, id) { return shortenIfLink(unquote((preceding||'') + id)) }
inlineRenderer.hashtag = function(preceding, tag) { return unquote((preceding||'') + tag) }
function unquote (text) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'')
}
function escape (text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n+/g, ' ')
}
function shortenIfLink (text) {
  return (ssbref.isLink(text.trim())) ? text.slice(0, 8) : text
}

marked.setOptions({
  gfm: true,
  mentions: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  emoji: renderEmoji(16),
  protocols: ['http','https','data'],
  renderer: blockRenderer
})

exports.block = function(text, opts) {
  return marked(''+(text||''), opts)
}

exports.inline = function(text) {
  return marked(''+(text||''), { renderer: inlineRenderer, emoji: renderEmoji(12) })
}

var emojiRegex = /(\s|>|^)?:([A-z0-9_]+):(\s|<|$)/g;
exports.emojis = function (str) {
  return str.replace(emojiRegex, function(full, $1, $2, $3) {
    return ($1||'') + renderEmoji(16)($2) + ($3||'')
  })
}

function renderEmoji (size) {
  size = size||20
  return function (emoji) {
    return emoji in emojiNamedCharacters ?
        '<img src="./img/emoji/' + encodeURI(emoji) + '.png"'
        + ' alt=":' + escape(emoji) + ':"'
        + ' title=":' + escape(emoji) + ':"'
        + ' class="emoji" align="absmiddle" height="'+size+'" width="'+size+'">'
      : ':' + emoji + ':'
    }
}

function isFullLink (protocols, href) {
  protocols = protocols || []
  href = href.split(':')[0]
  return protocols.indexOf(href) !== -1;
}



