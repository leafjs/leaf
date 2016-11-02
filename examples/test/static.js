"use strict";
var chai = require("chai"),
  expect = chai.expect,
  chaiHttp = require("chai-http"),
  TestApp = require('../'),
  sioClient = require("socket.io-client"),
  mdns = require('leaf-mdns');

chai.use(chaiHttp);

describe('leafjs http Static From Public folder', function() {
  var app = new TestApp(),
    app, sio, socket, browser;
  before(function(done) {
    this.timeout(5000);
    app.start().then(function(tapp) {
      done();
    }, function(err) {
      done(err);
    });
  });
  after(function(done) {
    this.timeout(5000);
    app.close().then(function() {
      done();
    }, function(err) {
      done(err);
    });
  });
  it("should get a test.js", function(done) {
    this.timeout(5000);
    chai.request("http://localhost:8000")
      .get("/static/test.js")
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        expect(res).to.have.status(200);
        done();
      });
  });
  it("should get a index.dust", function(done) {
    this.timeout(5000);
    chai.request("http://localhost:8000")
      .get("/test/index")
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        expect(res).to.have.status(200);
        done();
      });
  });
});