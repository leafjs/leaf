"use strict";
var chai = require("chai"),
  expect = chai.expect,
  JWT = require('../lib/Http/provider/jwt.js'),
  jwt = new JWT();

describe('Jwt should sign correctly', function(){
  it("should sign correctly and decode correctly", function(done){
    var payload = {name: "chrisye"};
    jwt.sign(payload).then(function(token){
      expect(token);
      jwt.verify(token).then(function(payload){
        expect(payload);
        expect(payload.name).eql('chrisye');
        done();
      }).catch(done);
    }).catch(done);
  });
});
