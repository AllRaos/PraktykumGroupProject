export let currentUsername = null;

export function showSection(sectionId) {
  document.getElementById('auth-section').style.display = sectionId === 'auth' ? 'block' : 'none';
  document.getElementById('main-section').style.display = sectionId === 'main' ? 'block' : 'none';
}

export function showLoginForm() {
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('register-form').style.display = 'none';
}

export function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'flex';
}

export async function login(loadUserPreferences, loadUserActions) {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  localStorage.setItem('username', username);
  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (data.success) {
      currentUsername = username;
      localStorage.setItem('isLoggedIn', 'true'); // Зберігаємо стан авторизації
      showSection('main');
      loadUserPreferences(username);
      loadUserActions();
    } else {
      alert(data.message || 'Невірне ім’я користувача або пароль');
    }
  } catch (error) {
    console.error('Помилка під час авторизації:', error);
    alert('Помилка під час авторизації');
  }
}

export async function register() {
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (data.success) {
      alert('Реєстрація успішна! Будь ласка, увійдіть.');
      showLoginForm();
    } else {
      alert(data.message || 'Помилка реєстрації. Можливо, ім’я користувача вже зайнято.');
    }
  } catch (error) {
    console.error('Помилка під час реєстрації:', error);
    alert('Помилка під час реєстрації');
  }
}

export function getCurrentUsername() {
  return localStorage.getItem('username');
}

export function logout() {
  currentUsername = null;
  localStorage.removeItem('isLoggedIn'); // Видаляємо стан авторизації
  localStorage.removeItem('username'); // Видаляємо ім'я користувача
  document.getElementById('image-input').value = '';
  document.getElementById('result-canvas').style.display = 'none';
  document.getElementById('download-btn').style.display = 'none';
  document.getElementById('extracted-message').style.display = 'none';
  document.getElementById('message-input').value = '';
  showSection('auth');
  showLoginForm();
}

// Перевірка стану авторизації при завантаженні сторінки
export function checkLoginStatus(loadUserPreferences, loadUserActions) {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const username = localStorage.getItem('username');
  if (isLoggedIn === 'true' && username) {
    currentUsername = username;
    showSection('main');
    loadUserPreferences(username);
    loadUserActions();
  } else {
    showSection('auth');
    showLoginForm();
  }
}