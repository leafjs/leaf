all: test
test:
	@DEBUG=leaf*,koa* ./node_modules/.bin/babel-node ./node_modules/.bin/babel-istanbul cover ./node_modules/.bin/_mocha -- --reporter dot test

.PHONY: test
