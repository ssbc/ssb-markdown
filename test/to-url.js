
var tape = require('tape')

var markdown = require('../')

tape('toUrl behaves with markdown link', function (t) {

  var LINK = '%qcdW859vSp/bQCA8qiPsirrCrjlIUHeq80QRjhCKYvU=.sha256'
  t.equal(
    markdown.block(
      '[link](' + LINK +')',
      {toUrl: function (url) {
        t.equal(url, LINK)
        return '/thread?id='+LINK
      }}
    ),
    '<p><a href="/thread?id='+LINK+'" target="_blank">link</a></p>\n'
  )
  t.end()


})

tape('toUrl behaves with raw link', function (t) {
  t.plan(2)
  var LINK = '%qcdW859vSp/bQCA8qiPsirrCrjlIUHeq80QRjhCKYvU=.sha256'
  t.equal(
    markdown.block(
      'hello: ' + LINK,
      {toUrl: function (url) {
        t.equal(url, LINK)
        return '/thread?id='+LINK
      }}
    ).trim(),
    '<p>hello: <a href="/thread?id='+LINK+'" target="_blank">'+LINK.substring(0, 6)+'...</a></p>'
  )
  t.end()

})

tape('toUrl falls back if return false', function (t) {

  var LINK = 'http://example.com'
  t.equal(
    markdown.block(
      'hello: ' + LINK,
      {toUrl: function (url) {
        t.equal(url, LINK)
        return false
      }}
    ).trim(),
    '<p>hello: <a href="http://example.com" target="_blank">http://example.com</a></p>'.trim()
  )
  t.end()

})
