import { useEffect, useRef, useState } from 'react';
import { saveDrawing } from '../lib/drawings';
import { sfx } from '../lib/sfx';

const COLORS = ['#2D2A32', '#FF5A5F', '#FF9F1C', '#FFD23F', '#3BB273', '#2E86DE', '#8E5CF7', '#8B5E3C'];

/** A finger / Apple Pencil drawing canvas. Saves her picture for the word. */
export function DrawPad({ wordId, prompt, initial, onClose }: { wordId: string; prompt: string; initial?: string; onClose: (saved?: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(8);
  const [eraser, setEraser] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initial;
    }
  }, [initial]);

  function point(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function stroke(e: React.PointerEvent) {
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = point(e);
    const from = last.current ?? p;
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? 0.4 + e.pressure : 1;
    ctx.strokeStyle = eraser ? '#fff' : color;
    ctx.lineWidth = (eraser ? size * 3 : size) * pressure;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  async function save() {
    const url = canvasRef.current!.toDataURL('image/jpeg', 0.8);
    try {
      await saveDrawing(wordId, url);
    } catch {
      /* storage full or unavailable — still show it this session */
    }
    sfx.correct();
    onClose(url);
  }

  return (
    <div className="modal-backdrop">
      <div className="drawpad">
        <div className="drawpad-head">
          <strong>🎨 {prompt}</strong>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close">
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          className="drawpad-canvas"
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = null;
            stroke(e);
          }}
          onPointerMove={(e) => drawing.current && stroke(e)}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          onPointerCancel={() => (drawing.current = false)}
        />
        <div className="drawpad-tools">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${c === color && !eraser ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
              aria-label={`Color ${c}`}
            />
          ))}
          <button className={`tool ${size === 4 ? 'on' : ''}`} onClick={() => setSize(4)}>
            thin
          </button>
          <button className={`tool ${size === 8 ? 'on' : ''}`} onClick={() => setSize(8)}>
            medium
          </button>
          <button className={`tool ${size === 16 ? 'on' : ''}`} onClick={() => setSize(16)}>
            thick
          </button>
          <button className={`tool ${eraser ? 'on' : ''}`} onClick={() => setEraser(!eraser)}>
            eraser
          </button>
          <button className="tool" onClick={clear}>
            clear
          </button>
          <button className="btn primary" onClick={save}>
            Save ✓
          </button>
        </div>
      </div>
    </div>
  );
}
