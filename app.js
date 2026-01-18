// ثوابت التحويل من mm إلى px عند 300 DPI
const DPI = 300;
const MM_TO_INCH = 1 / 25.4;
const mmToPx = (mm) => mm * MM_TO_INCH * DPI;

// أبعاد الطباعة لكل موديل (mm)
const MODELS = {
  's23-ultra': {
    widthMM: 84,   // مع Bleed
    heightMM: 169,
    camera: {
      lensDiameterMM: 12,
      topOffsetMM: 22,
      leftOffsetMM: 12,
      verticalGapMM: 15,
      // توزيع العدسات (4 عدسات طولية)
      lenses: 4,
      // ليزر + فلاش
      laserOffset: { dxMM: 18, dyIndex: 2 }, // يمين العدسة الثالثة
      flashOffset: { dxMM: 18, dyIndex: 1 }  // يمين العدسة الثانية
    }
  },
  's24-ultra': {
    widthMM: 85,
    heightMM: 168,
    camera: {
      lensDiameterMM: 12,
      topOffsetMM: 21,
      leftOffsetMM: 13,
      verticalGapMM: 15,
      lenses: 4,
      flashOffset: { dxMM: 18, dyIndex: 0 }, // أعلى يمين العدسات
      laserOffset: { dxMM: 18, dyIndex: 2 }  // يمين العدسة الثالثة
    }
  },
  // بقية الأجهزة: نستخدم مقاسات تقريبية للمعاينة فقط
  's23': { widthMM: 80, heightMM: 165 },
  's24': { widthMM: 80, heightMM: 165 },
  'note-20': { widthMM: 80, heightMM: 165 },
  'iphone-15': { widthMM: 78, heightMM: 165 },
  'iphone-14': { widthMM: 78, heightMM: 164 },
  'iphone-13': { widthMM: 78, heightMM: 163 }
};

const fileInput = document.getElementById('bgUpload');
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

const scaleRange = document.getElementById('scaleRange');
const offsetXRange = document.getElementById('offsetXRange');
const offsetYRange = document.getElementById('offsetYRange');

const phoneModelSelect = document.getElementById('phoneModel');
const phoneWrapper = document.getElementById('phoneWrapper');
const cameraOverlay = document.getElementById('cameraOverlay');

const downloadBtn = document.getElementById('downloadBtn');

let img = null;
let scale = parseFloat(scaleRange.value);
let offsetX = parseFloat(offsetXRange.value);
let offsetY = parseFloat(offsetYRange.value);

let isDragging = false;
let lastX = 0;
let lastY = 0;
let lastDist = null;

// ضبط حجم الكانفس حسب الموديل (للطباعة)
function setCanvasSizeForModel(modelKey) {
  const model = MODELS[modelKey];

  let widthMM = model?.widthMM || 80;
  let heightMM = model?.heightMM || 165;

  const widthPx = Math.round(mmToPx(widthMM));
  const heightPx = Math.round(mmToPx(heightMM));

  canvas.width = widthPx;
  canvas.height = heightPx;

  // ضبط حجم الحاوية بصريًا (تصغير نسبي للعرض فقط)
  const maxVisualHeight = 520;
  const ratio = heightPx / widthPx;
  let visualHeight = maxVisualHeight;
  let visualWidth = visualHeight / ratio;

  phoneWrapper.style.width = visualWidth + 'px';
  phoneWrapper.style.height = visualHeight + 'px';

  draw();
}

// رسم الخلفية
function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!img) {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(1, '#ddd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const imgRatio = img.width / img.height;
  const canvasRatio = canvas.width / canvas.height;

  let drawWidth, drawHeight;
  if (imgRatio > canvasRatio) {
    drawHeight = canvas.height * scale;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = canvas.width * scale;
    drawHeight = drawWidth / imgRatio;
  }

  const centerX = canvas.width / 2 + offsetX;
  const centerY = canvas.height / 2 + offsetY;

  const x = centerX - drawWidth / 2;
  const y = centerY - drawHeight / 2;

  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

// تحديث شكل الكاميرا حسب الموديل
function updatePhoneModel() {
  const value = phoneModelSelect.value;
  phoneWrapper.className = 'phone-wrapper ' + value;
  cameraOverlay.innerHTML = '';

  setCanvasSizeForModel(value);

  const model = MODELS[value];

  // موديلات Ultra: نرسم العدسات بدقة
  if (value === 's23-ultra' || value === 's24-ultra') {
    const cam = model.camera;
    const lensDiameterPx = mmToPx(cam.lensDiameterMM);
    const topOffsetPx = mmToPx(cam.topOffsetMM);
    const leftOffsetPx = mmToPx(cam.leftOffsetMM);
    const gapPx = mmToPx(cam.verticalGapMM);

    cameraOverlay.style.top = '0px';
    cameraOverlay.style.left = '0px';
    cameraOverlay.style.width = canvas.width + 'px';
    cameraOverlay.style.height = canvas.height + 'px';

    // عدسات رئيسية
    for (let i = 0; i < cam.lenses; i++) {
      const lens = document.createElement('div');
      lens.className = 'camera-lens';
      lens.style.position = 'absolute';
      lens.style.width = lensDiameterPx + 'px';
      lens.style.height = lensDiameterPx + 'px';
      lens.style.left = leftOffsetPx + 'px';
      lens.style.top = (topOffsetPx + i * (lensDiameterPx + gapPx)) + 'px';
      cameraOverlay.appendChild(lens);
    }

    // فلاش
    if (cam.flashOffset) {
      const flash = document.createElement('div');
      flash.style.position = 'absolute';
      const flashSizePx = lensDiameterPx * 0.6;
      flash.style.width = flashSizePx + 'px';
      flash.style.height = flashSizePx + 'px';
      flash.style.borderRadius = '50%';
      flash.style.background = '#ffd966';

      const baseTop = topOffsetPx + cam.flashOffset.dyIndex * (lensDiameterPx + gapPx);
      const baseLeft = leftOffsetPx + mmToPx(cam.flashOffset.dxMM);

      flash.style.left = baseLeft + 'px';
      flash.style.top = baseTop + 'px';
      cameraOverlay.appendChild(flash);
    }

    // ليزر
    if (cam.laserOffset) {
      const laser = document.createElement('div');
      laser.style.position = 'absolute';
      const laserSizePx = lensDiameterPx * 0.4;
      laser.style.width = laserSizePx + 'px';
      laser.style.height = laserSizePx + 'px';
      laser.style.borderRadius = '50%';
      laser.style.background = '#888';

      const baseTop = topOffsetPx + cam.laserOffset.dyIndex * (lensDiameterPx + gapPx);
      const baseLeft = leftOffsetPx + mmToPx(cam.laserOffset.dxMM);

      laser.style.left = baseLeft + 'px';
      laser.style.top = baseTop + 'px';
      cameraOverlay.appendChild(laser);
    }

  } else if (value === 's23' || value === 's24') {
    cameraOverlay.style.top = '40px';
    cameraOverlay.style.left = '18px';
    cameraOverlay.style.width = '40px';
    cameraOverlay.style.height = '150px';
    cameraOverlay.style.display = 'flex';
    cameraOverlay.style.flexDirection = 'column';
    cameraOverlay.style.justifyContent = 'space-between';

    for (let i = 0; i < 3; i++) {
      const lens = document.createElement('div');
      lens.className = 'camera-lens';
      lens.style.width = '38px';
      lens.style.height = '38px';
      cameraOverlay.appendChild(lens);
    }

  } else if (value === 'note-20') {
    cameraOverlay.classList.add('note-20');
    cameraOverlay.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const lens = document.createElement('div');
      lens.className = 'camera-lens';
      cameraOverlay.appendChild(lens);
    }

  } else {
    // iPhone: شكل الجزيرة من CSS فقط
    cameraOverlay.style.width = '100%';
    cameraOverlay.style.height = '100%';
  }

  draw();
}

// تحميل صورة
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    img = new Image();
    img.onload = function() {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      scaleRange.value = scale;
      offsetXRange.value = offsetX;
      offsetYRange.value = offsetY;
      draw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// سلايدرات
scaleRange.addEventListener('input', () => {
  scale = parseFloat(scaleRange.value);
  draw();
});

offsetXRange.addEventListener('input', () => {
  offsetX = parseFloat(offsetXRange.value);
  draw();
});

offsetYRange.addEventListener('input', () => {
  offsetY = parseFloat(offsetYRange.value);
  draw();
});

// سحب بالماوس
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  offsetX += e.offsetX - lastX;
  offsetY += e.offsetY - lastY;
  lastX = e.offsetX;
  lastY = e.offsetY;
  offsetXRange.value = offsetX;
  offsetYRange.value = offsetY;
  draw();
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

// لمس + Pinch Zoom
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();

  if (e.touches.length === 1) {
    const touch = e.touches[0];
    offsetX += touch.clientX - lastX;
    offsetY += touch.clientY - lastY;
    lastX = touch.clientX;
    lastY = touch.clientY;
    offsetXRange.value = offsetX;
    offsetYRange.value = offsetY;
    draw();
  }

  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );

    if (!lastDist) lastDist = dist;

    const factor = dist / lastDist;
    scale *= factor;
    if (scale < 0.3) scale = 0.3;
    if (scale > 3.5) scale = 3.5;
    scaleRange.value = scale;
    lastDist = dist;
    draw();
  }
}, { passive: false });

canvas.addEventListener('touchend', () => {
  lastDist = null;
});

// تحميل التصميم PNG للطباعة
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = phoneModelSelect.value + '-phone-case-300dpi.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// عند تغيير الموديل
phoneModelSelect.addEventListener('change', updatePhoneModel);

// تهيئة أولية
window.addEventListener('load', () => {
  updatePhoneModel();
});

