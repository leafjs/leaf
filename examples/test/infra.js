"use strict";
var chai = require("chai"),
  expect = chai.expect,
  chaiHttp = require("chai-http"),
  LeafHttp = require('../index'),
  sioClient = require("socket.io-client"),
  mdns = require('leaf-mdns');

chai.use(chaiHttp);

describe('Leafjs Htpp Infra', function(){
  var app = new LeafHttp(), sio, socket, browser, service;
  before(function(done) {
    this.timeout(5000);
    app.start().then(function(){
      done();
    }, function(err) {
      return done(err);
    });
  });
  after(function(done){
    this.timeout(5000);
    app.close().then(function(){
      done();
    },function(err){
      done(err);
    });
  });
  describe('making service calls', function(){
    it("should be able call /test", function(done){
      this.timeout(5000);
      app.services('leaf-test').get('/test').then(function(res){
        expect(res.status).eql(200);
        expect(res.body).eql('get');
        done();
      });
    })
  });
  describe('making service calls twice using same service', function(){
    it("should be able call /test", function(done){
      this.timeout(5000);
      app.services('leaf-test').post('/test', {
        name: 'chrisye'
      }).then(function(res){
        expect(res.status).eql(200);
        expect(res.body).eql('postchrisye');
        done();
      });
    })
  });
  describe('making service calls twice using same service', function(){
    it("should be able call /test", function(done){
      this.timeout(5000);
      app.services('leaf-test').put('/test', {
        name: 'chrisye'
      }).then(function(res){
        expect(res.status).eql(200);
        expect(res.body).eql('putchrisye');
        done();
      });
    })
  });

  describe('making service calls', function(){
    it("should be able call /test", function(done){
      this.timeout(5000);
      app.services('leaf-test').get('/test/chrisye').then(function(res){
        expect(res.status).eql(200);
        expect(res.body).eql('getchrisye');
        done();
      });
    })
  });
});
