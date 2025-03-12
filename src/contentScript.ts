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

    overlay.addEventListener('mousedown', event => {
      overlay.style.pointerEvents = 'none'
      setTimeout(() => {
        try {
          handleMouseDown(event, overlay)
        } catch(err) {
          log.error(err)
        } finally {
          overlay.style.pointerEvents = 'initial'
        }
      }, 0)
    })

  }

  init()

  function handleMouseDown(event: MouseEvent, overlay: HTMLElement) {
    const mx = event.pageX
    const my = event.pageY
    const realTarget = document.elementFromPoint(mx, my) as HTMLElement
    if (!realTarget || typeof realTarget.getBoundingClientRect !== 'function') {
      log.warn('no real target found', realTarget)
      return
    }
    log.info('real target found', realTarget)
  }

  function visualizeAnnotation(element: HTMLElement) {

  }
})()
