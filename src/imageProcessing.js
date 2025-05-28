import { getCurrentUsername } from './auth.js';

export let currentImage = null;

export function handleImageUpload(event, saveRecent, saveAction) {
  const file = event.target.files[0];
  const username = getCurrentUsername();
  if (!username) {
    alert('Помилка: користувач не авторизований. Спробуйте увійти ще раз.');
    return;
  }
  if (file && file.type === 'image/bmp') {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        currentImage = img;
        saveRecent('files', file.name);
        saveAction('files', file.name);
        // Зберігаємо в localStorage
        localStorage.setItem('lastImageDataURL', e.target.result);
        localStorage.setItem('lastImageName', file.name);
        // Відображаємо зображення на канві
        const canvas = document.getElementById('result-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.style.display = 'block';
        uploadFile(file, username);
      };
      img.onerror = function() {
        alert('Помилка завантаження зображення.');
      };
      img.src = e.target.result;
    };
    reader.onerror = function() {
      alert('Помилка читання файлу.');
    };
    reader.readAsDataURL(file);
  } else {
    alert('Будь ласка, виберіть BMP файл.');
  }
}

async function uploadFile(file, username) {
  if (!username) {
    alert('Помилка: користувач не авторизований. Спробуйте увійти ще раз.');
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('username', username);
  try {
    const response = await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData,
    });
    if (response.ok) {
      console.log('Файл успішно завантажено');
    } else {
      console.error('Помилка завантаження файлу, статус:', response.status);
      alert('Помилка завантаження файлу на сервер.');
    }
  } catch (error) {
    console.error('Помилка під час завантаження файлу:', error);
    alert('Помилка під час завантаження файлу.');
  }
}

export function loadImageFromPath(filePath) {
  const img = new Image();
  img.onload = function() {
    currentImage = img;
    // Відображаємо зображення на канві
    const canvas = document.getElementById('result-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    canvas.style.display = 'block';
    // Зберігаємо в localStorage
    localStorage.setItem('lastImageDataURL', img.src);
    localStorage.setItem('lastImageName', filePath.split('/').pop());
  };
  img.onerror = function() {
    alert('Помилка завантаження зображення з сервера.');
  };
  img.src = '/server/' + filePath;
}
// Решта коду залишається без змін
export function processImage(saveRecent, saveAction) {
  if (!currentImage) {
    alert('Спочатку виберіть зображення.');
    return;
  }

  const transformMethod = document.getElementById('transform-method').value;
  const colorCombo = document.getElementById('color-combo').value;

  saveRecent('transformMethod', transformMethod);
  saveRecent('colorCombo', colorCombo);
  saveAction('transformMethods', transformMethod);

  const canvas = document.getElementById('result-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = currentImage.width;
  canvas.height = currentImage.height;
  ctx.drawImage(currentImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      let r = data[index];
      let g = data[index + 1];
      let b = data[index + 2];

      const dx = x - centerX;
      const dy = y - centerY;
      const theta = Math.atan2(dy, dx);
      const radius = Math.sqrt(dx * dx + dy * dy);

      if (transformMethod === 'solar-rays') {
        const numSectors = 12;
        const sectorAngle = (2 * Math.PI) / numSectors;
        const sector = Math.floor((theta + Math.PI) / sectorAngle);
        const intensity = ((theta + Math.PI) % sectorAngle) / sectorAngle;
        r = (r + (sector * 255) / numSectors) % 255;
        g = (g + intensity * 255) % 255;
        b = (b + (sector % 2) * 255) % 255;
      } else if (transformMethod === 'flower-pattern') {
        const n = 5;
        const angle = theta + Math.PI;
        const modulation = Math.abs(Math.sin(n * angle));
        r = (r + modulation * 255) % 255;
        g = (g + Math.cos(n * angle) * 127 + 127) % 255;
        b = (b + (radius / Math.max(canvas.width, canvas.height)) * 255) % 255;
      } else if (transformMethod === 'digital-rain') {
        const seed = Math.abs(Math.sin(x * 91.73) * 10000);
        const columnSeed = Math.floor(seed) % canvas.height;
        const tailLength = 8 + Math.floor((seed * 3) % 12);
        const offset = y - columnSeed;
        if (offset >= 0 && offset < tailLength) {
          const intensity = 1 - offset / tailLength;
          r *= (1 - intensity);
          b *= (1 - intensity);
          g = Math.min(255, g + intensity * 255);
        } else {
          const bgDarken = 0.75;
          r *= bgDarken;
          g *= bgDarken;
          b *= bgDarken;
        }
      }

      if (colorCombo === 'grayscale') {
        const avg = (r + g + b) / 3;
        r = g = b = avg;
      } else if (colorCombo === 'sepia') {
        const newR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        const newG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        const newB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        r = newR;
        g = newG;
        b = newB;
      }

      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  canvas.style.display = 'block';
  document.getElementById('download-btn').style.display = 'block';
  document.getElementById('download-btn').onclick = function () {
    downloadBMP(canvas);
  };
}

export function downloadBMP(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const width = canvas.width;
  const height = canvas.height;
  const fileSize = 54 + 3 * width * height;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4D);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, 3 * width * height, true);
  view.setUint32(38, 2835, true);
  view.setUint32(42, 2835, true);

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const bmpIndex = 54 + (height - 1 - y) * rowSize + x * 3;
      view.setUint8(bmpIndex, data[index + 2]);
      view.setUint8(bmpIndex + 1, data[index + 1]);
      view.setUint8(bmpIndex + 2, data[index]);
    }
  }

  const blob = new Blob([buffer], { type: 'image/bmp' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'processed_image.bmp';
  a.click();
  URL.revokeObjectURL(url);
}