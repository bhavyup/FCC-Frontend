const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const projects = [
  'random-quote-machine',
  'markdown-previewer',
  'drum-machine',
  'javascript-calculator',
  'pomodoro-clock',
  'local-weather',
  'twitch-tv'
];

projects.forEach(project => {
  app.use(`/${project}`, express.static(path.join(__dirname, 'projects', project, 'public')));
});

app.use(express.static(path.join(__dirname, 'dashboard', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});