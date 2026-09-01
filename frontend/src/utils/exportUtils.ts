/**
 * Exportación a Excel y PDF.
 *
 * `xlsx`, `jspdf` y `html2canvas` se cargan **al usarse**, no al arrancar la aplicación:
 * son varios cientos de kB que ninguna estación necesita para iniciar sesión ni para
 * atender. Por eso todas las funciones públicas de este módulo son asíncronas.
 */

import type jsPDF from 'jspdf';

async function cargarJsPdf() {
  return (await import('jspdf')).default;
}

async function cargarHtml2Canvas() {
  return (await import('html2canvas')).default;
}

// ── oklch → rgb converter (html2canvas doesn't support oklch) ──

function oklchToRgb(oklchStr: string): string {
  const match = oklchStr.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+(?:\.[\d]+)?))?\s*\)/,
  );
  if (!match) return oklchStr;

  const l = parseFloat(match[1]);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;

  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r_ = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g_ = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const toSrgb = (x: number): number => {
    const abs = Math.abs(x);
    if (abs > 0.0031308) {
      return Math.sign(x) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    }
    return 12.92 * x;
  };

  const r = Math.round(Math.max(0, Math.min(1, toSrgb(r_))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toSrgb(g_))) * 255);
  const bVal = Math.round(Math.max(0, Math.min(1, toSrgb(b_))) * 255);

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${bVal}, ${alpha})`;
  }
  return `rgb(${r}, ${g}, ${bVal})`;
}

const COLOR_PROPS = [
  'background-color',
  'color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'column-rule-color',
];

function patchOklchColors(el: HTMLElement): (() => void) {
  const patches: { el: HTMLElement; prop: string; orig: string }[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);

  let node: Node | null = walker.currentNode;
  while ((node = walker.nextNode())) {
    const elem = node as HTMLElement;
    const computed = getComputedStyle(elem);

    for (const prop of COLOR_PROPS) {
      const val = computed.getPropertyValue(prop);
      if (val && val.includes('oklch(')) {
        const rgb = oklchToRgb(val);
        const orig = elem.style.getPropertyValue(prop);
        patches.push({ el: elem, prop, orig });
        elem.style.setProperty(prop, rgb, 'important');
      }
    }
  }

  return () => {
    for (const { el, prop, orig } of patches) {
      if (orig === '') {
        el.style.removeProperty(prop);
      } else {
        el.style.setProperty(prop, orig);
      }
    }
  };
}

// ── export utilities ──

export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName: string = 'Datos',
  columnMap?: Record<string, string>,
) {
  if (data.length === 0) return;

  const XLSX = await import('xlsx');

  let exportData: Record<string, unknown>[];

  if (columnMap) {
    exportData = data.map((row) => {
      const mapped: Record<string, unknown> = {};
      Object.entries(columnMap).forEach(([key, label]) => {
        const value = row[key];
        mapped[label] = value ?? '';
      });
      return mapped;
    });
  } else {
    exportData = data;
  }

  const ws = XLSX.utils.json_to_sheet(exportData);

  const colWidths = Object.keys(exportData[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...exportData.map((row) => String(row[key] ?? '').length),
    );
    return { wch: Math.min(maxLen + 4, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const excelBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const safeName = `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  options?: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  },
) {
  const pdf = await _generatePDF(element, options);
  pdf.save(`${filename}.pdf`);
}

export async function exportElementToPDFBlob(
  element: HTMLElement,
  options?: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  },
): Promise<Blob> {
  const pdf = await _generatePDF(element, options);
  return pdf.output('blob');
}

export async function exportElementToThermalPDFBlob(
  element: HTMLElement,
  options?: {
    title?: string;
    widthMm?: number;
    marginMm?: number;
  },
): Promise<Blob> {
  const widthMm = options?.widthMm ?? 80;
  const marginMm = options?.marginMm ?? 2;

  // --- setup (same as _generatePDF) ---
  const tempStyle = document.createElement('style');
  tempStyle.id = 'tmp-pdf-body-fix';
  tempStyle.textContent = 'html, body { background-color: #ffffff !important; }';
  document.head.appendChild(tempStyle);

  const prevBodyBg = document.body.style.backgroundColor;
  document.body.style.backgroundColor = '#ffffff';

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${widthMm * 3.7795275591}px`;
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  container.appendChild(clone);

  const originalRect = element.getBoundingClientRect();
  clone.style.width = `${Math.min(originalRect.width, widthMm * 3.7795275591)}px`;
  clone.style.maxWidth = `${widthMm}mm`;

  const restoreOklch = patchOklchColors(container);
  const restoreBody = patchOklchColors(document.body);

  const html2canvas = await cargarHtml2Canvas();
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
  } finally {
    restoreOklch();
    restoreBody();
    if (prevBodyBg) {
      document.body.style.backgroundColor = prevBodyBg;
    } else {
      document.body.style.removeProperty('background-color');
    }
    const injectedStyle = document.getElementById('tmp-pdf-body-fix');
    if (injectedStyle) injectedStyle.remove();
    document.body.removeChild(container);
  }

  const imgData = canvas.toDataURL('image/png');
  const imgWidthMm = widthMm - marginMm * 2;
  const imgHeightMm = imgWidthMm * (canvas.height / canvas.width);
  const pageHeightMm = imgHeightMm + marginMm * 2;

  const JsPdf = await cargarJsPdf();
  const pdf = new JsPdf({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, pageHeightMm],
  });

  pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidthMm, imgHeightMm);

  if (options?.title) {
    pdf.setProperties({ title: options.title });
  }

  return pdf.output('blob');
}

async function _generatePDF(
  element: HTMLElement,
  options?: {
    title?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  },
): Promise<jsPDF> {
  const { orientation = 'portrait', margin = 8 } = options || {};

  // Inject temporary style to override any oklch-based body/html background
  // before html2canvas reads them from stylesheets (html2canvas doesn't support oklch)
  const tempStyle = document.createElement('style');
  tempStyle.id = 'tmp-pdf-body-fix';
  tempStyle.textContent = 'html, body { background-color: #ffffff !important; }';
  document.head.appendChild(tempStyle);

  const prevBodyBg = document.body.style.backgroundColor;
  document.body.style.backgroundColor = '#ffffff';

  // Clone the element into an off-screen container so html2canvas
  // can render it cleanly without modal/fixed positioning issues.
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 width
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  container.appendChild(clone);

  // Copy computed width to ensure the clone renders at the same size
  const originalRect = element.getBoundingClientRect();
  clone.style.width = `${originalRect.width}px`;
  clone.style.maxWidth = '210mm';

  const restoreOklch = patchOklchColors(container);
  const restoreBody = patchOklchColors(document.body);

  const html2canvas = await cargarHtml2Canvas();
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
  } finally {
    restoreOklch();
    restoreBody();
    if (prevBodyBg) {
      document.body.style.backgroundColor = prevBodyBg;
    } else {
      document.body.style.removeProperty('background-color');
    }
    const injectedStyle = document.getElementById('tmp-pdf-body-fix');
    if (injectedStyle) injectedStyle.remove();
    document.body.removeChild(container);
  }

  const JsPdf = await cargarJsPdf();
  const pdf = new JsPdf({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginMm = margin;
  const usableWidth = pageWidth - marginMm * 2;
  const usableHeight = pageHeight - marginMm * 2;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);

  const finalWidth = imgWidth * ratio;
  const finalHeight = imgHeight * ratio;
  const x = (pageWidth - finalWidth) / 2;

  let remainingHeight = finalHeight;
  let sourceY = 0;
  let pageNum = 0;

  // jsPDF no recorta la imagen de origen: cada página se dibuja desde un canvas
  // parcial, si no todas las páginas repetirían el documento completo.
  const sliceCanvas = document.createElement('canvas');
  const sliceCtx = sliceCanvas.getContext('2d');

  while (remainingHeight > 0) {
    if (pageNum > 0) pdf.addPage();

    const sliceHeight = Math.min(remainingHeight, usableHeight);
    const sliceImgHeight = Math.min(sliceHeight / ratio, imgHeight - sourceY);

    sliceCanvas.width = imgWidth;
    sliceCanvas.height = Math.max(1, Math.round(sliceImgHeight));
    if (sliceCtx) {
      sliceCtx.fillStyle = '#ffffff';
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(
        canvas,
        0,
        sourceY,
        imgWidth,
        sliceCanvas.height,
        0,
        0,
        imgWidth,
        sliceCanvas.height,
      );
    }

    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      x,
      marginMm,
      finalWidth,
      sliceHeight,
      undefined,
      'FAST',
    );

    remainingHeight -= sliceHeight;
    sourceY += sliceImgHeight;
    pageNum++;
  }

  if (options?.title) {
    pdf.setProperties({ title: options.title });
  }

  return pdf;
}

export async function exportTextToPDF(
  content: string,
  filename: string,
  options?: {
    title?: string;
    subtitle?: string;
    headerInfo?: { label: string; value: string }[];
    footerText?: string;
  },
) {
  const JsPdf = await cargarJsPdf();
  const pdf = new JsPdf({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(30, 30, 30);
  pdf.text('MediCore', margin, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Sistema Integral de Gestión Médica', margin, y);
  y += 10;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (options?.title) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(30, 30, 30);
    pdf.text(options.title, margin, y);
    y += 8;
  }

  if (options?.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(options.subtitle, margin, y);
    y += 8;
  }

  if (options?.headerInfo && options.headerInfo.length > 0) {
    pdf.setDrawColor(235, 235, 235);
    pdf.setFillColor(248, 248, 248);
    const boxHeight = 8;
    const colWidth = usableWidth / 2;

    options.headerInfo.forEach((info, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = margin + col * colWidth;
      const by = y + row * boxHeight;

      pdf.rect(bx, by, colWidth, boxHeight, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(140, 140, 140);
      pdf.text(info.label, bx + 2, by + 4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);
      pdf.text(info.value, bx + 2, by + 6.8);
    });

    y += Math.ceil(options.headerInfo.length / 2) * boxHeight + 6;
  }

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(50, 50, 50);

  const lines = content.split('\n');
  for (const line of lines) {
    if (y > 270) {
      pdf.addPage();
      y = margin;
    }

    const splitText = pdf.splitTextToSize(line, usableWidth);
    pdf.text(splitText, margin, y);

    const lineCount = Array.isArray(splitText) ? splitText.length : 1;
    y += lineCount * 5 + 1;
  }

  y = 280;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(160, 160, 160);
  if (options?.footerText) {
    pdf.text(options.footerText, margin, y);
  }
  const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  pdf.text(`Generado el ${dateStr}`, pageWidth - margin, y, { align: 'right' });

  if (options?.title) {
    pdf.setProperties({ title: options.title });
  }

  pdf.save(`${filename}.pdf`);
}