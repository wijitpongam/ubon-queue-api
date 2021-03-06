'use strict';

require('dotenv').config();
const Knex = require('knex');
const path = require('path');
const fs = require('fs');

const crypto = require('crypto');
var multer = require('multer');

const moment = require('moment');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const HttpStatus = require('http-status-codes');
const fse = require('fs-extra');
const jwt = require('./jwt');
const model = require('./model');

const app = express();

const uploadDir = process.env.UPLOAD_DIR || './uploaded';

fse.ensureDirSync(uploadDir);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage });

// var upload = multer({ dest: process.env.UPLOAD_DIR || './uploaded' });

var db = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: +process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

let checkAuth = (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else {
    token = req.body.token;
  }

  jwt.verify(token)
    .then((decoded) => {
      req.decoded = decoded;
      next();
    }, err => {
      return res.send({
        ok: false,
        error: HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED),
        code: HttpStatus.UNAUTHORIZED
      });
    });
}

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (req, res) => res.send({ ok: true, message: 'Welcome to my api serve!', code: HttpStatus.OK }));
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  res.send({ ok: true, message: 'File uploaded!', code: HttpStatus.OK });
});

app.post('/login', async (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  if (username && password) {
    var encPassword = crypto.createHash('md5').update(password).digest('hex');

    try {
      var rs = await model.doLogin(db, username, encPassword);
      if (rs.length) {
        var token = jwt.sign({ username: username });
        res.send({ ok: true, token: token });
      } else {
        res.send({ ok: false, error: 'Invalid username or password!', code: HttpStatus.UNAUTHORIZED });
      }
    } catch (error) {
      console.log(error);
      res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
    }

  } else {
    res.send({ ok: false, error: 'Invalid data!', code: HttpStatus.INTERNAL_SERVER_ERROR });
  }

});

app.get('/users', checkAuth, async (req, res, next) => {
  try {
    var rs = await model.getList(db);
    res.send({ ok: true, rows: rs });
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.post('/users', checkAuth, async (req, res, next) => {
  try {
    var username = req.body.username;
    var password = req.body.password;
    var fullname = req.body.fullname;
    var email = req.body.email;

    if (username && password && email && fullname) {
      var encPassword = crypto.createHash('md5').update(password).digest('hex');
      var data = {
        username: username,
        password: encPassword,
        fullname: fullname,
        email: email
      };
      var rs = await model.save(db, data);
      res.send({ ok: true, id: rs[0] });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.put('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;
    var fullname = req.body.fullname;
    var email = req.body.email;

    if (id && email && fullname) {
      var data = {
        fullname: fullname,
        email: email
      };
      var rs = await model.update(db, id, data);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.delete('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;

    if (id) {
      await model.remove(db, id);
      res.send({ ok: true });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.get('/users/:id', checkAuth, async (req, res, next) => {
  try {
    var id = req.params.id;

    if (id) {
      var rs = await model.getInfo(db, id);
      res.send({ ok: true, info: rs[0] });
    } else {
      res.send({ ok: false, error: 'Invalid data', code: HttpStatus.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    console.log(error);
    res.send({ ok: false, error: error.message, code: HttpStatus.INTERNAL_SERVER_ERROR });
  }
});

app.get('/queue/visit', checkAuth, async (req, res) => {
  var datevisit = moment().format('YYYY-MM-DD');
  var rs = await model.getVisit(db, datevisit);
  var data = [];

  rs.forEach(v => {
    var obj = {};
    obj.hn = v.hn;
    obj.vn = v.vn;
    obj.fname = v.fname;
    obj.lname = v.lname;
    obj.cln = v.cln;
    obj.namecln = v.namecln;
    obj.datevisit = moment(v.datevisit).format('YYYY-MM-DD');
    obj.timevisit = v.timevisit;

    data.push(obj);
  });

  res.send({ ok: true, rows: data });
});

app.get('/queue/priority', checkAuth, async (req, res) => {
  var rs = await model.getPriority(db);
  res.send({ ok: true, rows: rs });
});

app.get('/qrcode', async (req, res) => {
  var QRCode = require('qrcode');
  QRCode.toDataURL('https://www.google.com', {
    color: {
      dark: '#018786', // Transparent background
    },
    margin: 4
  })
    .then(url => {
      var img = new Buffer(url.split(',')[1], 'base64');

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
      });
      res.end(img);

    }).catch(err => {
      console.log(err);
      res.send({ ok: false, error: err });
    });

});

app.get('/queue/rooms', checkAuth, async (req, res) => {
  var servpointCode = req.query.servpointCode;

  var rs = await model.getRooms(db, servpointCode);
  res.send({ ok: true, rows: rs });
});

app.get('/queue/clinic', checkAuth, async (req, res) => {
  var dateServ = moment().format('YYYY-MM-DD');
  var rs = await model.getClinic(db, process.env.HCODE, dateServ);
  res.send({ ok: true, rows: rs });
});

app.get('/queue/clinic-queue', checkAuth, async (req, res) => {

  var servpointCode = req.query.servpointCode;

  var rs = await model.getClinicQueue(db, servpointCode, process.env.HCODE);

  var data = [];

  rs[0].forEach(v => {
    var obj = {
      "hcode": v.hcode,
      "hn": v.hn,
      "vn": v.vn,
      "servpoint_code": v.servpoint_code,
      "priority_id": v.priority_id,
      "room_id": v.room_id,
      "date_serv": moment(v.date_serv).format('YYYY-MM-DD'),
      "queue_number": v.queue_number,
      "queue_his": v.queue_his,
      "fname": v.fname,
      "lname": v.lname,
      "priority_name": v.priority_name
    };

    data.push(obj);

  });

  res.send({ ok: true, rows: data });
});

app.get('/queue/queue-clinic', checkAuth, async (req, res) => {

  var servpointCode = req.query.servpointCode;
  var dateServ = moment().format('YYYY-MM-DD');

  var rs = await model.getQueueClinic(db, servpointCode, dateServ);

  var data = [];

  rs[0].forEach(v => {
    var obj = {
      "hn": v.hn,
      "priority_name": v.priority_name,
      "room_number": v.room_number,
      "room_name": v.room_name,
      "update_date": moment(v.update_date).format('YYYY-MM-DD HH:mm'),
      "current_queue": v.current_queue,
      "fname": v.fname,
      "lname": v.lname
    };

    data.push(obj);

  });

  res.send({ ok: true, rows: data });
});

app.post('/queue/queue-caller', checkAuth, async (req, res) => {
  console.log(req.body);
  var servpointCode = req.body.servpointCode;
  var dateServ = req.body.dateServ;
  var roomId = req.body.roomId;
  var vn = req.body.vn;
  var queueNumber = req.body.queueNumber;
  var hcode = process.env.HCODE;

  await model.setQueueRoomNumber(db, vn, roomId);
  await model.updateCurrentQueue(db, hcode, servpointCode, dateServ, queueNumber, roomId);

  res.send({ ok: true });
});

app.post('/queue/register', checkAuth, async (req, res) => {

  console.log(req.body);

  var servpointCode = req.body.servpointCode;
  var hcode = process.env.HCODE;
  var dateServ = req.body.dateServ;
  var hn = req.body.hn;
  var vn = req.body.vn;
  var prename = req.body.prename;
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var birthDate = req.body.birthDate;

  var priorityId = req.body.priorityId;

  var queueNumber = 0;
  // 1.ตรวจสอบคิวปัจจุบันของแผนก
  try {
    var rs1 = await model.checkServicePointQueueNumber(db, hcode, servpointCode, dateServ);
    if (rs1.length) {
      queueNumber = rs1[0]['queue_number'] + 1;
      await model.updateServicePointQueueNumber(db, hcode, servpointCode, dateServ);
      // return queue
    } else {
      console.log('New queue');
      queueNumber = 1;
      await model.createServicePointQueueNumber(db, hcode, servpointCode, dateServ);
      // return queue
    }

    await model.createQueueInfo(
      db, hcode, servpointCode,
      dateServ, queueNumber,
      hn, vn, priorityId
    );

    res.send({ ok: true, hn: hn, vn: vn, queueNumber: queueNumber });

  } catch (error) {
    console.log(error);
    res.send({ ok: false })
  }


});

//error handlers
if (process.env.NODE_ENV === 'development') {
  app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        ok: false,
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
      }
    });
  });
}

app.use((req, res, next) => {
  res.status(HttpStatus.NOT_FOUND).json({
    error: {
      ok: false,
      code: HttpStatus.NOT_FOUND,
      error: HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
    }
  });
});

var port = +process.env.WWW_PORT || 3000;

app.listen(port, () => console.log(`Api listening on port ${port}!`));