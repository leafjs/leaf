"use strict";

exports = module.exports = function( options ) {
  options = options || {};

  let hsts;
  if (options.hsts) {
    if (typeof options.hsts === 'number') {
      options.hsts = { maxAge: options.hsts };
    }
    hsts = 'max-age=' + Math.round(options.hsts.maxAge / 1000);
    if (options.includeSubDomains)
      hsts += '; includeSubDomains'
  }

  let xframe = options.xframe;
  if (xframe == null) xframe = true;
  if (xframe === true) xframe = 'DENY';
  if (xframe === 'same') xframe = 'SAMEORIGIN';

  let xss = options.xssProtection;
  if (xss == null) xss = true;
  if (xss === true) xss = '1; mode=block';

  let nosniff = options.nosniff;
  if (nosniff != null) nosniff = true;

  return function* headers(next) {
    this.response.set('X-Powered-By', 'leafjs, koa');
    if (hsts) this.response.set('Strict-Transport-Security', hsts);
    if (nosniff) this.response.set('X-Content-Type-Options', 'nosniff');

    yield* next;

    let type = this.response.type;
    if (type && ~type.indexOf('text/html')) {
      if (xframe) this.response.set('X-Frame-Options', xframe);
      if (xss) this.response.set('X-XSS-Protection', xss);
    }
  }
};
