import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import { sequelize } from './conf.js';
import { User, Recent, UserAction, UserFile } from './models.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Налаштування multer для зберігання файлів
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Ендпоінт для авторизації
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Перевірка на порожні поля
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача та пароль не можуть бути порожніми' });
  }
  const user = await User.findOne({ where: { username, password } });
  if (user) {
    res.json({ success: true, username });
  } else {
    res.json({ success: false, message: 'Невірне ім’я користувача або пароль' });
  }
});

// Ендпоінт для реєстрації з перевірками
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Перевірка на порожні поля
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача та пароль не можуть бути порожніми' });
  }

  // Перевірка формату імені користувача (лише букви, цифри, підкреслення)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача може містити лише букви, цифри та символи підкреслення' });
  }

  // Перевірка довжини імені користувача
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача має бути від 3 до 20 символів' });
  }

  // Перевірка довжини пароля
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Пароль має бути щонайменше 6 символів' });
  }

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Ім’я користувача вже зайнято' });
    }
    await User.create({ username, password });
    res.json({ success: true, message: 'Реєстрація успішна' });
  } catch (error) {
    console.error('Помилка під час реєстрації:', error);
    res.status(500).json({ success: false, message: 'Помилка сервера під час реєстрації' });
  }
});

// Ендпоінт для завантаження файлів
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const username = req.body.username;
  if (!file) {
    return res.status(400).json({ success: false, message: 'Файл не завантажено' });
  }
  if (!username) {
    return res.status(401).json({ success: false, message: 'Користувач не авторизований' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }

  const userFiles = await UserFile.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'ASC']],
  });

  if (userFiles.length >= 3) {
    const oldestFile = userFiles[0];
    await oldestFile.destroy();
  }

  await UserFile.create({ userId: user.id, filePath: file.path });
  res.json({ success: true, message: 'Файл успішно завантажено' });
});

// Ендпоінт для отримання останніх файлів
app.get('/files/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача не вказано' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }
  const files = await UserFile.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
    limit: 3,
  });
  res.json(files.map(file => file.filePath));
});

// Ендпоінти для recent і actions
app.get('/recent/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача не вказано' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }
  const recents = await Recent.findAll({ where: { userId: user.id } });
  const data = {
    files: [],
    transformMethod: [],
    colorCombo: [],
    embeddedMessages: [],
  };
  recents.forEach(recent => {
    data[recent.type].push(recent.value);
  });
  res.json(data);
});

app.post('/save-recent', async (req, res) => {
  const { username, type, value } = req.body;
  if (!username || !type || !value) {
    return res.status(400).json({ success: false, message: 'Усі поля (username, type, value) є обов’язковими' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }
  const recents = await Recent.findAll({ where: { userId: user.id, type } });
  if (!recents.some(recent => recent.value === value)) {
    await Recent.create({ userId: user.id, type, value });
    if (recents.length >= 3) {
      await Recent.destroy({ where: { userId: user.id, type }, order: [['createdAt', 'ASC']], limit: 1 });
    }
  }
  res.json({ success: true });
});

app.post('/save-action', async (req, res) => {
  const { username, actionType, actionValue } = req.body;
  if (!username || !actionType || !actionValue) {
    return res.status(400).json({ success: false, message: 'Усі поля (username, actionType, actionValue) є обов’язковими' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }
  await UserAction.create({ userId: user.id, actionType, actionValue });
  const actions = await UserAction.findAll({
    where: { userId: user.id, actionType },
    order: [['createdAt', 'DESC']],
  });
  if (actions.length > 3) {
    const idsToDelete = actions.slice(3).map(action => action.id);
    await UserAction.destroy({ where: { id: idsToDelete } });
  }
  res.json({ success: true });
});

app.get('/actions/:username', async (req, res) => {
  const username = req.params.username;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Ім’я користувача не вказано' });
  }
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'Користувача не знайдено' });
  }
  const actions = await UserAction.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
  });
  const data = {
    files: [],
    transformMethods: [],
    embeddedMessages: [],
    extractedMessages: [],
  };
  actions.forEach(action => {
    if (data[action.actionType].length < 3) {
      data[action.actionType].push(action.actionValue);
    }
  });
  res.json(data);
});

// Синхронізація бази даних і запуск сервера
sequelize.sync({ force: true }).then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});