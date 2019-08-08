// Packages
import { expect } from 'chai'
import 'mocha'
import WebSocket = require('ws')

// Testing
import { TwitchSpoofer } from './TwitchSpoofer'

describe('TwitchSpoofer class', () => {
	let ts: TwitchSpoofer

	describe('start() method', () => {
		beforeEach(() => {
			ts = new TwitchSpoofer('all')
		})

		afterEach((done) => {
			ts.stop()
			done()
		})

		it('should start a websocket server on port 8080', (done) => {
			ts.start()
			const ws = new WebSocket('http://localhost:8080')
			ws.on('open', () => {
				expect(ws.readyState).to.equal(WebSocket.OPEN)
				ws.close()
				done()
			})
		})

		it('should only start once', () => {
			ts.start()
			expect(() => { ts.start() }).to.not.throw()
		})
	})

	describe('stop() method', () => {
		beforeEach(() => {
			ts = new TwitchSpoofer('all')
		})

		it('should do nothing if not started', () => {
			expect(() => { ts.stop() }).to.not.throw()
		})

		it('should close the server', (done) => {
			ts.start()
			const ws = new WebSocket('http://localhost:8080')

			ws.on('open', () => {
				ts.stop()
			})
			ws.on('close', (code) => {
				expect(code).to.be.equal(1006)
				done()
			})
		})
	})

	describe('isRunning() method', () => {
		// to be implemented
	})

	describe('handleMessage() method', () => {
		// to be implemented
	})

	describe('generateResponse() method', () => {
		// to be implemented
	})

	describe('handleMessage() method', () => {
		// to be implemented
	})

	describe('handleMessage() method', () => {
		// to be implemented
	})

	describe('handleMessage() method', () => {
		// to be implemented
	})

	describe('handleMessage() method', () => {
		// to be implemented
	})
})
