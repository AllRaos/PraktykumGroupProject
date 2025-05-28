const userGuideText = 'Щоб обробити зображення, завантажте BMP-файл, виберіть метод трансформації та натисніть "Обробити зображення". Ви також можете вкладати й витягувати повідомлення.';
const aboutAppText = 'Ця вебпрограма дозволяє здійснювати базову обробку BMP-зображень, застосовувати ефекти та приховувати повідомлення.';
const aboutAuthorsText = 'Розробили студенти спеціальності \"Комп\'ютерні науки\" КН-32: Чабан Руслан, Паранюк Василь, Тарас Андрій.';

document.getElementById('user-guide-btn').addEventListener('click', () => {
  showModal('Інструкція користувача', userGuideText);
});

document.getElementById('about-app-btn').addEventListener('click', () => {
  showModal('Про програму', aboutAppText);
});

document.getElementById('about-authors-btn').addEventListener('click', () => {
  showModal('Про авторів', aboutAuthorsText);
});

function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').textContent = content;
  document.getElementById('modal').style.display = 'block';
  document.getElementById('modal-instruction').style.display = 'block';
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-instruction').style.display = 'block';
});