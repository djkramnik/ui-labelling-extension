document.addEventListener('DOMContentLoaded', () => {
  const storageKey = 'annotations'

  // today copy to clipboard, tomorrow the world
  const exportBtn = document.getElementById('export-btn')
  const clearBtn = document.getElementById('clear-btn')

  if (!exportBtn || !clearBtn) {
    console.error('cannot get dom objects')
    return
  }

  exportBtn.addEventListener('click', async () => {
    exportBtn.setAttribute('disabled', 'disabled')
    const obj = await chrome.storage.local.get(storageKey)
    exportBtn.removeAttribute('disabled')
    navigator.clipboard.writeText(
      obj[storageKey]
    )
  })

  clearBtn.addEventListener('click', async () => {
    clearBtn.setAttribute('disabled', 'disabled')
    await chrome.storage.local.clear()
    clearBtn.removeAttribute('disabled')
  })
})
