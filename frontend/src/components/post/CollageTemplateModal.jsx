import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  LayoutTemplate,
  Plus,
  Trash2,
  Check,
  Download,
  Loader2,
  Grid,
  Palette,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sliders,
  RotateCcw,
  Sun,
  Pipette
} from 'lucide-react';
import { api } from '../../services/api';

// Template Definitions for 2, 3, 4, 5, and 6 images
// Coordinates are normalized: x, y, width, height (from 0 to 1)
const TEMPLATE_LAYOUTS = {
  2: [
    {
      id: 'split-v',
      name: 'Split Vertical',
      desc: 'Side-by-side 50/50 balance',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 }
      ]
    },
    {
      id: 'split-h',
      name: 'Split Horizontal',
      desc: 'Top & bottom 50/50 halves',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.5 },
        { x: 0, y: 0.5, w: 1, h: 0.5 }
      ]
    },
    {
      id: 'hero-60-40',
      name: 'Modern Hero 60/40',
      desc: 'Prominent left hero with right card',
      cells: [
        { x: 0, y: 0, w: 0.62, h: 1 },
        { x: 0.62, y: 0, w: 0.38, h: 1 }
      ]
    },
    {
      id: 'top-hero-35',
      name: 'Banner & Stage',
      desc: 'Wide top banner + tall stage below',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.38 },
        { x: 0, y: 0.38, w: 1, h: 0.62 }
      ]
    }
  ],
  3: [
    {
      id: 'hero-left',
      name: 'Hero Left',
      desc: '1 large hero on left + 2 stacked right',
      cells: [
        { x: 0, y: 0, w: 0.6, h: 1 },
        { x: 0.6, y: 0, w: 0.4, h: 0.5 },
        { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }
      ]
    },
    {
      id: 'hero-top',
      name: 'Hero Top',
      desc: '1 wide banner top + 2 columns bottom',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.58 },
        { x: 0, y: 0.58, w: 0.5, h: 0.42 },
        { x: 0.5, y: 0.58, w: 0.5, h: 0.42 }
      ]
    },
    {
      id: 'three-cols',
      name: 'Three Columns',
      desc: '3 vertical editorial strips',
      cells: [
        { x: 0, y: 0, w: 0.3333, h: 1 },
        { x: 0.3333, y: 0, w: 0.3334, h: 1 },
        { x: 0.6667, y: 0, w: 0.3333, h: 1 }
      ]
    },
    {
      id: 'three-rows',
      name: 'Three Rows',
      desc: '3 cinematic horizontal strips',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.3333 },
        { x: 0, y: 0.3333, w: 1, h: 0.3334 },
        { x: 0, y: 0.6667, w: 1, h: 0.3333 }
      ]
    }
  ],
  4: [
    {
      id: 'grid-2x2',
      name: 'Classic 2x2 Grid',
      desc: '4 equal quadrants, timeless symmetry',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
      ]
    },
    {
      id: 'hero-top-3',
      name: 'Hero Top + 3 Strip',
      desc: '1 wide feature top + 3 bottom cards',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.62 },
        { x: 0, y: 0.62, w: 0.3333, h: 0.38 },
        { x: 0.3333, y: 0.62, w: 0.3334, h: 0.38 },
        { x: 0.6667, y: 0.62, w: 0.3333, h: 0.38 }
      ]
    },
    {
      id: 'hero-left-3',
      name: 'Hero Left + 3 Stack',
      desc: '1 tall feature left + 3 cards right',
      cells: [
        { x: 0, y: 0, w: 0.6, h: 1 },
        { x: 0.6, y: 0, w: 0.4, h: 0.3333 },
        { x: 0.6, y: 0.3333, w: 0.4, h: 0.3334 },
        { x: 0.6, y: 0.6667, w: 0.4, h: 0.3333 }
      ]
    },
    {
      id: 'asymmetric-mosaic',
      name: 'Asymmetric Mosaic',
      desc: 'Modern dynamic magazine layout',
      cells: [
        { x: 0, y: 0, w: 0.55, h: 0.65 },
        { x: 0.55, y: 0, w: 0.45, h: 0.45 },
        { x: 0.55, y: 0.45, w: 0.45, h: 0.55 },
        { x: 0, y: 0.65, w: 0.55, h: 0.35 }
      ]
    }
  ],
  5: [
    {
      id: 'split-2-3',
      name: '2 Top + 3 Bottom',
      desc: '2 large top cards + 3 bottom row',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.52 },
        { x: 0.5, y: 0, w: 0.5, h: 0.52 },
        { x: 0, y: 0.52, w: 0.3333, h: 0.48 },
        { x: 0.3333, y: 0.52, w: 0.3334, h: 0.48 },
        { x: 0.6667, y: 0.52, w: 0.3333, h: 0.48 }
      ]
    },
    {
      id: 'hero-left-4',
      name: '1 Hero Left + 4 Quad Right',
      desc: '1 large hero left + 2x2 grid right',
      cells: [
        { x: 0, y: 0, w: 0.55, h: 1 },
        { x: 0.55, y: 0, w: 0.225, h: 0.5 },
        { x: 0.775, y: 0, w: 0.225, h: 0.5 },
        { x: 0.55, y: 0.5, w: 0.225, h: 0.5 },
        { x: 0.775, y: 0.5, w: 0.225, h: 0.5 }
      ]
    },
    {
      id: 'split-3-2',
      name: '3 Top + 2 Bottom',
      desc: '3 top gallery cards + 2 large bottom',
      cells: [
        { x: 0, y: 0, w: 0.3333, h: 0.45 },
        { x: 0.3333, y: 0, w: 0.3334, h: 0.45 },
        { x: 0.6667, y: 0, w: 0.3333, h: 0.45 },
        { x: 0, y: 0.45, w: 0.5, h: 0.55 },
        { x: 0.5, y: 0.45, w: 0.5, h: 0.55 }
      ]
    },
    {
      id: 'hero-center-cover',
      name: 'Center Cover Story',
      desc: '1 large center top banner + 4 grid cards',
      cells: [
        { x: 0, y: 0, w: 1, h: 0.58 },
        { x: 0, y: 0.58, w: 0.25, h: 0.42 },
        { x: 0.25, y: 0.58, w: 0.25, h: 0.42 },
        { x: 0.5, y: 0.58, w: 0.25, h: 0.42 },
        { x: 0.75, y: 0.58, w: 0.25, h: 0.42 }
      ]
    }
  ],
  6: [
    {
      id: 'grid-3x2',
      name: 'Neat 3x2 Grid',
      desc: '3 columns x 2 rows clean symmetry',
      cells: [
        { x: 0, y: 0, w: 0.3333, h: 0.5 },
        { x: 0.3333, y: 0, w: 0.3334, h: 0.5 },
        { x: 0.6667, y: 0, w: 0.3333, h: 0.5 },
        { x: 0, y: 0.5, w: 0.3333, h: 0.5 },
        { x: 0.3333, y: 0.5, w: 0.3334, h: 0.5 },
        { x: 0.6667, y: 0.5, w: 0.3333, h: 0.5 }
      ]
    },
    {
      id: 'grid-2x3',
      name: 'Neat 2x3 Grid',
      desc: '2 columns x 3 rows tall format',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.3333 },
        { x: 0.5, y: 0, w: 0.5, h: 0.3333 },
        { x: 0, y: 0.3333, w: 0.5, h: 0.3334 },
        { x: 0.5, y: 0.3333, w: 0.5, h: 0.3334 },
        { x: 0, y: 0.6667, w: 0.5, h: 0.3333 },
        { x: 0.5, y: 0.6667, w: 0.5, h: 0.3333 }
      ]
    },
    {
      id: 'hero-2-top-4',
      name: '2 Hero Top + 4 Bottom',
      desc: '2 large top heroes + 4 bottom thumbnails',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.55 },
        { x: 0.5, y: 0, w: 0.5, h: 0.55 },
        { x: 0, y: 0.55, w: 0.25, h: 0.45 },
        { x: 0.25, y: 0.55, w: 0.25, h: 0.45 },
        { x: 0.5, y: 0.55, w: 0.25, h: 0.45 },
        { x: 0.75, y: 0.55, w: 0.25, h: 0.45 }
      ]
    },
    {
      id: 'hero-left-5',
      name: '1 Hero Left + 5 Mosaic Right',
      desc: '1 dominant hero left + 5 gallery mosaic right',
      cells: [
        { x: 0, y: 0, w: 0.55, h: 1 },
        { x: 0.55, y: 0, w: 0.45, h: 0.3333 },
        { x: 0.55, y: 0.3333, w: 0.225, h: 0.3334 },
        { x: 0.775, y: 0.3333, w: 0.225, h: 0.3334 },
        { x: 0.55, y: 0.6667, w: 0.225, h: 0.3333 },
        { x: 0.775, y: 0.6667, w: 0.225, h: 0.3333 }
      ]
    }
  ]
};

// Aspect ratio configurations
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', sub: 'Instagram & LinkedIn Post', w: 1200, h: 1200 },
  { id: '4:5', label: '4:5 Portrait', sub: 'Instagram Feed Hero', w: 1080, h: 1350 },
  { id: '16:9', label: '16:9 Landscape', sub: 'Twitter & Facebook Banner', w: 1280, h: 720 }
];

// Color Utility Functions for Round RGB Color Plate
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let v = t;
      if (v < 0) v += 1;
      if (v > 1) v -= 1;
      if (v < 1 / 6) return p + (q - p) * 6 * v;
      if (v < 1 / 2) return q;
      if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [255, 255, 255];
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 255,
      parseInt(clean[1] + clean[1], 16) || 255,
      parseInt(clean[2] + clean[2], 16) || 255
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.substring(0, 2), 16) || 255,
      parseInt(clean.substring(2, 4), 16) || 255,
      parseInt(clean.substring(4, 6), 16) || 255
    ];
  }
  return [255, 255, 255];
}

function rgbToHsl(r, g, b) {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;
  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0);
        break;
      case normG:
        h = (normB - normR) / d + 2;
        break;
      case normB:
        h = (normR - normG) / d + 4;
        break;
      default:
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

export default function CollageTemplateModal({
  isOpen,
  onClose,
  initialImages = [],
  onApplyCollage,
  addToast
}) {
  // Image slots: array of { id, url, file, name }
  const [images, setImages] = useState([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [gapSize, setGapSize] = useState(12); // px
  const [borderRadius, setBorderRadius] = useState(16); // px

  // Interactive RGB Round Color Plate State
  const [borderColor, setBorderColor] = useState('#FFFFFF');
  const [lightness, setLightness] = useState(0.5);
  const [thumbPos, setThumbPos] = useState({ x: 70, y: 70 });
  const wheelCanvasRef = useRef(null);
  const colorInputRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [isExporting, setIsExporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Wheel constants: 140x140px circular plate
  const wheelSize = 140;
  const wheelRadius = wheelSize / 2 - 2;

  // Render the round circular color wheel
  useEffect(() => {
    if (!isOpen) return;
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = wheelSize;
    canvas.height = wheelSize;

    const cx = wheelSize / 2;
    const cy = wheelSize / 2;
    const r = wheelRadius;

    const imgData = ctx.createImageData(wheelSize, wheelSize);
    const data = imgData.data;

    for (let y = 0; y < wheelSize; y++) {
      for (let x = 0; x < wheelSize; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pixelIndex = (y * wheelSize + x) * 4;

        if (dist <= r) {
          const angle = Math.atan2(dy, dx);
          const hue = (angle * (180 / Math.PI) + 360) % 360;
          const sat = Math.min(1, dist / r);
          const [red, grn, blu] = hslToRgb(hue, sat, lightness);

          data[pixelIndex] = red;
          data[pixelIndex + 1] = grn;
          data[pixelIndex + 2] = blu;
          data[pixelIndex + 3] = 255;
        } else {
          data[pixelIndex + 3] = 0; // transparent outside circle
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle edge ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }, [isOpen, lightness]);

  // Round wheel interactive move/drag handler
  const updateColorFromWheelCoord = (clientX, clientY) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = wheelSize / 2;
    const cy = wheelSize / 2;
    const r = wheelRadius;

    const scaleX = wheelSize / rect.width;
    const scaleY = wheelSize / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top) * scaleY;

    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(r, dist);
    const angle = Math.atan2(dy, dx);
    const hue = (angle * (180 / Math.PI) + 360) % 360;
    const sat = clampedDist / r;

    const [red, grn, blu] = hslToRgb(hue, sat, lightness);
    const hex = rgbToHex(red, grn, blu);

    setBorderColor(hex);

    const thumbX = cx + Math.cos(angle) * clampedDist;
    const thumbY = cy + Math.sin(angle) * clampedDist;
    setThumbPos({ x: thumbX, y: thumbY });
  };

  const handleWheelPointerDown = (e) => {
    isDraggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    updateColorFromWheelCoord(e.clientX, e.clientY);
  };

  const handleWheelPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    updateColorFromWheelCoord(e.clientX, e.clientY);
  };

  const handleWheelPointerUp = (e) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handleLightnessChange = (newLightness) => {
    setLightness(newLightness);
    const [r, g, b] = hexToRgb(borderColor);
    const [h, s] = rgbToHsl(r, g, b);
    const [newR, newG, newB] = hslToRgb(h, s, newLightness);
    setBorderColor(rgbToHex(newR, newG, newB));
  };

  const handleDirectColorChange = (hex) => {
    setBorderColor(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const [r, g, b] = hexToRgb(hex);
      const [h, s, l] = rgbToHsl(r, g, b);
      setLightness(l);
      const angle = (h * Math.PI) / 180;
      const dist = s * wheelRadius;
      const cx = wheelSize / 2;
      const cy = wheelSize / 2;
      setThumbPos({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist
      });
    }
  };

  // Initialize images from props or pre-load
  useEffect(() => {
    if (isOpen) {
      if (initialImages && initialImages.length > 0) {
        const mapped = initialImages.slice(0, 6).map((item, idx) => ({
          id: `img-${Date.now()}-${idx}`,
          url: typeof item === 'string' ? item : item.url,
          name: item.filename || `Photo ${idx + 1}`
        }));
        setImages(mapped);
      } else {
        setImages([]);
      }
      setSelectedTemplateIndex(0);
    }
  }, [isOpen, initialImages]);

  // Current count clamped to 2..6 for layouts
  const count = Math.max(2, Math.min(6, images.length || 2));
  const availableTemplates = TEMPLATE_LAYOUTS[count] || TEMPLATE_LAYOUTS[2];
  const activeTemplate = availableTemplates[selectedTemplateIndex] || availableTemplates[0];

  // Load and render canvas
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setPreviewLoading(true);

    const renderCollage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ratioConfig = ASPECT_RATIOS.find((r) => r.id === aspectRatio) || ASPECT_RATIOS[0];
      const width = ratioConfig.w;
      const height = ratioConfig.h;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background using user's picked RGB border color
      ctx.fillStyle = borderColor || '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Outer margin equals gapSize
      const margin = gapSize;
      const innerW = width - margin * 2;
      const innerH = height - margin * 2;

      // 2. Load all available image elements
      const loadedImgs = await Promise.all(
        images.slice(0, count).map((item) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve({ img, success: true });
            img.onerror = () => resolve({ img: null, success: false });
            img.src = item.url;
          });
        })
      );

      if (!isMounted) return;

      // 3. Render each cell
      const cells = activeTemplate.cells;
      cells.forEach((cell, idx) => {
        // Calculate cell dimensions with gaps
        const cellX = margin + cell.x * innerW + (cell.x > 0 ? gapSize / 2 : 0);
        const cellY = margin + cell.y * innerH + (cell.y > 0 ? gapSize / 2 : 0);
        let cellW = cell.w * innerW - gapSize;
        let cellH = cell.h * innerH - gapSize;

        // If edge cell, compensate
        if (cell.x === 0 && cell.w === 1) cellW = innerW;
        if (cell.y === 0 && cell.h === 1) cellH = innerH;
        if (cellW < 10) cellW = 10;
        if (cellH < 10) cellH = 10;

        ctx.save();

        // Rounded clipping path
        ctx.beginPath();
        if (borderRadius > 0 && ctx.roundRect) {
          ctx.roundRect(cellX, cellY, cellW, cellH, borderRadius);
        } else {
          ctx.rect(cellX, cellY, cellW, cellH);
        }
        ctx.closePath();
        ctx.clip();

        const imgData = loadedImgs[idx];
        if (imgData && imgData.success && imgData.img) {
          // Object-fit: cover implementation
          const img = imgData.img;
          const imgRatio = img.width / img.height;
          const cellRatio = cellW / cellH;

          let renderW, renderH, offsetX, offsetY;
          if (imgRatio > cellRatio) {
            renderH = cellH;
            renderW = cellH * imgRatio;
            offsetX = cellX + (cellW - renderW) / 2;
            offsetY = cellY;
          } else {
            renderW = cellW;
            renderH = cellW / imgRatio;
            offsetX = cellX;
            offsetY = cellY + (cellH - renderH) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
        } else {
          // Placeholder slot if image not provided yet
          const isDarkBg = lightness < 0.45;
          ctx.fillStyle = isDarkBg ? '#1E293B' : '#E2E8F0';
          ctx.fillRect(cellX, cellY, cellW, cellH);

          ctx.fillStyle = isDarkBg ? '#94A3B8' : '#64748B';
          ctx.font = 'bold 24px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`Slot ${idx + 1}`, cellX + cellW / 2, cellY + cellH / 2);
        }

        ctx.restore();
      });

      setPreviewLoading(false);
    };

    renderCollage();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    images,
    activeTemplate,
    aspectRatio,
    gapSize,
    borderRadius,
    borderColor,
    lightness,
    count
  ]);

  // Handle local file uploads into collage slots
  const handleUploadFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList).slice(0, 6 - images.length);
    if (filesArray.length === 0) {
      addToast?.('You can add up to 6 images in a collage template.', 'info');
      return;
    }

    const newItems = [];
    for (const file of filesArray) {
      const localUrl = URL.createObjectURL(file);
      newItems.push({
        id: `img-${Date.now()}-${Math.random()}`,
        url: localUrl,
        file: file,
        name: file.name
      });
    }

    setImages((prev) => {
      const updated = [...prev, ...newItems].slice(0, 6);
      return updated;
    });
    setSelectedTemplateIndex(0);
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setSelectedTemplateIndex(0);
  };

  const handleMoveImage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const item = copy.splice(fromIdx, 1)[0];
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  // Export as 1 Composite Image & Attach to Post (with optional client download)
  const handleGenerateAndApply = async (shouldDownload = true) => {
    if (images.length < 2) {
      addToast?.('Please choose at least 2 images to generate a collage template.', 'warning');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsExporting(true);

      // 1. Download directly to device if requested (Save Image option)
      if (shouldDownload) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `socialflow-template-${Date.now()}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 2. Convert canvas to Blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('Failed to render canvas image blob');

      const filename = `collage-template-${Date.now()}.jpg`;
      const compositeFile = new File([blob], filename, { type: 'image/jpeg' });

      // 3. Upload rendered single image to backend
      const formData = new FormData();
      formData.append('media', compositeFile);

      const res = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const mediaUrl = res.mediaUrl || res.data?.mediaUrl || res.data?.url;

      if (!mediaUrl) {
        throw new Error('Upload succeeded but no media URL returned.');
      }

      // 4. Attach single composite image to post & preserve source images for re-editing
      onApplyCollage?.({
        url: mediaUrl,
        mediaType: 'IMAGE',
        filename: filename,
        isCollageTemplate: true,
        sourceImages: images.map((img) => ({
          url: img.url,
          filename: img.name || 'Photo'
        }))
      });

      addToast?.(
        shouldDownload
          ? 'Template image saved to your device & attached to your post!'
          : 'Collage template created as 1 image and attached to your post!',
        'success'
      );
      onClose();
    } catch (err) {
      addToast?.(err.message || 'Failed to generate collage image. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-scale-up max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">
                  Photo Collage & Layout Template Studio
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {images.length} Photos Selected
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                Combine 2, 3, 4, 5, or 6 photos into 1 stylish, high-resolution single image for your post
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Controls & Photo Tray (col-span-5) */}
          <div className="lg:col-span-5 space-y-4.5">
            {/* 1. Photo Tray & Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Choose Images (2 to 6 slots)</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  {images.length}/6 Images
                </span>
              </div>

              {/* Thumbnail Strip */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {images.map((item, idx) => (
                  <div
                    key={item.id}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155] bg-slate-100 dark:bg-[#1E293B]"
                  >
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white font-mono text-[9px] font-bold">
                      #{idx + 1}
                    </div>
                    {/* Action buttons on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 p-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          title="Move Left"
                          className="p-1 rounded-md bg-white/20 hover:bg-white text-white hover:text-black transition-all"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove"
                        className="p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {idx < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          title="Move Right"
                          className="p-1 rounded-md bg-white/20 hover:bg-white text-white hover:text-black transition-all"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Image Slot button */}
                {images.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-[#E2E8F0] dark:border-[#334155] hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50 dark:bg-[#0B1120] hover:bg-emerald-50/30 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-emerald-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleUploadFiles(e.target.files);
                  if (e.target) e.target.value = '';
                }}
              />
            </div>

            {/* 2. Stylish Template Selector (2, 3, 4, 5, or 6 designs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-purple-500" />
                  <span>Stylish Templates for {count} Images</span>
                </label>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {availableTemplates.length} Designs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availableTemplates.map((tpl, i) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateIndex(i)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedTemplateIndex === i
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#0B1120] text-[#0F172A] dark:text-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{tpl.name}</span>
                      {selectedTemplateIndex === i && (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {tpl.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Customization Controls: Aspect Ratio & Border Theme */}
            <div className="space-y-3 pt-2 border-t border-[#E2E8F0] dark:border-[#334155]">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5">
                  Canvas Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id)}
                      className={`p-2 rounded-xl text-center border text-xs transition-all ${
                        aspectRatio === r.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500'
                          : 'border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white'
                      }`}
                    >
                      <div className="font-bold">{r.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing & Border Radius sliders */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1">
                    Spacing / Gap: <span className="font-mono text-emerald-500">{gapSize}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="4"
                    value={gapSize}
                    onChange={(e) => setGapSize(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] dark:text-white mb-1">
                    Corner Radius: <span className="font-mono text-emerald-500">{borderRadius}px</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="4"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Round RGB Color Plate Studio */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Border & Background Color</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Round RGB Color Plate
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Round Color Plate Canvas */}
                  <div
                    className="relative w-[140px] h-[140px] select-none mx-auto sm:mx-0 shrink-0 cursor-crosshair rounded-full shadow-lg ring-2 ring-slate-300 dark:ring-slate-700 bg-slate-900 touch-none"
                    onPointerDown={handleWheelPointerDown}
                    onPointerMove={handleWheelPointerMove}
                    onPointerUp={handleWheelPointerUp}
                    title="Click and drag anywhere on the round plate to choose any favorite RGB color"
                  >
                    <canvas
                      ref={wheelCanvasRef}
                      className="w-full h-full rounded-full block pointer-events-none"
                    />
                    {/* Movable Cursor Thumb */}
                    <div
                      className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md ring-1 ring-black/50 transition-transform duration-75"
                      style={{
                        left: `${thumbPos.x}px`,
                        top: `${thumbPos.y}px`,
                        backgroundColor: borderColor
                      }}
                    />
                  </div>

                  {/* Brightness, RGB Readout & Color Controls */}
                  <div className="flex-1 w-full space-y-2.5">
                    {/* Brightness Slider */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#0F172A] dark:text-white mb-1">
                        <span className="flex items-center gap-1">
                          <Sun className="w-3 h-3 text-amber-500" />
                          <span>Brightness:</span>
                        </span>
                        <span className="font-mono text-emerald-500">{Math.round(lightness * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(lightness * 100)}
                        onChange={(e) => handleLightnessChange(Number(e.target.value) / 100)}
                        className="w-full accent-emerald-500 cursor-pointer h-2 rounded-lg bg-gradient-to-r from-black via-slate-400 to-white"
                      />
                    </div>

                    {/* Active Color Preview & Hex / RGB Info */}
                    <div className="flex items-center gap-2">
                      {/* Round Swatch Circle with hidden native color picker trigger */}
                      <div className="relative shrink-0">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md ring-1 ring-slate-300 dark:ring-slate-600 cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: borderColor }}
                          title="Click to open system color picker"
                          onClick={() => colorInputRef.current?.click()}
                        />
                        <input
                          ref={colorInputRef}
                          type="color"
                          value={borderColor.startsWith('#') && borderColor.length === 7 ? borderColor : '#FFFFFF'}
                          onChange={(e) => handleDirectColorChange(e.target.value)}
                          className="sr-only"
                        />
                      </div>

                      {/* Hex input */}
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={borderColor}
                          onChange={(e) => handleDirectColorChange(e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-full px-2.5 py-1 text-xs font-mono font-bold uppercase rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* RGB Numbers */}
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        <span className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">
                          R:{hexToRgb(borderColor)[0]}
                        </span>
                        <span className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">
                          G:{hexToRgb(borderColor)[1]}
                        </span>
                        <span className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">
                          B:{hexToRgb(borderColor)[2]}
                        </span>
                      </div>
                    </div>

                    {/* Quick Convenience Swatch Dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        '#FFFFFF',
                        '#000000',
                        '#0F172A',
                        '#EF4444',
                        '#10B981',
                        '#3B82F6',
                        '#8B5CF6',
                        '#F59E0B'
                      ].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleDirectColorChange(c)}
                          className={`w-5 h-5 rounded-full border border-black/10 shadow-xs transition-transform hover:scale-110 ${
                            borderColor.toUpperCase() === c ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          title={`Select ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Canvas Preview & Action (col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Live Template Canvas Preview</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {ASPECT_RATIOS.find((r) => r.id === aspectRatio)?.w} ×{' '}
                  {ASPECT_RATIOS.find((r) => r.id === aspectRatio)?.h}px High-Res
                </span>
              </div>

              {/* Canvas Container */}
              <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#334155] bg-slate-900/90 shadow-inner flex items-center justify-center p-3 min-h-[340px] max-h-[460px]">
                {previewLoading && (
                  <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-xs flex items-center justify-center gap-2 text-white text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Rendering Template...</span>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="max-h-[420px] max-w-full object-contain rounded-xl shadow-2xl transition-all"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-[#334155]">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleGenerateAndApply(false)}
                  disabled={images.length < 2 || isExporting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  title="Attach this collage template directly to your post"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Attach to Post Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateAndApply(true)}
                  disabled={images.length < 2 || isExporting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                  title="Download template image to your computer and attach it to your post ready for publishing"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Attaching...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Save Image & Attach to Post</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
