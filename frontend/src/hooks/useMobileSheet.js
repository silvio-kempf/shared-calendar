import { useEffect, useRef, useState } from 'react'

const MOBILE_BREAKPOINT = 640
const CLOSE_THRESHOLD = 96

export default function useMobileSheet({ open, onClose }) {
  const dragStartYRef = useRef(0)
  const draggingRef = useRef(false)
  const offsetRef = useRef(0)
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!open || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined
    }

    const { body, documentElement } = document
    const scrollY = window.scrollY
    const prevBodyOverflow = body.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyWidth = body.style.width
    const prevBodyLeft = body.style.left
    const prevBodyRight = body.style.right
    const prevHtmlOverflow = documentElement.style.overflow

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.left = '0'
    body.style.right = '0'
    documentElement.style.overflow = 'hidden'

    return () => {
      body.style.overflow = prevBodyOverflow
      body.style.position = prevBodyPosition
      body.style.top = prevBodyTop
      body.style.width = prevBodyWidth
      body.style.left = prevBodyLeft
      body.style.right = prevBodyRight
      documentElement.style.overflow = prevHtmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      dragStartYRef.current = 0
      draggingRef.current = false
      offsetRef.current = 0
      setDragging(false)
      setOffsetY(0)
    }
  }, [open])

  const handlePointerDown = (e) => {
    if (typeof window === 'undefined' || window.innerWidth >= MOBILE_BREAKPOINT) {
      return
    }

    draggingRef.current = true
    dragStartYRef.current = e.clientY
    offsetRef.current = 0
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return

    const nextOffset = Math.max(0, e.clientY - dragStartYRef.current)
    offsetRef.current = nextOffset
    setOffsetY(nextOffset)
  }

  const finishDrag = (pointerId, currentTarget) => {
    if (!draggingRef.current) return

    const shouldClose = offsetRef.current > CLOSE_THRESHOLD

    draggingRef.current = false
    offsetRef.current = 0
    setDragging(false)
    setOffsetY(0)

    if (pointerId != null) {
      currentTarget?.releasePointerCapture?.(pointerId)
    }

    if (shouldClose) {
      onClose()
    }
  }

  const handlePointerUp = (e) => finishDrag(e.pointerId, e.currentTarget)
  const handlePointerCancel = (e) => finishDrag(e.pointerId, e.currentTarget)

  return {
    handleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      style: { touchAction: 'none' },
    },
    sheetStyle: {
      transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
      transition: dragging ? 'none' : 'transform 180ms ease',
      overscrollBehaviorY: 'contain',
    },
  }
}
