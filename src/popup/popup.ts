
document.addEventListener('DOMContentLoaded', () => {
  // today copy to clipboard, tomorrow the world
  const exportBtn = document.getElementById('export-btn')
  const clearBtn = document.getElementById('clear-btn')

  if (!exportBtn || !clearBtn) {
    console.error('cannot get dom objects')
    return
  }

  exportBtn.addEventListener('click', async () => {
    exportBtn.setAttribute('disabled', 'disabled')
    const obj = await chrome.storage.local.get('annotations')
    exportBtn.removeAttribute('disabled')

    const annotations = JSON.parse(obj['annotations']) as {
      id: string
      ref: HTMLElement
      rect: DOMRect
      label: AnnotationLabel
    }[]

    const screenshotUrl = await chrome.tabs.captureVisibleTab()
    const base64Image = screenshotUrl.split(';base64,')[1]

    const url = 'data:application/json;base64,' + window.btoa(
      JSON.stringify({
        annotations: annotations.map(({ref, ...rest}) => ({ ...rest})),
        screenshot: base64Image
      })
    );
    chrome.downloads.download({
        url: url,
        filename: 'ui_labelled.json'
    });
  })

  clearBtn.addEventListener('click', async () => {
    clearBtn.setAttribute('disabled', 'disabled')
    await chrome.storage.local.clear()
    clearBtn.removeAttribute('disabled')
  })
})
