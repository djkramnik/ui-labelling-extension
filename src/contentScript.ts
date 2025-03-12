;(function main() {
  const logPrefix = '[UI-LABELLER] '

  const log = {
    warn: (...args: any[]) => console.warn(logPrefix, ...args),
    info: (...args: any[]) => console.log(logPrefix, ...args),
    error: (...args: any[]) => console.error(logPrefix, ...args)
  }

  const globals: {
    overlayId: string
    annotations: ({
      id: string
      ref: HTMLElement
      rect: DOMRect
    }[])
  } = {
    overlayId: 'ui-labelling-overlay',
    annotations: []
  }

  function init() {
    if (document.getElementById(globals.overlayId)) {
      log.warn('overlay already present during initialization.  Aborting everything!')
      return
    }
    const overlay = document.createElement(globals.overlayId)
    overlay.setAttribute('id', globals.overlayId)

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

    // prevent overly big annotations
    if (realTarget.clientWidth > (overlay.clientWidth * 0.9) && realTarget.clientHeight > (overlay.clientHeight * 0.9)) {
      log.warn('annotation too big. skipping', realTarget)
      return
    }

    log.info('real target found', realTarget)

    // create a bounding box on the overlay with all the associated doodads and callbacks
    visualizeAnnotation(realTarget, overlay)
  }

  function visualizeAnnotation(element: HTMLElement, overlay: HTMLElement) {
    const annotation = document.createElement('div')
    const bbox = element.getBoundingClientRect()
    const { top, left, width, height } = bbox
    const annotationId = String(new Date().getTime())

    annotation.setAttribute('id', annotationId)
    annotation.style.position = 'fixed'
    annotation.style.width = width + 'px'
    annotation.style.height = height + 'px'
    annotation.style.top = top + 'px'
    annotation.style.left = left + 'px'
    annotation.style.backgroundColor = `rgba(255,0,0,0.3)`

    overlay.appendChild(annotation)

    globals.annotations.push({
      id: annotationId,
      rect: bbox,
      ref: annotation
    })
  }
})()
