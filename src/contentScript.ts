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

  function subscribeToGlobalChange(
    g: GlobalState,
    cb: (key: keyof GlobalState, value: any) => void) {
    Object.keys(g).forEach(key => {
      if (!g.hasOwnProperty(key)) {
        return
      }
      Object.defineProperty(g, key, {
        set: (value) => {
          cb(key as keyof GlobalState, value)
        }
      })
    })
  }

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
    subscribeToGlobalChange(globals, handleGlobalChange)

    function handleGlobalChange(key: keyof GlobalState, value: any) {

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
          document.removeEventListener('keypress', handleKeyPress)

          if (value === 'initial') {
            overlay.addEventListener('mousedown', _handleMouseWrap)
          } else if (value === 'navigation') {
            document.addEventListener('keypress', handleKeyPress)
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
      if (globals.state !== 'initial') {
        return
      }
      const mx = event.pageX
      const my = event.pageY
      const realTarget = document.elementFromPoint(mx, my) as HTMLElement
      overlay.style.pointerEvents = 'initial'


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
      Array.from(document.querySelectorAll('[id*="annotation_]'))
        .forEach(el => el.remove())
    }

    function drawBorder(element: HTMLElement, overlay: HTMLElement) {
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
      if (!globals.currEl) {
        log.error('no current element to navigate from')
        return
      }
      const parent: HTMLElement | null = globals.currEl.parentElement
      const siblings: HTMLElement[] = parent
        ? Array.from(parent.children) as HTMLElement[]
        : []
      const currIndex: number | null = parent
        ? Array.from(parent.getElementsByTagName('*')).indexOf(globals.currEl)
        : -1

      let newIndex

      switch(event.key) {
        case 'ArrowLeft':
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
        case 'ArrowRight':
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
        case 'ArrowUp':
          if (!globals.currEl.parentElement) {
            log.warn('arrowup', 'no parent node')
            break
          }
          globals.currEl = globals.currEl.parentElement
          break
        case 'ArrowDown':
          const currChildren = Array.from(globals.currEl.children)
          if (!currChildren.length) {
            log.warn('arrowdown', 'no children')
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
