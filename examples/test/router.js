var chai = require("chai"),
  expect = chai.expect,
  chaiHttp = require("chai-http"),
  TestApp = require('../'),
  sioClient = require("socket.io-client");

chai.use(chaiHttp);

describe('Routes', function() {
  var app = new TestApp(),
    sio, socket;
  before(function(done) {
    this.timeout(5000);
    app.start().then(function() {
      sio = sioClient('http://localhost:8000', {
        transports: ['websocket']
      });
      sio.once('connect', function(sock) {
        done();
      })
    }, function(err) {
      done(err);
    });
  });
  after(function(done) {
    this.timeout(5000);
    sio.disconnect();
    app.close().then(function() {
      done();
    }, function(err) {
      done(err);
    });
  });
  it('should have a get(/test)', function(done) {
    chai.request("http://localhost:8000")
      .get("/test")
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        expect(res).to.have.status(200);
        expect(res.text).to.eql('get');
        done();
      });
  });
  it('should have a post(/test)', function(done) {
    chai
      .request("http://localhost:8000")
      .post("/test")
      .field("name", "chrisye")
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        expect(res).to.have.status(200);
        expect(res.text).to.eql('postchrisye');
        done();
      });
  });
  it('should have a get(/test/:name)', function(done) {
    chai.request("http://localhost:8000")
      .get("/test/chrisye")
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        expect(res).to.have.status(200);
        expect(res.text).to.eql('getchrisye');
        done();
      });
  });
  it('websocket: should have a get(/test)', function(done) {
    sio.emit('s', "get", "/test", {}, {}, function(status, headers, body) {
      expect(status).eql(200);
      expect(body).eql('get');
      done();
    });
  });
  it('websocket: should have a post(/test)', function(done) {
    sio.emit('s', "post", "/test", {
      "name": "chrisye"
    }, {}, function(status, headers, body) {
      expect(status).eql(200);
      expect(body).eql('postchrisye');
      done();
    });
  });
  it('websocket: should have a get(/test/:name)', function(done) {
    sio.emit('s', "get", "/test/chrisye", {}, {}, function(status, headers, body) {
      expect(status).eql(200);
      expect(body).eql('getchrisye');
      done();
    });
  });
});