# План выхода онлайн

Цель: опубликовать игру как маленькое онлайн-приложение с серверным API, регистрацией, профилями, комнатами, результатами и PostgreSQL.

## 1. Подготовить сервер

Проект запускается командой:

```powershell
npm.cmd start
```

Сервер делает две вещи:

- отдает статические файлы фронта;
- обслуживает API `/api/...`.

Проверка:

```powershell
npm.cmd run check
npm.cmd start
npm.cmd run online-smoke
```

## 2. Подключить базу данных

В production задать:

```text
DATABASE_URL=postgres://user:password@host:5432/dbname
```

Если `DATABASE_URL` есть, приложение использует PostgreSQL.

Если `DATABASE_URL` нет, приложение использует локальный fallback:

```text
.runtime/app-store.json
```

Локальные JSON-файлы допустимы только для разработки.

## 3. Проверить Docker Compose

Production-подобная схема:

```powershell
docker compose up --build
```

Сервисы:

- `app` — Node.js приложение;
- `postgres` — PostgreSQL;
- `postgres-data` — постоянный volume.

Важно: данные должны жить в volume, а не во временной файловой системе контейнера.

## 4. Выбрать хостинг

Нужен хостинг, который умеет запускать Node.js сервер и подключать PostgreSQL:

- Render
- Railway
- Fly.io
- DigitalOcean App Platform
- VPS
- любой Docker-хостинг

GitHub Pages для этой архитектуры не подходит, потому что это только статический хостинг без Node API и базы.

## 5. Настроить переменные окружения

Минимум:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=4173
DATABASE_URL=postgres://...
ERROR_VIEW_TOKEN=<long-random-token>
COOKIE_SECURE=true
```

Для HTTPS обычно используется reverse proxy или HTTPS, встроенный в платформу деплоя.

## 6. Проверить публичный URL

После деплоя открыть:

```text
https://domain.com/api/health
```

Ожидаемый ответ:

```json
{"ok":true}
```

Затем проверить в браузере:

- сайт открывается по HTTPS;
- регистрация работает;
- вход работает;
- профиль сохраняется после обновления страницы;
- все четыре уровня запускаются;
- результат отправляется через `/api/results`;
- таблица лидеров читается через `/api/leaderboard`;
- комнаты создаются через `/api/rooms`;
- после перезапуска сервера данные остаются;
- `/api/errors` позволяет увидеть серверные ошибки.

## 7. Минимальный критерий готовности

Проект готов к нормальному онлайну, когда:

- `npm.cmd run check` проходит без ошибок;
- `npm.cmd run online-smoke` проходит против локального или публичного URL;
- `DATABASE_URL` подключен к постоянной PostgreSQL;
- публичный URL работает по HTTPS;
- регистрация, вход, профиль, комнаты и лидерборд переживают перезапуск сервера.
