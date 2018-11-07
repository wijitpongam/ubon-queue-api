
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
  getVisit(db, datevisit) {
    return db('visit as v')
      .innerJoin('service_point as p', 'p.servpoint_code', 'v.cln')
      .where('v.datevisit', datevisit)
      .orderBy('v.vn')
      .limit(20)
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
  }



};