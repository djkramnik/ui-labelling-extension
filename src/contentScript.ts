;(function main() {
  const logPrefix = '[UI-LABELLER] '

  const log = {
    warn: (...args: any[]) => console.warn(logPrefix, ...args),
    info: (...args: any[]) => console.log(logPrefix, ...args),
    error: (...args: any[]) => console.error(logPrefix, ...args)
  }

  const overlayId = 'ui-labelling-overlay'

  function init() {
    if (document.getElementById(overlayId)) {
      log.warn('overlay already present during initialization.  Aborting everything!')
      return
    }
    const overlay = document.createElement(overlayId)
    overlay.setAttribute('id', overlayId)

    overlay.style.position = 'fixed'
    overlay.style.width = '100vw'
    overlay.style.height = '100vh'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.zIndex = '666'

    document.body.appendChild(overlay)

    overlay.addEventListener('mousedown', handleMouseDown)

  }

  init()


  function handleMouseDown(event: MouseEvent) {
    const mx = event.pageX
    const my = event.pageY
    log.info('mouse down on overlay: ', mx, my)
  }

})()
