let blocked = false

function blockDevtools() {
  document.addEventListener('contextmenu', (e) => e.preventDefault())
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') e.preventDefault()
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) e.preventDefault()
    if (e.ctrlKey && e.key.toUpperCase() === 'U') e.preventDefault()
  })
}

function showBlocked() {
  if (blocked) return
  blocked = true
  const div = document.createElement('div')
  div.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#0f172a;color:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif;direction:rtl;'
  const title = document.createElement('h1')
  title.style.cssText = 'font-size:22px;font-weight:700;margin:0;'
  title.textContent = '⚠️ أدوات المطور غير متاحة'
  const sub = document.createElement('p')
  sub.style.cssText = 'font-size:15px;color:#94a3b8;margin:0;'
  sub.textContent = 'هذه الصفحة محمية — أغلق أدوات المطور للمتابعة'
  div.appendChild(title)
  div.appendChild(sub)
  document.body.appendChild(div)
}

function watchDevtools() {
  let lastTime = 0
  const interval = window.setInterval(() => {
    const t = Date.now()
    const threshold = 160
    const width = window.outerWidth - window.innerWidth
    const height = window.outerHeight - window.innerHeight
    if (width > threshold || height > threshold) {
      showBlocked()
    } else {
      const element = new Image()
      Object.defineProperty(element, 'id', {
        get() {
          showBlocked()
          return ''
        },
      })
      console.log('%c', element)
    }
    if (lastTime && t - lastTime > 5000) showBlocked()
    lastTime = t
    debugger
  }, 1000)
  void interval
}

blockDevtools()
watchDevtools()