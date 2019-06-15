module.exports = {
  replaceNewlines: text => text.replace(/\n+(?!$)/g, ' '),
  formatSigilText: sigilText => {
    return sigilText.replace(/^%/, '%25').slice(0, 8) + '...'
  },
  // https://github.com/joypixels/emojione/issues/644
  removeBadBytes: text =>
    text
      .split('')
      .filter(f => f.codePointAt(0) !== 0xfe0f)
      .join('')
}
