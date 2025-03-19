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

  const annotationLabels = [
    'table',
    'list',
    'row-container',
    'column-container',
    'link',
    'button'
  ]

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

    const formOverlay = document.createElement('div')
    formOverlay.style.position = 'absolute'
    formOverlay.style.display = 'none'
    formOverlay.style.alignItems = 'center'
    formOverlay.style.justifyContent = 'center'
    formOverlay.style.top = '0'
    formOverlay.style.left = '0'
    formOverlay.style.width = '100%'
    formOverlay.style.height = '100%'

    const annotationForm = document.createElement('form')
    annotationForm.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
    annotationForm.style.borderRadius = '8px'
    annotationForm.style.padding = '40px'
    const formHeading = document.createElement('h3')
    formHeading.style.color = '#333'
    formHeading.innerText = 'Set Label'
    annotationForm.appendChild(formHeading)
    const annotationSelect = document.createElement('select')
    formOverlay.appendChild(annotationForm)
    annotationForm.appendChild(annotationSelect)

    annotationForm.addEventListener('submit', event => {
      event.preventDefault()
      log.info(annotationSelect.value)
      if (globals.currEl !== null) {
        globals.annotations = globals.annotations.concat({
          id: String(new Date().getTime()),
          ref: globals.currEl,
          rect: globals.currEl.getBoundingClientRect()
        })
      }

      globals.state = 'initial'
    })

    annotationLabels.forEach((s: string) => {
      const option = document.createElement('option')
      option.value = s
      option.innerText = s
      annotationSelect.appendChild(option)
    })

    const submitButton = document.createElement('button')
    submitButton.innerText = 'submit'
    submitButton.setAttribute('type', 'submit')
    annotationForm.appendChild(submitButton)

    const cancelButton = document.createElement('button')
    cancelButton.innerText = 'cancel'
    cancelButton.setAttribute('type', 'button')
    annotationForm.appendChild(cancelButton)

    overlay.appendChild(formOverlay)

    globals.state = 'initial'

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
          formOverlay.style.display = 'none'
          overlay.removeEventListener('mousedown', _handleMouseWrap)
          window.removeEventListener('keypress', handleKeyPress)

          if (value === 'initial') {
            removeBorders()
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
      formOverlay.style.display = 'flex'
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
        case 'q':
          globals.state = 'initial'
          break
        case 'j':
          if (!parent || currIndex === -1) {
            log.warn('arrowleft', 'cannot find parent node')
            break
          }
          if (siblings.length < 2) {
            log.warn('arrowleft', 'no siblings')
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
          if (siblings.length < 2) {
            log.warn('arrowright', 'no siblings')
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
          const firstDifferentlyShapedParent = traverseUp(globals.currEl)
          if (!firstDifferentlyShapedParent) {
            log.warn('arrowup', 'no differently shaped parent')
            break
          }
          globals.currEl = firstDifferentlyShapedParent
          break
        case 'k':
          const currChildren = Array.from(globals.currEl.children)
          if (!currChildren.length) {
            log.warn('arrowdown', 'no children', globals.currEl)
            break
          }
          const firstDifferentlyShapedChild = traverseDown(globals.currEl)
          if (!firstDifferentlyShapedChild) {
            log.warn('arrowdown', 'no differently shaped children')
            break
          }
          globals.currEl = firstDifferentlyShapedChild
          break
        case 'Enter':
          globals.state = 'confirmation'
          break
      }
    }

    // utils
    function traverseUp(el: HTMLElement, tolerance: number = 10): HTMLElement | null {
      if (el === document.body) {
        return null
      }
      const parent = el.parentElement
      if (!parent) {
        return null
      }
      const boxesMatch = boxesTheSame(el.getBoundingClientRect(), parent.getBoundingClientRect(), tolerance)
      if (boxesMatch) {
        return traverseUp(parent, tolerance)
      }

      return parent
    }

    function traverseDown(el: HTMLElement, tolerance: number = 10): HTMLElement | null {
      if (el.children.length < 1) {
        return null
      }
      const bbox = el.getBoundingClientRect()
      const firstDifferentlyShapedChild = Array.from(el.children)
        .find(c => !boxesTheSame(
          bbox,
          c.getBoundingClientRect(),
          tolerance))
      if (firstDifferentlyShapedChild) {
        return firstDifferentlyShapedChild as HTMLElement
      }
      return traverseDown(el.children[0] as HTMLElement, tolerance)
    }

    function boxesTheSame (bb1: DOMRect, bb2: DOMRect, tolerance: number): boolean {
      return Math.abs(bb1.top - bb2.top) < tolerance &&
        Math.abs(bb1.left - bb2.left) < tolerance &&
        Math.abs(bb1.right - bb2.right) < tolerance &&
        Math.abs(bb1.bottom - bb2.bottom) < tolerance
    }
  }

  init()

})()
