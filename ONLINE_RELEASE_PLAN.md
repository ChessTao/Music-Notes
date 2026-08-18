# План выхода онлайн через Firebase

Цель: опубликовать игру как Firebase-приложение без Render и PostgreSQL.

## 1. Создать Firebase Project

В Firebase Console:

1. Add project.
2. Название, например `music-notes`.
3. Google Analytics можно выключить.

## 2. Включить Authentication

1. Authentication.
2. Get started.
3. Sign-in method.
4. Email/Password.
5. Enable.

## 3. Включить Firestore

1. Firestore Database.
2. Create database.
3. Production mode.
4. Region лучше выбрать европейский, если доступен.

## 4. Добавить Web App

В Project settings:

1. Add app.
2. Web app.
3. Скопировать `firebaseConfig`.
4. Вставить реальные значения в `src/config.js`.

## 5. Настроить CLI

```powershell
npm.cmd install -g firebase-tools
firebase login
```

Скопировать `.firebaserc.example` в `.firebaserc` и заменить:

```text
YOUR_FIREBASE_PROJECT_ID
```

на реальный Firebase project id.

## 6. Проверить локально

```powershell
npm.cmd run check
npm.cmd run dev
```

Открыть:

```text
http://127.0.0.1:4173/
```

Проверить:

- регистрация через email/password;
- вход;
- игра;
- сохранение результата;
- загрузка таблицы лидеров.

## 7. Деплой

```powershell
firebase deploy
```

Команда опубликует:

- Firebase Hosting;
- Firestore Rules;
- Firestore Indexes.

## 8. Проверка публичного URL

После деплоя открыть Hosting URL и проверить:

- сайт открывается по HTTPS;
- нет битой кодировки;
- регистрация работает;
- вход восстанавливается после обновления страницы;
- результат попадает в Firestore;
- таблица лидеров показывает онлайн-результаты;
- все четыре уровня игры доступны.

## 9. Если появится ошибка индекса

Если Firestore пожалуется на индекс, он даст ссылку на создание индекса. Но основной индекс уже описан в `firestore.indexes.json`:

```text
leaders: level ASC, score DESC, date ASC
```

После `firebase deploy` он должен быть создан автоматически.
