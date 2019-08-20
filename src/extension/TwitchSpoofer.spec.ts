// Packages
import { expect } from 'chai'
import 'mocha'
import WebSocket = require('ws')

// Testing
import { TwitchSpoofer } from './TwitchSpoofer'

// Disable some tslint rules due to testing syntax
/* tslint:disable:no-unused-expression */

describe('TwitchSpoofer class', () => {
	let ts: TwitchSpoofer

	describe('constructor', () => {
		it('should require some events', () => {
			const create = () => {
				ts = new TwitchSpoofer(undefined)
			}
			expect(create).to.throw(Error, 'must define some events')
		})

		it('should error if an event isn\'t supported', () => {
			const create = () => {
				ts = new TwitchSpoofer(['subscription'])
			}
			expect(create).to.throw(Error, 'unsupported')
		})
	})

	describe('start()', () => {
		beforeEach(() => {
			ts = new TwitchSpoofer('all')
		})

		afterEach(() => {
			ts.stop()
		})

		it('should start a websocket server on port 8080 by default', (done) => {
			ts.start()
			const ws = new WebSocket('http://localhost:8080')
			ws.on('open', () => {
				expect(ws.readyState).to.equal(WebSocket.OPEN)
				ws.close()
				done()
			})
		})

		it('should allow you to set the port', (done) => {
			ts = new TwitchSpoofer('all', 1000, 8081)
			ts.start()
			const ws = new WebSocket('http://localhost:8081')
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

		// TODO: To be implemented
		it('should disconnect clients that don\'t subscribe to a topic within 15 seconds')
	})

	describe('stop()', () => {
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

	describe('isRunning()', () => {
		beforeEach(() => {
			ts = new TwitchSpoofer('all')
		})

		afterEach(() => {
			ts.stop()
		})

		it('should return true if the service is running', () => {
			ts.start()
			expect(ts.isRunning()).to.be.true
		})

		it('should return false if the service is not running', () => {
			expect(ts.isRunning()).to.be.false
			ts.start()
			ts.stop()
			expect(ts.isRunning()).to.be.false
		})
	})

	describe('handling messages', () => {
		let ws: WebSocket

		beforeEach((done) => {
			ts = new TwitchSpoofer('all')
			ts.start()
			ws = new WebSocket('http://localhost:8080')
			ws.on('open', () => {
				done()
			})
		})

		afterEach((done) => {
			ts.stop()
			ws.on('close', () => {
				done()
			})
		})

		describe('PING requests', () => {
			it('should repond with PONG', (done) => {
				ws.send(JSON.stringify({ type: 'PING' }))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(Object.keys(data)).to.have.length(1)
					expect(data).to.haveOwnProperty('type').that.equals('PONG')
					done()
				})
			})

			it('should allow extra properties', (done) => {
				ws.send(JSON.stringify({
					nonce: Math.random().toString(),
					type: 'PING',
				}))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(Object.keys(data)).to.have.length(1)
					expect(data).to.haveOwnProperty('type').that.equals('PONG')
					done()
				})
			})
		})

		describe('LISTEN requests', () => {
			it('should respond to LISTEN messages with RESPONSE', (done) => {
				const nonce = Math.random().toString()

				ws.send(JSON.stringify({
					data: {
						auth_token: 'example_token',
						topics: [],
					},
					nonce,
					type: 'LISTEN',
				}))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.haveOwnProperty('type').that.equals('RESPONSE')
					expect(data).to.haveOwnProperty('nonce').that.equals(nonce)
					expect(data).to.haveOwnProperty('error').that.equals('')
					done()
				})
			})

			it('should subscribe clients to provided topics')
			// TODO: Check EXACTLY how Twitch handles this
			it('should include an error message upon trying to subscribe to an unsupported topic')
		})

		describe('UNLISTEN requests', () => {
			it('should respond to UNLISTEN messages with RESPONSE', (done) => {
				const nonce = Math.random().toString()

				ws.send(JSON.stringify({
					data: {
						auth_token: 'example_token',
						topics: [],
					},
					nonce,
					type: 'UNLISTEN',
				}))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.haveOwnProperty('type').that.equals('RESPONSE')
					expect(data).to.haveOwnProperty('nonce').that.equals(nonce)
					expect(data).to.haveOwnProperty('error').that.equals('')
					done()
				})
			})

			it('should unsubscribe clients from provided topics')
			// TODO: Check EXACTLY how Twitch handles this
			// ???: If twitch returns nothing, should it fail gracefully, warn, or throw?
			it('should include an error message upon trying to unsubscribe from a topic not subscribed to')
			// TODO: Check EXACTLY how Twitch handles this
			it('should include an error message upon trying to unsubscribe from an unsupported topic')
		})

		describe('Invalid requests', () => {
			it('should respond to invalid requests with ERR_BADMESSAGE', (done) => {
				const nonce = Math.random().toString()

				ws.send(JSON.stringify({
					data: {
						auth_token: 'example_token',
						topics: [],
					},
					nonce,
					type: 'LSITEN',
				}))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.haveOwnProperty('type').that.equals('RESPONSE')
					expect(data).to.haveOwnProperty('nonce').that.equals(nonce)
					expect(data).to.haveOwnProperty('error').that.equals('ERR_BADMESSAGE')
					done()
				})
			})
		})
	})

	// Receiving messages
	describe('emitting events', () => {
		afterEach(() => {
			ts.stop()
		})

		it('should allow you to set the message frequency', (done) => {
			ts = new TwitchSpoofer('all', 1)
			const ws = new WebSocket('http://localhost:8080')
			const startTime = Date.now()
			ts.start()

			ws.on('open', () => {
				ws.send(JSON.stringify({
					data: {
						auth_token: 'someToken',
						topics: ['channel-bits-events-v2.123'],
					},
					type: 'LISTEN',
				}))
			})

			ws.on('message', (response: string) => {
				const data = JSON.parse(response)

				if (data.type === 'MESSAGE') {
					// It is impossible to know the EXACT time it will take the code to execute,
					// so just check that it's not the default
					expect(Date.now() - startTime).to.be.lessThan(500)

					// Stop listening to messages so done() isn't called twice
					ws.close()

					done()
				}
			})
		})

		it('should require a channel id')
		it('should allow more than one client to subscribe to the same topic')

		describe('bits events', () => {
			// NOT YET IMPLEMENTED - up for debate...
			it('should emit bits v1 events')

			it('should emit bits v2 events', (done) => {
				ts = new TwitchSpoofer(['bits'], 1)
				const ws = new WebSocket('http://localhost:8080')
				ts.start()

				ws.on('open', () => {
					ws.send(JSON.stringify({
						data: {
							auth_token: 'someToken',
							topics: ['channel-bits-events-v2.123'],
						},
						type: 'LISTEN',
					}))
				})
				ws.on('close', () => {
					done()
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					if (data.type === 'MESSAGE') {
						expect(data.data).to.exist
						expect(Object.keys(data.data)).to.have.length(2)
						expect(data.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
						expect(data.data).to.have.ownProperty('message').that.is.a('string')

						// TODO: Validate message against a schema
						const message = JSON.parse(data.data.message)

						ws.close()
					}
				})
			})

			it('should emit anonymous cheer (bits) events', (done) => {
				ts = new TwitchSpoofer(['bits_anon'], 1)
				const ws = new WebSocket('http://localhost:8080')
				ts.start()

				ws.on('open', () => {
					ws.send(JSON.stringify({
						data: {
							auth_token: 'someToken',
							topics: ['channel-bits-events-v2.123'],
						},
						type: 'LISTEN',
					}))
				})
				ws.on('close', () => {
					done()
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					if (data.type === 'MESSAGE') {
						expect(data.data).to.exist
						expect(Object.keys(data.data)).to.have.length(2)
						expect(data.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
						expect(data.data).to.have.ownProperty('message').that.is.a('string')

						// TODO: Validate message against a schema
						const message = JSON.parse(data.data.message)
						expect(message).to.have.ownProperty('is_anonymous').that.equals(true)

						ws.close()
					}
				})
			})

			it('should occasionally include badge entitlement in the response')

			// NOT YET IMPLEMENTED
			it('should emit bit badge notification events')
		})

		// NOT YET IMPLEMENTED
		describe('subscription events', () => {
			it('should emit subscription events')
			it('should emit resubscription events')
			it('should emit gift subscription events')
		})

		// NOT YET IMPLEMENTED
		describe('commerce events', () => {
			it('should emit commerce events')
		})

		// NOT YET IMPLEMENTED
		describe('whisper events', () => {
			it('should emit whisper events')
		})
	})
})
