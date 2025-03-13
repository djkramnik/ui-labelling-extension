;(function main() {
  const logPrefix = '[UI-LABELLER] '

  const log = {
    warn: (...args: any[]) => console.warn(logPrefix, ...args),
    info: (...args: any[]) => console.log(logPrefix, ...args),
    error: (...args: any[]) => console.error(logPrefix, ...args)
  }

  type ExtensionState =
    | 'dormant'
    | 'initial'
    | 'navigation'
    | 'confirmation'

  const globals: {
    state: ExtensionState
    currEl: null | HTMLElement
    overlayId: string
    annotations: ({
      id: string
      ref: HTMLElement
      rect: DOMRect
    }[])
  } = {
    state: 'initial',
    overlayId: 'ui-labelling-overlay',
    annotations: [],
    currEl: null
  }

  function init() {
    // temp measure
    // I want to keep this extension active but not screw up my regular navigating while I develop it
    if (window.location.href !== 'https://news.ycombinator.com/') {
      log.info('Not combinator, so not doing anything')
      return
    }

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

    overlay.addEventListener('mousedown', _handleMouseWrap)

    function _handleMouseWrap(event: MouseEvent) {
      overlay.style.pointerEvents = 'none'
      overlay.removeEventListener('mousedown', _handleMouseWrap)
      setTimeout(() => {
        try {
          handleMouseDown(event, overlay)
        } catch(err) {
          log.error(err)
        } finally {
          overlay.style.pointerEvents = 'initial'
        }
      }, 0)
    }

  }

  init()

  function handleMouseDown(event: MouseEvent, overlay: HTMLElement) {
    if (globals.state !== 'initial') {
      return
    }
    const mx = event.pageX
    const my = event.pageY
    const realTarget = document.elementFromPoint(mx, my) as HTMLElement
    overlay.style.pointerEvents = 'initial'
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
    drawBorder(realTarget, overlay)
    globals.currEl = realTarget
    globals.state = 'navigation'
    handleStateChange(globals.state)
  }

  function drawBorder(element: HTMLElement, overlay: HTMLElement) {
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
    annotation.style.border= `2px solid #0FFF50`

    overlay.appendChild(annotation)
  }

  function handleStateChange(state: ExtensionState) {
    switch(state) {
      case 'navigation':
        window.addEventListener('keypress', handleKeyPress)
        break
      case 'confirmation':
      case 'dormant':
      case 'initial':
        window.removeEventListener('keypress', handleKeyPress)
        break
    }

    function handleKeyPress(event: KeyboardEvent) {
      if (!globals.currEl) {
        log.error('no current element to navigate from')
        return
      }
      const parent: HTMLElement | null = globals.currEl.parentElement
      const children: HTMLElement[] = parent
        ? Array.from(parent.getElementsByTagName('*'))
        : []
      const currIndex: number | null = parent
        ? Array.from(parent.getElementsByTagName('*')).indexOf(globals.currEl)
        : -1

      switch(event.key) {
        case 'ArrowLeft':
          if (!parent || currIndex === -1) {
            log.warn('arrowleft', 'cannot find parent node')
            break
          }
          globals.currEl = Array.from(parent.getElementsByTagName('*'))[]

          break
        case 'ArrowRight':
          break
        case 'ArrowUp':
          break
        case 'ArrowDown':
          break
      }
    }

  }
})()
