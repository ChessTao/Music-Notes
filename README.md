# Учим ноты

Маленькое онлайн-приложение для тренировки чтения нот. Фронтенд открывается в браузере, а профили, сессии, комнаты и результаты хранятся через серверный API.

## Архитектура

```text
browser SPA
  -> /api/...
Node.js server
  -> server-storage.js
PostgreSQL через DATABASE_URL
  или .runtime JSON fallback для разработки
```

Фронт отвечает за интерфейс и игру. Он не является главной памятью приложения. `localStorage` используется только как локальный кэш таблицы лидеров и fallback для гостевого режима.

## Локальный запуск

```powershell
npm.cmd install
npm.cmd start
```

Открыть:

```text
http://127.0.0.1:4173/
```

Без `DATABASE_URL` сервер хранит данные в `.runtime/app-store.json`.

## Проверки

```powershell
npm.cmd run check
npm.cmd run online-smoke
```

Health endpoint:

```text
http://127.0.0.1:4173/api/health
```

Ожидаемый ответ содержит:

```json
{"ok":true}
```

## PostgreSQL

В production задается:

```text
DATABASE_URL=postgres://user:password@host:5432/dbname
COOKIE_SECURE=true
```

Для локального HTTP-запуска `COOKIE_SECURE` можно оставить `false` или не задавать.

Если переменная есть, `server-storage.js` использует PostgreSQL и создает таблицы:

```sql
app_store (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null
)

server_errors (
  id bigserial primary key,
  created_at timestamptz not null,
  scope text,
  message text,
  stack text,
  context jsonb
)
```

`app_store` хранит блоки `profiles`, `sessions`, `online_rooms`, `leaderboard_results`.

## Docker Compose

Production-подобный запуск:

```powershell
docker compose up --build
```

Состав:

- `app` — Node.js приложение;
- `postgres` — база данных;
- `postgres-data` — постоянный volume для данных.

## API

- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/session`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/leaderboard`
- `POST /api/results`
- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:id/join`
- `GET /api/errors`

В production `/api/errors` требует `ERROR_VIEW_TOKEN` и заголовок `x-error-view-token` или query `?token=...`.

## Готовность к онлайну

Перед публичной ссылкой проверить:

- `npm.cmd run check`
- `npm.cmd run online-smoke`
- сайт открывается по HTTPS;
- регистрация и вход работают;
- профиль восстанавливается после обновления страницы;
- результат появляется в таблице лидеров;
- после перезапуска сервера данные не исчезают;
- при Docker-запуске данные живут в `postgres-data`;
- `/api/health` возвращает `{"ok":true}`.
