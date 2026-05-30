.PHONY: compatibility-matrix-verify compatibility-pins-verify ecosystem-pins-verify compatibility-tuple-verify

compatibility-matrix-verify:
	npm run compatibility-matrix-verify

compatibility-pins-verify:
	npm run compatibility-pins-verify

ecosystem-pins-verify:
	npm run ecosystem-pins-verify

compatibility-tuple-verify: ecosystem-pins-verify
