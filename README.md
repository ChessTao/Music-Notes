# Учим ноты

Браузерная игра для тренировки чтения нот. Онлайн-часть работает через Firebase:

- Firebase Hosting отдает статический фронт;
- Firebase Auth хранит регистрацию и вход по email/password;
- Firestore хранит профили и таблицу лидеров;
- `localStorage` используется только как локальный fallback.

## Локальный запуск

```powershell
npm.cmd install
npm.cmd run dev
```

Открыть:

```text
http://127.0.0.1:4173/
```

## Проверки

```powershell
npm.cmd run check
```

## Настройка Firebase

1. Создать проект в Firebase Console.
2. Включить Authentication → Email/Password.
3. Включить Firestore Database.
4. Включить Hosting.
5. В Project settings → Web app скопировать Firebase config.
6. Вставить config в [src/config.js](src/config.js).
7. Скопировать `.firebaserc.example` в `.firebaserc` и заменить `YOUR_FIREBASE_PROJECT_ID`.

Пока в [src/config.js](src/config.js) стоят `PASTE_...`, онлайн-вход и Firestore выключены, игра работает локально.

## Деплой

```powershell
firebase login
firebase deploy
```

В репозитории уже есть:

- [firebase.json](firebase.json)
- [firestore.rules](firestore.rules)
- [firestore.indexes.json](firestore.indexes.json)

## Проверка после деплоя

- сайт открывается по Firebase Hosting URL;
- регистрация через email/password работает;
- вход работает после обновления страницы;
- результат игры сохраняется в Firestore;
- таблица лидеров загружается из Firestore;
- все четыре уровня запускаются.

## Важное ограничение

Firebase-вариант не имеет собственного серверного валидатора результата. Защита основана на Firebase Auth и Firestore Rules. Для маленькой учебной игры этого достаточно как практичный онлайн-вариант, но при соревновательном публичном запуске честность лидерборда лучше усиливать Cloud Functions.
