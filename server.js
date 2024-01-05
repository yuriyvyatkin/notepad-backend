const messages = require('./messages');
const MediaMessage = require('./MediaMessage');
const TextMessage = require('./TextMessage');
const http = require('http');
const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const Router = require('@koa/router');
const WS = require('ws');
const cors = require('koa2-cors');
const uuid = require('uuid');
const app = new Koa();

// => CORS
app.use(
  cors({
    origin: '*',
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PATCH'],
  })
)

// => Static file handling
const public = path.join(__dirname, '/public')
app.use(koaStatic(public));

// => Body Parsers
app.use(koaBody({
  multipart: true,
}));

// инициализируем роутер
const router = new Router();

app.use(router.routes()).use(router.allowedMethods());

// подтвердим браузеру, что сервер запущен
router.get('/check', async (ctx) => {
  ctx.response.body = 'hello';
  ctx.response.status = 200;
});

// получим сообщения
router.get('/messages', async (ctx) => {
  let { amountChildren } = ctx.request.query;
  amountChildren = +amountChildren;

  const messagesPortion = 4;
  let body;
  let rest = messages.length;

  if (amountChildren === 0) {
    body = messages.slice(-messagesPortion);
    rest -= messagesPortion;
  } else {
    amountChildren += messagesPortion;
    const difference = amountChildren - messages.length;

    if (amountChildren > messages.length) {
      body = messages.slice(0, messagesPortion - difference);
    } else {
      body = messages.slice(-amountChildren).slice(0, messagesPortion);
    }

    rest = rest - amountChildren;
  }

  ctx.response.body = JSON.stringify({ body, rest });
  ctx.response.status = 200;
});

// добавим новое сообщение
router.post('/messages', async (ctx) => {
  const id = `message#${uuid.v1()}`;
  ctx.request.body.id = id;
  if (ctx.request.type === 'application/json') {
    messages.push(new TextMessage(ctx.request.body));
    ctx.response.body = id;
  } else if (ctx.request.type === 'multipart/form-data') {
    const { file } = ctx.request.files;
    const link = await new Promise((resolve, reject) => {
      const oldPath = file.path;
      const filename = uuid.v4();
      const newPath = path.join(public, filename);

      const callback = (error) => reject(error);

      const readStream = fs.createReadStream(oldPath);
      const writeStream = fs.createWriteStream(newPath);

      readStream.on('error', callback);
      writeStream.on('error', callback);

      readStream.on('close', () => {
        fs.unlink(oldPath, callback);
        resolve(filename);
      });

      readStream.pipe(writeStream);
    });

    ctx.request.body.link = link;
    ctx.request.body.coords = JSON.parse(ctx.request.body.coords);
    messages.push(new MediaMessage(ctx.request.body));
    ctx.response.body = JSON.stringify({ id, link });
  }
  ctx.response.status = 200;
});

// изменим добавленное сообщение
router.patch('/messages', async (ctx) => {
  const { id, changedOption } = ctx.request.body;
  const messageIndex = messages.findIndex((message) => message.id === id);
  if (messageIndex === -1) {
    ctx.response.body = `Message with id #"${id}" not found!`;
    ctx.response.status = 400;
  } else {
    messages[messageIndex][changedOption] = !messages[messageIndex][changedOption];
    ctx.response.status = 204;
  }
});

// создадим веб-сокет для синхронизации сообщений в нескольких окнах
const server = http.createServer(app.callback())
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws) => {
  ws.on('message', (msg) => {
    // поделимся каждым новым сообщением со всеми пользователями
    [...wsServer.clients]
      .filter(o => o.readyState === WS.OPEN && o !== ws)
      .forEach(o => o.send(msg));
  });
});

const port = process.env.PORT || 7070;
server.listen(port);
