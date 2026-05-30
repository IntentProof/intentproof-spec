.PHONY: compatibility-matrix-verify compatibility-pins-verify compatibility-tuple-verify

compatibility-matrix-verify:
	npm run compatibility-matrix-verify

compatibility-pins-verify:
	npm run compatibility-pins-verify

compatibility-tuple-verify: compatibility-pins-verify
