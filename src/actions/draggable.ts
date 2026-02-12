export interface DragOptions {
  onDragStart?: (x: number, y: number) => void
  onDrag?: (dx: number, dy: number) => void
  onDragEnd?: (dx: number, dy: number) => void
  axis?: 'x' | 'y' | 'both'
}

export function draggable(node: SVGElement | HTMLElement, options: DragOptions) {
  let startX = 0
  let startY = 0
  let dragging = false

  function handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    startX = e.clientX
    startY = e.clientY
    dragging = false

    node.setPointerCapture(e.pointerId)
    node.addEventListener('pointermove', handlePointerMove)
    node.addEventListener('pointerup', handlePointerUp)
  }

  function handlePointerMove(e: PointerEvent) {
    const dx = options.axis === 'y' ? 0 : e.clientX - startX
    const dy = options.axis === 'x' ? 0 : e.clientY - startY

    if (!dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragging = true
      options.onDragStart?.(startX, startY)
    }

    if (dragging) {
      options.onDrag?.(dx, dy)
    }
  }

  function handlePointerUp(e: PointerEvent) {
    node.releasePointerCapture(e.pointerId)
    node.removeEventListener('pointermove', handlePointerMove)
    node.removeEventListener('pointerup', handlePointerUp)

    if (dragging) {
      const dx = options.axis === 'y' ? 0 : e.clientX - startX
      const dy = options.axis === 'x' ? 0 : e.clientY - startY
      options.onDragEnd?.(dx, dy)
    }

    dragging = false
  }

  node.addEventListener('pointerdown', handlePointerDown)

  return {
    update(newOptions: DragOptions) {
      Object.assign(options, newOptions)
    },
    destroy() {
      node.removeEventListener('pointerdown', handlePointerDown)
    },
  }
}
