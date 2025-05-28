import {
  showLoginForm,
  showRegisterForm,
  showSection,
  login,
  register,
  logout,
  currentUsername,
  checkLoginStatus
} from './auth.js';

import {
  currentImage,
  handleImageUpload,
  processImage,
  downloadBMP,
  loadImageFromPath
} from './imageProcessing.js';

document.addEventListener('DOMContentLoaded', () => {
  // Запобігаємо відправленню форми
  const imageForm = document.getElementById('image-form');
  if (imageForm) {
    imageForm.addEventListener('submit', (e) => {
      e.preventDefault(); // Зупиняємо стандартне відправлення форми
    });
  }

  checkLoginStatus(loadUserPreferences, () => {
    loadUserActions();
    loadUserFiles(currentUsername);
    // Відновлюємо останнє зображення з localStorage
    const lastImageDataURL = localStorage.getItem('lastImageDataURL');
    if (lastImageDataURL) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.getElementById('result-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.style.display = 'block';
      };
      img.src = lastImageDataURL;
    }
  });
});

document.getElementById('register-btn').addEventListener('click', showRegisterForm);
document.getElementById('login-btn').addEventListener('click', () => login(loadUserPreferences, loadUserActions));
document.getElementById('showLog-btn').addEventListener('click', showLoginForm);
document.getElementById('registr-btn').addEventListener('click', register);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('process-btn').addEventListener('click', () => processImage(saveRecent, saveAction));
document.getElementById('image-input').addEventListener('change', e => handleImageUpload(e, saveRecent, saveAction));
document.getElementById('embed-btn').addEventListener('click', embedMessage);
document.getElementById('extract-btn').addEventListener('click', extractMessage);

// Завантаження та відображення останніх файлів при вході
async function loadUserFiles(username) {
  try {
    const response = await fetch(`http://localhost:3000/files/${username}`);
    const files = await response.json();
    const list = document.getElementById('files-list');
    const workableList = document.getElementById('workable-files-list');
    list.innerHTML = '';
    workableList.innerHTML = '';
    files.forEach(filePath => {
      // Для списку "Останні файли" показуємо повний шлях
      const li = document.createElement('li');
      li.classList.add('point');
      li.textContent = filePath;
      li.addEventListener('click', () => {
        loadImageFromPath(filePath);
        document.getElementById('image-input').value = '';
        document.getElementById('image-input').title = filePath;
      });
      list.appendChild(li);

      // Для списку "Зображення, з якими можна працювати" показуємо лише назву файлу
      const workableLi = document.createElement('li');
      workableLi.classList.add('point');
      workableLi.textContent = filePath.split('/').pop();
      workableLi.addEventListener('click', () => {
        loadImageFromPath(filePath);
        document.getElementById('image-input').value = '';
        document.getElementById('image-input').title = filePath;
      });
      workableList.appendChild(workableLi);
    });
    // Завантажуємо останнє збережене зображення, якщо воно є
    const lastImageName = localStorage.getItem('lastImageName');
    if (lastImageName && files.includes(lastImageName)) {
      loadImageFromPath(lastImageName);
    } else if (files.length > 0) {
      loadImageFromPath(files[0]);
    }
  } catch (error) {
    console.error('Помилка завантаження файлів:', error);
  }
}

// Оновлюємо login для завантаження файлів
document.getElementById('login-btn').addEventListener('click', () => {
  login(loadUserPreferences, () => {
    loadUserActions();
    loadUserFiles(currentUsername);
  });
});

// Решта коду залишається без змін
async function embedMessage() {
  const canvas = document.getElementById('result-canvas');
  if (canvas.style.display === 'none' || !canvas.width || !canvas.height) {
    return alert('Спочатку виберіть або обробіть зображення.');
  }

  const message = document.getElementById('message-input').value;
  if (!message) return alert('Введіть повідомлення для вкладення.');
  if (message.includes('$wow$end$')) return alert('Повідомлення не може містити службовий маркер "$wow$end$".');

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const encoder = new TextEncoder();
  const endMarker = encoder.encode('$wow$end$');
  const messageBytes = encoder.encode(message);

  const fullMessage = new Uint8Array(messageBytes.length + endMarker.length);
  fullMessage.set(messageBytes);
  fullMessage.set(endMarker, messageBytes.length);

  const lengthBuffer = new Uint8Array(4);
  new DataView(lengthBuffer.buffer).setUint32(0, fullMessage.length);

  const allBytes = new Uint8Array(4 + fullMessage.length);
  allBytes.set(lengthBuffer, 0);
  allBytes.set(fullMessage, 4);

  const requiredBits = allBytes.length * 8;
  const availableBits = canvas.width * canvas.height * 3;
  if (requiredBits > availableBits) return alert('Зображення занадто маленьке для цього повідомлення.');

  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < requiredBits; i++) {
    if (i % 4 === 3) continue;
    const byteIndex = Math.floor(bitIndex / 8);
    const bit = (allBytes[byteIndex] >> (7 - (bitIndex % 8))) & 1;
    data[i] = (data[i] & 0xFE) | bit;
    bitIndex++;
  }

  ctx.putImageData(imageData, 0, 0);
  canvas.style.display = 'block';
  document.getElementById('download-btn').style.display = 'block';
  document.getElementById('download-btn').onclick = () => downloadBMP(canvas);

  await saveRecent('embeddedMessages', message);
  await saveAction('embeddedMessages', message);
  await loadUserActions(); // Оновлюємо список дій після збереження
}

async function extractMessage() {
  if (!currentImage) return alert('Спочатку виберіть зображення.');

  const canvas = document.getElementById('result-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = currentImage.width;
  canvas.height = currentImage.height;
  ctx.drawImage(currentImage, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const bits = [];
  for (let i = 0; i < data.length; i++) {
    if (i % 4 === 3) continue;
    bits.push(data[i] & 1);
  }

  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8).reduce((acc, bit, idx) => acc | (bit << (7 - idx)), 0);
    bytes.push(byte);
  }

  if (bytes.length < 4) {
    return alert('Недостатньо даних для довжини повідомлення.');
  }

  const length = new DataView(new Uint8Array(bytes.slice(0, 4)).buffer).getUint32(0);
  const messageBytes = bytes.slice(4, 4 + length);

  const decoder = new TextDecoder();
  const fullText = decoder.decode(new Uint8Array(messageBytes));

  const marker = '$wow$end$';
  const endIndex = fullText.indexOf(marker);
  if (endIndex === -1) {
    return alert('Повідомлення пошкоджене або маркер не знайдено.');
  }

  const message = fullText.slice(0, endIndex);
  document.getElementById('extracted-text').textContent = message;
  document.getElementById('extracted-message').style.display = 'block';

  await saveRecent('extractedMessages', message);
  await saveAction('extractedMessages', message);
  await loadUserActions(); // Оновлюємо список дій після збереження
}

export async function saveRecent(type, value) {
  if (!currentUsername) return;
  try {
    await fetch('http://localhost:3000/save-recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUsername, type, value }),
    });
  } catch (error) {
    console.error('Помилка збереження даних:', error);
  }
}

export async function saveAction(actionType, actionValue) {
  if (!currentUsername) return;
  try {
    await fetch('http://localhost:3000/save-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUsername, actionType, actionValue }),
    });
  } catch (error) {
    console.error('Помилка збереження дії:', error);
  }
}

export async function loadUserPreferences(username) {
  try {
    const response = await fetch(`http://localhost:3000/recent/${username}`);
    const data = await response.json();
    if (data.transformMethod?.length) {
      document.getElementById('transform-method').value = data.transformMethod[0];
    }
    if (data.colorCombo?.length) {
      document.getElementById('color-combo').value = data.colorCombo[0];
    }
    if (data.embeddedMessages?.length) {
      document.getElementById('message-input').value = data.embeddedMessages[0];
    }
  } catch (error) {
    console.error('Помилка завантаження налаштувань:', error);
  }
}

export async function loadUserActions() {
  try {
    const response = await fetch(`http://localhost:3000/actions/${currentUsername}`);
    const data = await response.json();
    displayActions('files', data.files);
    displayActions('transformMethods', data.transformMethods);
    displayActions('embeddedMessages', data.embeddedMessages);
    displayActions('extractedMessages', data.extractedMessages);
  } catch (error) {
    console.error('Помилка завантаження історії:', error);
  }
}
function displayActions(type, actions) {
  const list = document.getElementById(`${type}-list`);
  list.innerHTML = '';
  actions.forEach(action => {
    const li = document.createElement('li');
    li.classList.add('point');
    li.textContent = action;
    li.addEventListener('click', () => {
      if (type === 'transformMethods') {
        selectTransformMethod(action);
      }if (type === 'embeddedMessages') {
         selectEmbeddedMassages(action);
      }
      if (type === 'extractedMessages') {
        selectExtractedMassages(action);
      }
    });
    list.appendChild(li);
  });
}
function selectExtractedMassages(method){
  const selectElement = document.getElementById('extracted-text');
  selectElement.textContent = method;
  document.getElementById('extracted-message').style.display = 'block';
}
function selectEmbeddedMassages(method){
  const selectElement = document.getElementById('message-input');
  selectElement.value = method;
}
function selectTransformMethod(method) {
  const selectElement = document.getElementById('transform-method');
  selectElement.value = method;
}