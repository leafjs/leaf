"use strict";

class TestController{
  constructor(app, debug) {
    app.get('/test', function*(next){
        this.body = "get";
    });
    app.get('/test/index', function*(next){
        yield this.render('index.dust');
    });
    app.post('/test', function*(next){
      var params = yield this.req.body();
      this.body="post" + params.name;
    });

    app.put('/test', function*(next){
      var params = yield this.req.body();
      this.body = "put" + params.name;
    });

    app.get('/test/:name', function*(next){
      this.body = "get"+ this.params.name;
    });
  }
}

exports = module.exports = TestController;
