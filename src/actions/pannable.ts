export interface PanOptions {
  onPan?: (dx: number, dy: number) => void
  onPanEnd?: () => void
}

export function pannable(node: HTMLElement, options: PanOptions) {
  let startX = 0
  let startY = 0
  let panning = false

  function handlePointerDown(e: PointerEvent) {
    // only pan on middle-click or direct background click
    if (e.button !== 0 && e.button !== 1) return
    if (e.target !== node && e.button !== 1) return

    e.preventDefault()
    startX = e.clientX
    startY = e.clientY
    panning = false

    node.setPointerCapture(e.pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    node.style.cursor = 'grabbing'
  }

  function handlePointerMove(e: PointerEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!panning && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      panning = true
    }

    if (panning) {
      options.onPan?.(dx, dy)
      startX = e.clientX
      startY = e.clientY
    }
  }

  function handlePointerUp(e: PointerEvent) {
    node.releasePointerCapture(e.pointerId)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    node.style.cursor = ''
    if (panning) options.onPanEnd?.()
    panning = false
  }

  node.addEventListener('pointerdown', handlePointerDown)

  return {
    update(newOptions: PanOptions) {
      Object.assign(options, newOptions)
    },
    destroy() {
      node.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    },
  }
}
