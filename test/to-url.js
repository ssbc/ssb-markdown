var tape = require('tape')

var markdown = require('../')

tape('toUrl behaves with markdown link', function (t) {
  var LINK = '%qcdW859vSp/bQCA8qiPsirrCrjlIUHeq80QRjhCKYvU=.sha256'
  const mdLink = `[link](${LINK})`

  const actual = markdown.block(mdLink, {
    toUrl: function (url) {
      console.log('called 1')
      t.equal(url, LINK)
      return '/thread?id=' + LINK
    }
  })

  t.equal(
    actual,
    '<p><a href="/thread?id=' + LINK + '">link</a></p>\n'
  )

  t.end()
})

tape('toUrl behaves with raw link', function (t) {
  t.plan(3)

  var LINK = '%qcdW859vSp/bQCA8qiPsirrCrjlIUHeq80QRjhCKYvU=.sha256'
  const mdLink = 'hello: ' + LINK

  t.equal(
    markdown.block(mdLink, {
      toUrl: function (url) {
        t.equal(url, LINK)
        return '/thread?id=' + LINK
      }
    }).trim(),
    '<p>hello: <a href="/thread?id=' + LINK + '">' + LINK.substring(0, 6) + '...</a></p>'
  )
  t.end()
})

tape('toUrl falls back if return false', function (t) {
  var LINK = 'http://example.com'
  t.equal(
    markdown.block(
      'hello: ' + LINK,
      {
        toUrl: function (url) {
          t.equal(url, LINK)
          return false
        }
      }
    ).trim(),
    '<p>hello: <a href="http://example.com" target="_blank" rel="noopener">http://example.com</a></p>'.trim()
  )
  t.end()
})
