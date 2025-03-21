type ExtensionState =
| 'dormant'
| 'initial'
| 'navigation'
| 'confirmation'

enum StorageKeys {
  annotations = 'annotations',
  screenshot = 'screenshot',
  meta = 'meta'
}

enum AnnotationLabel {
  table = 'table',
  list = 'list',
  rowContainer = 'row-container',
  columnContainer = 'column-container',
  link = 'link',
  button = 'button'
}

type GlobalState = {
  showAnnotations: boolean
  state: ExtensionState
  currEl: null | HTMLElement
  overlayId: string
  annotations: ({
    id: string
    ref: HTMLElement
    rect: DOMRect
    label: AnnotationLabel
  }[])
}

;(function main() {
  const logPrefix = '[UI-LABELLER] '

  const log = {
    warn: (...args: any[]) => console.warn(logPrefix, ...args),
    info: (...args: any[]) => console.log(logPrefix, ...args),
    error: (...args: any[]) => console.error(logPrefix, ...args)
  }

  // label, color
  const annotationLabels: Record<AnnotationLabel, string> = {
    table: '#d0fffe',
    list: '#fffddb',
    'row-container': '#e4ffde',
    'column-container': '#ffd3fd',
    link: '#ffe7d3',
    button: '#f08080'
  }

  function GlobalState(cb: (key: keyof GlobalState, value: any) => void) {
    let state: ExtensionState = 'dormant'
    let annotations: ({
      id: string
      ref: HTMLElement
      rect: DOMRect
      label: AnnotationLabel
    }[]) = []
    let overlayId: string = 'ui-labelling-overlay'
    let currEl: HTMLElement | null = null
    let showAnnotations: boolean = false

    const obj: GlobalState = {
      state,
      annotations,
      overlayId,
      currEl,
      showAnnotations
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
    Object.defineProperty(obj, 'showAnnotations', {
      set: (value) => {
        cb('showAnnotations', value)
        showAnnotations = value
      },
      get: () => showAnnotations
    })

    return obj
  }

  function main() {
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
      if (!annotationSelect.value) {
        log.warn('no label selected?')
      }

      if (globals.currEl !== null) {
        globals.annotations = globals.annotations.concat({
          id: String(new Date().getTime()),
          ref: globals.currEl,
          rect: globals.currEl.getBoundingClientRect(),
          label: annotationSelect.value as AnnotationLabel
        })
      }

      globals.state = 'initial'
    })

    Object.keys(annotationLabels).forEach((s: string) => {
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

    // state independent keypress events that should always be active
    window.addEventListener('keypress', handleKeyPress)

    // janky redux style state handling mega function
    function handleGlobalChange(key: keyof GlobalState, value: any) {
      switch(key) {
        case 'annotations':
          chrome.storage.local.set({
            [StorageKeys.annotations]: JSON.stringify(value)
          })
          log.info('update to annotations', value)
          break
        case 'currEl':
          if (globals.state === 'navigation' && value) {
            removeRects()
            drawRect({
              element: value as HTMLElement,
              parent: overlay
            })
          }
          log.info('update to currEl', value)
          break
        case 'state':
          formOverlay.style.display = 'none'
          overlay.removeEventListener('mousedown', _handleMouseWrap)
          window.removeEventListener('keypress', handleNavigationKeyPress)

          if (value === 'initial') {
            removeRects()
            overlay.addEventListener('mousedown', _handleMouseWrap)
            log.info('added mousedown listener')
          } else if (value === 'navigation') {
            window.addEventListener('keypress', handleNavigationKeyPress)
          } else if (value === 'confirmation') {
            showConfirmationPopup()
          }

          log.info('update to state', value)
          break
        case 'showAnnotations':
          log.info('show annotations handler', value)
          globals.annotations.forEach(
            ({ id }) => document.getElementById(id)?.remove()
          )
          if (value) {
            globals.annotations.forEach(({ id, ref, label }) => {
              const c = annotationLabels[label]
              // will need delete buttons in here
              drawRect({
                id,
                element: ref,
                parent: overlay,
                styles: {
                  border: '2px solid ' + c,
                  backgroundColor: c,
                  opacity: '0.6'
                }
              })
            })
          }
          break
        default:
          log.info('undefined globals change', key, value)
      }
    }

    // CALLBACK SOUP

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

    function removeRects(selector: string = '[id*="candidate_annotation_"]') {
      Array.from(document.querySelectorAll(selector))
        .forEach(el => el.remove())
    }

    function drawRect({
      element,
      parent,
      styles,
      id,
    }: {
      element: HTMLElement
      parent: HTMLElement
      styles?: Partial<Record<keyof CSSStyleDeclaration, string>>
      id?: string
    }) {
      const annotation = document.createElement('div')
      const bbox = element.getBoundingClientRect()
      const { top, left, width, height } = bbox

      annotation.setAttribute('id', id ?? `${'candidate_annotation_'}${new Date().getTime()}`)
      annotation.style.position = 'fixed'
      annotation.style.width = width + 'px'
      annotation.style.height = height + 'px'
      annotation.style.top = top + 'px'
      annotation.style.left = left + 'px'
      annotation.style.border= `2px solid #0FFF50`

      if (styles) {
        Object.entries(styles)
          .forEach(([k, v]) => {
            // @ts-ignore
            annotation.style[k] = v
          })
      }
      parent.appendChild(annotation)
    }

    // this is active only when the global state is "navigation"
    function handleNavigationKeyPress(event: KeyboardEvent) {
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
        // quit navigation mode and return to initial
        case 'q':
          globals.state = 'initial'
          break
        // ijlk navigating the DOM
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
        // after settling on what to label, hit enter to bring up label dropdown
        case 'Enter':
          globals.state = 'confirmation'
          break
      }
    }

    // this is always active, regardless of the global state value.
    // TODO some kind of type system to prevent event key collision on keypress handling...
    function handleKeyPress(event: KeyboardEvent) {
      switch(event.key) {
        case 'a':
          log.info('toggling annotations')
          globals.showAnnotations = !globals.showAnnotations
          break
        case 's':
          // TODO: need toast
          log.info('taking screenshot')
          takeScreenshot()
            .then(() => {
              log.info('screenshot saved')
            })
          break
        case 'd':
          log.info('downloading...')
          chrome.storage.local.get([StorageKeys.annotations, StorageKeys.screenshot])
            .then((obj) => {

            })
          break
      }
    }

    // END CALLBACK SOUP

    // SO CALLED UTILS
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

    async function takeScreenshot() {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const video = document.createElement('video')
      if (!ctx) {
        // fur typescript
        log.warn('screenshot failed; cannot get context')
        return
      }

      try {
        const captureStream = await navigator.mediaDevices.getDisplayMedia()
        video.srcObject = captureStream
        ctx.drawImage(video, 0, 0, window.innerWidth, window.innerHeight)
        const base64Canvas = canvas.toDataURL("image/jpeg").split(';base64,')[1]

        return chrome.storage.local.set({
          [StorageKeys.screenshot]: base64Canvas
        })
      } catch (err) {
        log.error('screenshot failed with error', err)
        return Promise.reject(err)
      }
    }

    // END OF SO CALLED UTILS
  }

  main()

})()
