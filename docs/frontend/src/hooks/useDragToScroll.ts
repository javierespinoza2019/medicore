import { useRef, useState } from 'react';

const DRAG_THRESHOLD = 3;

export interface DragToScrollHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  isPanning: boolean;
  dragState: React.MutableRefObject<{ moved: boolean }>;
}

/**
 * Permite desplazar un contenedor con scroll arrastrando con el mouse (pan).
 * - Ignora el inicio si el clic cae sobre elementos marcados con `data-no-pan`,
 *   botones o campos de formulario (para no romper el drag & drop de citas).
 * - Expone `dragState.current.moved` para que el componente pueda suprimir el
 *   "click" que sigue a un arrastre (evita agendar accidentalmente al soltar).
 */
export default function useDragToScroll(): DragToScrollHandlers {
  const dragState = useRef({ moved: false });
  const [isPanning, setIsPanning] = useState(false);
  const draggingRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-pan]')) return;
    if (target.closest('button, a, input, select, textarea')) return;

    const el = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = el.scrollLeft;
    const startScrollTop = el.scrollTop;

    dragState.current.moved = false;
    draggingRef.current = true;

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragState.current.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      dragState.current.moved = true;
      setIsPanning(true);
      el.scrollLeft = startScrollLeft - dx;
      el.scrollTop = startScrollTop - dy;
    };

    const onUp = () => {
      draggingRef.current = false;
      setIsPanning(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return { onPointerDown, isPanning, dragState };
}