const moment = require('moment');

module.exports = {
  doLogin(db, username, password) {
    return db('users')
      .select('username', 'email', 'id')
      .where('username', username)
      .where('password', password)
      .limit(1);
  },

  getList(db) {
    return db('users').orderBy('id');
  },

  save(db, data) {
    return db('users').insert(data, 'id');
  },

  update(db, id, data) {
    return db('users')
      .where('id', id)
      .update(data);
  },

  remove(db, id) {
    return db('users')
      .where('id', id)
      .del();
  },

  getInfo(db, id) {
    return db('users')
      .where('id', id);
  },

  // Queue 

  getPriority(db) {
    return db('l_priority');
  },

  getRooms(db, servpointCode) {
    return db('service_room')
      .where('servpoint_code', servpointCode)
      .orderBy('room_number');
  },

  setQueueRoomNumber(db, vn, roomId) {
    return db('queue')
      .where('vn', vn)
      .update({ room_id: roomId });
  },

  updateCurrentQueue(db, hcode, servpointCode, dateServ, currentQueue, roomId) {
    var sql = `
    INSERT INTO queue_detail(hcode, servpoint_code, date_serv, current_queue, room_id)
    VALUES(?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE current_queue=?, room_id=?
    `;
    return db.raw(sql, [hcode, servpointCode, dateServ, currentQueue, roomId, currentQueue, roomId]);
  },

  getClinicQueue(db, servpointCode, hcode) {
    var sql = `
    select q.*, v.fname, v.lname, p.priority_name
    from queue as q
    inner join visit as v on v.hn=q.hn and v.vn=q.vn
    left join l_priority as p on p.priority_id=q.priority_id
    where q.servpoint_code=? and q.room_id is null and q.hcode=?
    order by q.queue_number asc
    `;
    return db.raw(sql, [servpointCode, hcode]);
  },

  getQueueClinic(db, servpointCode, dateServ) {
    var sql = `
    select qd.*, v.hn, v.fname, v.lname, sr.room_name, sr.room_number, po.priority_name
    from queue_detail as qd
    inner join queue as q on q.queue_number=qd.current_queue and q.servpoint_code=? and q.date_serv=?
    inner join visit as v on v.vn=q.vn
    inner join service_room as sr on sr.room_id=qd.room_id
    inner join l_priority as po on po.priority_id=q.priority_id
    where qd.servpoint_code=? and qd.date_serv=?
    `;
    return db.raw(sql, [servpointCode, dateServ, servpointCode, dateServ]);
  },

  getClinic(db, hcode, dateServ) {
    var sqlCount = db('queue as q')
      .select(db.raw('count(*)'))
      .where('q.hcode', hcode)
      .whereRaw('q.servpoint_code=s.servpoint_code')
      .whereNull('q.room_id')
      .where('date_serv', dateServ)
      .groupBy('q.servpoint_code')
      .as('total');

    return db('service_point as s')
      .select('s.*', sqlCount)
      .where('s.hcode', hcode)
      .orderBy('s.servpoint_name');
  },

  getVisit(db, datevisit) {

    var subQuery = db('queue as q')
      .select('q.vn')
      .where('q.date_serv', datevisit);

    return db('visit as v')
      .innerJoin('service_point as p', 'p.servpoint_code', 'v.cln')
      .where('v.datevisit', datevisit)
      .whereNotIn('v.vn', subQuery)
      .orderBy('v.vn');
    // .limit(20);
  },

  updateServicePointQueueNumber(db, hcode, servpointCode, dateServ) {
    return db('queue_number')
      .where('hcode', hcode)
      .where('servpoint_code', servpointCode)
      .where('date_serv', dateServ)
      .increment('queue_number', 1);
  },

  createServicePointQueueNumber(db, hcode, servpointCode, dateServ) {
    return db('queue_number')
      .insert({
        hcode: hcode,
        servpoint_code: servpointCode,
        date_serv: dateServ,
        queue_number: 1
      });
  },

  checkServicePointQueueNumber(db, hcode, servpointCode, dateServ) {
    return db('queue_number')
      .where('hcode', hcode)
      .where('servpoint_code', servpointCode)
      .where('date_serv', dateServ)
      .limit(1);
  },

  createQueueInfo(db, hcode, servpointCode, dateServ, queueNumber, hn, vn, priorityId) {
    var dateCreate = moment().format('YYYY-MM-DD HH:mm:ss');

    return db('queue')
      .insert({
        hcode: hcode,
        hn: hn,
        vn: vn,
        servpoint_code: servpointCode,
        date_serv: dateServ,
        queue_number: queueNumber,
        priority_id: priorityId,
        date_create: dateCreate
      });
  },


};