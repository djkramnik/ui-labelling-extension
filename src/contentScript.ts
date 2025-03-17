type ExtensionState =
| 'dormant'
| 'initial'
| 'navigation'
| 'confirmation'

type GlobalState = {
  state: ExtensionState
  currEl: null | HTMLElement
  overlayId: string
  annotations: ({
    id: string
    ref: HTMLElement
    rect: DOMRect
  }[])
}

;(function main() {
  const logPrefix = '[UI-LABELLER] '

  const log = {
    warn: (...args: any[]) => console.warn(logPrefix, ...args),
    info: (...args: any[]) => console.log(logPrefix, ...args),
    error: (...args: any[]) => console.error(logPrefix, ...args)
  }

  function GlobalState(cb: (key: keyof GlobalState, value: any) => void) {
    let state: ExtensionState = 'dormant'
    let annotations: ({
      id: string
      ref: HTMLElement
      rect: DOMRect
    }[]) = []
    let overlayId: string = 'ui-labelling-overlay'
    let currEl: HTMLElement | null = null
    const obj: GlobalState = {
      state,
      annotations,
      overlayId,
      currEl,
    }
    Object.defineProperty(obj, 'state', {
      set: (value) => {
        cb('state', value)
        state = value
      },
      get: () => state
    });
    Object.defineProperty(obj, 'annotations', {
      set: (value) => {
        cb('annotations', value)
        annotations = value
      },
      get: () => annotations
    });
    Object.defineProperty(obj, 'overlayId', {
      get: () => overlayId
    });
    Object.defineProperty(obj, 'currEl', {
      set: (value) => {
        cb('currEl', value)
        currEl = value
      },
      get: () => currEl
    })

    return obj
  }


  function init() {
    const globals = GlobalState(handleGlobalChange)
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

    globals.state = 'initial'

    function handleGlobalChange(key: keyof GlobalState, value: any) {
      log.info('om gee')
      switch(key) {
        case 'annotations':
          log.info('update to annotations', value)
          break
        case 'currEl':
          if (globals.state === 'navigation' && value) {
            removeBorders()
            drawBorder(value as HTMLElement, overlay)
          }
          log.info('update to currEl', value)
          break
        case 'state':
          overlay.removeEventListener('mousedown', _handleMouseWrap)
          window.removeEventListener('keypress', handleKeyPress)

          if (value === 'initial') {
            overlay.addEventListener('mousedown', _handleMouseWrap)
            log.info('added mousedown listener')
          } else if (value === 'navigation') {
            window.addEventListener('keypress', handleKeyPress)
          } else if (value === 'confirmation') {
            showConfirmationPopup()
          }
          log.info('update to state', value)
          break
        default:
          log.info('undefined globals change', key, value)
      }
    }

    function showConfirmationPopup() {
      window.alert('you sure about this brah')
      globals.state = 'initial'
    }

    function _handleMouseWrap(event: MouseEvent) {
      log.info('_handleMouseWrap')
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

    function handleMouseDown(event: MouseEvent, overlay: HTMLElement) {
      log.info('_handleMouseDown', event)
      if (globals.state !== 'initial') {
        log.warn('I shall return', globals)
        return
      }

      const mx = event.pageX
      const my = event.pageY
      const realTarget = document.elementFromPoint(mx, my) as HTMLElement
      overlay.style.pointerEvents = 'initial'

      log.info('real target?', realTarget)

      if (!realTarget || typeof realTarget.getBoundingClientRect !== 'function') {
        log.warn('no real target found', realTarget)
        overlay.addEventListener('mousedown', _handleMouseWrap)
        return
      }

      // prevent overly big annotations
      if (realTarget.clientWidth > (overlay.clientWidth * 0.9) && realTarget.clientHeight > (overlay.clientHeight * 0.9)) {
        log.warn('annotation too big. skipping', realTarget)
        overlay.addEventListener('mousedown', _handleMouseWrap)
        return
      }

      log.info('real target found', realTarget)

      // create a bounding box on the overlay with all the associated doodads and callbacks
      globals.state = 'navigation'
      globals.currEl = realTarget
    }

    function removeBorders() {
      log.info('_removeBorders')
      Array.from(document.querySelectorAll('[id*="annotation_"]'))
        .forEach(el => el.remove())
    }

    function drawBorder(element: HTMLElement, overlay: HTMLElement) {
      log.info('drawBorder')
      const annotation = document.createElement('div')
      const bbox = element.getBoundingClientRect()
      const { top, left, width, height } = bbox
      const annotationId = String(new Date().getTime())

      annotation.setAttribute('id', 'annotation_' + annotationId)
      annotation.style.position = 'fixed'
      annotation.style.width = width + 'px'
      annotation.style.height = height + 'px'
      annotation.style.top = top + 'px'
      annotation.style.left = left + 'px'
      annotation.style.border= `2px solid #0FFF50`

      overlay.appendChild(annotation)
    }

    function handleKeyPress(event: KeyboardEvent) {
      log.info('jejus', globals, event.key)
      if (!globals.currEl) {
        log.error('no current element to navigate from')
        return
      }
      const parent: HTMLElement | null = globals.currEl.parentElement
      const siblings: HTMLElement[] = parent
        ? Array.from(parent.children) as HTMLElement[]
        : []
      const currIndex: number | null = parent
        ? Array.from(parent.children).indexOf(globals.currEl)
        : -1

      let newIndex
      log.info('keypressed', event.key)
      switch(event.key) {

        case 'j':
          if (!parent || currIndex === -1) {
            log.warn('arrowleft', 'cannot find parent node')
            break
          }
          newIndex = currIndex - 1
          if (newIndex < 0) {
            newIndex = siblings.length - 1
          }
          globals.currEl = siblings[newIndex] as HTMLElement
          break
        case 'l':
          if (!parent || currIndex === -1) {
            log.warn('arrowright', 'cannot find parent node')
            break
          }
          newIndex = currIndex + 1
          if (newIndex > siblings.length - 1) {
            newIndex = 0
          }
          globals.currEl = siblings[newIndex] as HTMLElement
          break
        case 'i':
          if (!globals.currEl.parentElement || globals.currEl.parentElement === document.body) {
            log.warn('arrowup', 'no parent node')
            break
          }
          globals.currEl = globals.currEl.parentElement
          break
        case 'k':
          const currChildren = Array.from(globals.currEl.children)
          if (!currChildren.length) {
            log.warn('arrowdown', 'no children', globals.currEl)
            break
          }
          globals.currEl = globals.currEl.children[0] as HTMLElement
          break
        case 'Enter':
          globals.state = 'confirmation'
          break
      }
    }

  }

  init()


})()
