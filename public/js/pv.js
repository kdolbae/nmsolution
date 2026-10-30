(function () {
  var s = document.currentScript, v = s && s.getAttribute('data-v')
  if (!v || !navigator.sendBeacon) return
  var t0 = Date.now(), active = 0, scroll = 0, sections = {}, clicks = [], events = [], dirty = true
  var now = function () { return Math.round((Date.now() - t0) / 1000) }
  var txt = function (el) { return ((el && (el.getAttribute('aria-label') || el.alt || el.title || el.textContent)) || '').replace(/\s+/g, ' ').trim().slice(0, 60) }
  var ev = function (label) { if (events.length < 300) events.push({ t: now(), label: label }); dirty = true }
  var heads = function () { return document.querySelectorAll('h1,h2,h3') }

  function current() {
    var hs = heads(), pick = null, line = innerHeight * 0.4
    for (var i = 0; i < hs.length; i++) { if (hs[i].getBoundingClientRect().top < line) pick = hs[i]; else break }
    return pick ? txt(pick) : '(처음)'
  }
  setInterval(function () {
    if (document.visibilityState !== 'visible') return
    active++
    var k = current(); sections[k] = (sections[k] || 0) + 1
    var h = document.documentElement, p = Math.round(((scrollY + innerHeight) / Math.max(h.scrollHeight, 1)) * 100)
    if (p > scroll) scroll = Math.min(p, 100)
    dirty = true
  }, 1000)

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a,button,img,figure,summary,video,th,td,li,h1,h2,h3,h4,p') : null
    if (!el || clicks.length >= 300) return
    clicks.push({ t: now(), label: el.tagName.toLowerCase() + ': ' + (txt(el) || (el.querySelector && txt(el.querySelector('img'))) || '') })
    dirty = true
  }, true)
  document.addEventListener('copy', function () { ev('복사: ' + String(getSelection()).replace(/\s+/g, ' ').slice(0, 80)) })
  document.addEventListener('contextmenu', function (e) { ev('우클릭: ' + txt(e.target)) })
  var typed = false
  document.addEventListener('input', function (e) { if (!typed && e.target && e.target.type === 'password') { typed = true; ev('비밀번호 입력 시작') } }, true)
  document.addEventListener('submit', function () { ev('열기 누름'); send() }, true)
  addEventListener('beforeprint', function () { ev('인쇄') })
  document.addEventListener('play', function (e) { ev('영상 재생: ' + txt(e.target)) }, true)
  document.addEventListener('visibilitychange', function () { ev(document.visibilityState === 'visible' ? '다시 봄' : '다른 화면으로') ; if (document.visibilityState === 'hidden') send() })
  addEventListener('pagehide', function () { ev('나감'); send() })

  function send() {
    if (!dirty) return
    dirty = false
    var body = JSON.stringify({ v: v, seconds: active, total: now(), scroll: scroll, sections: sections, clicks: clicks, events: events,
      screen: screen.width + 'x' + screen.height, lang: navigator.language, tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone })
    navigator.sendBeacon('/api/pv', new Blob([body], { type: 'text/plain' }))
  }
  setInterval(send, 15000)
  send()
  setTimeout(send, 4000)
})()
