const { registerPreprocessor } = require('@riotjs/compiler')
const ts = require('typescript')

registerPreprocessor('javascript', 'ts', (code, { options }) => {
	const { file } = options

	const result = ts.transpileModule(code, {
		fileName: file,
		compilerOptions: {
			module: ts.ModuleKind.ESNext
		}
	})

	return {
		code: result.outputText,
		map: null
	}
})
