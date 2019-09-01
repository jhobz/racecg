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

		it('should fail if an event isn\'t supported', () => {
			const create = () => {
				ts = new TwitchSpoofer(['some-event'] as any[])
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
			})
			ws.on('close', () => {
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
			})
			ws.on('close', () => {
				done()
			})
		})

		it('should only start once', () => {
			ts.start()
			expect(() => { ts.start() }).to.not.throw()
		})

		// TODO: To be implemented
		// TODO: Include disconnect reason with these responses as they aren't obvious
		it('should disconnect clients that don\'t subscribe to a topic within 15 seconds')
		it('should disconnect clients that don\'t send a PING request every 5 minutes')
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
				expect(code).to.equal(1006)
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

		describe('nonce behavior', () => {
			it('should never include a nonce for PING requests', (done) => {
				let messageCount = 0
				const testCases = [
					{
						type: 'PING',
					},
					{
						nonce: 'asdf',
						type: 'PING',
					},
				]

				testCases.forEach((testCase) => {
					ws.send(JSON.stringify(testCase))
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.not.have.ownProperty('nonce')

					if (++messageCount >= testCases.length) {
						done()
					}
				})
			})

			it('should include an empty nonce for other types of requests if none is provided', (done) => {
				let messageCount = 0
				const testCases = [
					{ type: 'LISTEN' },
					{ type: 'UNLISTEN' },
				]

				testCases.forEach((testCase) => {
					ws.send(JSON.stringify(testCase))
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('nonce').that.equals('')

					if (++messageCount >= testCases.length) {
						done()
					}
				})
			})

			it('should include a nonce for other types of requests if provided', (done) => {
				let messageCount = 0
				const testCases = [
					{
						nonce: 'listen-nonce',
						type: 'LISTEN',
					},
					{
						nonce: 'unlisten-nonce',
						type: 'UNLISTEN',
					},
				]

				testCases.forEach((testCase) => {
					ws.send(JSON.stringify(testCase))
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals(`${data.error ? '' : 'un'}listen-nonce`)

					if (++messageCount >= testCases.length) {
						done()
					}
				})
			})
		})

		describe('PING requests', () => {
			it('should repond with PONG', (done) => {
				ws.send(JSON.stringify({ type: 'PING' }))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(Object.keys(data)).to.have.length(1)
					expect(data).to.have.ownProperty('type').that.equals('PONG')
					done()
				})
			})

			it('should allow (and ignore) extra properties', (done) => {
				ws.send(JSON.stringify({
					someProperty: 'value',
					type: 'PING',
				}))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(Object.keys(data)).to.have.length(1)
					expect(data).to.have.ownProperty('type').that.equals('PONG')
					expect(data).to.not.have.ownProperty('someProperty')
					done()
				})
			})
		})

		describe('LISTEN requests', () => {
			it('should respond to LISTEN messages with RESPONSE', (done) => {
				ws.send(JSON.stringify({ type: 'LISTEN' }))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					// We'll test this error later, for now just make sure it exists
					expect(data).to.have.ownProperty('error').that.does.not.equal('')
					done()
				})
			})

			it('should subscribe clients to provided topics', (done) => {
				let messageCount = 0
				const testCases: any[] = [
					{ // One topic
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'LISTEN',
					},
					{ // Two different topics, same channel id
						data: { topics: ['channel-bits-events-v2.1234', 'channel-subscribe-events-v1.1234'] },
						type: 'LISTEN',
					},
					// NOTE: This would fail on ERR_BADAUTH on the live PubSub server.
					// Since TwitchSpoofer completely ignores authorization, it makes
					// sense to allow this behavior, rather than check against it.
					// I may change my mind about this in the future.
					{ // Two topics of same type, different channel id
						data: { topics: ['channel-bits-events-v2.12345', 'channel-bits-events-v2.123456'] },
						type: 'LISTEN',
					},
				]

				testCases.forEach((testCase) => {
					ws.send(JSON.stringify(testCase))
				})
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('')

					if (++messageCount >= testCases.length) {
						done()
					}
				})
			})

			it('should allow more than one client to subscribe to the same topic', (done) => {
				let messageCount = 0
				const testCases: any[] = [
					{ // One topic
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'LISTEN',
					},
					{ // Multiple topics
						data: { topics: ['channel-bits-events-v2.1234', 'channel-subscribe-events-v1.1234'] },
						type: 'LISTEN',
					},
				]

				const ws2 = new WebSocket('http://localhost:8080')
				ws2.on('open', () => {
					testCases.forEach((testCase) => {
						ws.send(JSON.stringify(testCase))
						ws2.send(JSON.stringify(testCase))
					})

					const onMessage = (response: string) => {
						const data = JSON.parse(response)
						expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
						expect(data).to.have.ownProperty('nonce').that.equals('')
						expect(data).to.have.ownProperty('error').that.equals('')

						if (++messageCount >= testCases.length * 2) {
							ws2.close()
						}
					}

					ws.on('message', onMessage)
					ws2.on('message', onMessage)
				})
				ws2.on('close', () => {
					done()
				})
			})

			// Twitch fails gracefully here, so we do too
			it('should allow clients to subscribe to the same topic twice', (done) => {
				let messageCount = 0
				const listenMessage = {
					data: { topics: ['channel-bits-events-v2.123'] },
					type: 'LISTEN',
				}
				ws.send(JSON.stringify(listenMessage))

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('')

					if (++messageCount >= 2) {
						done()
					} else {
						ws.send(JSON.stringify(listenMessage))
					}
				})
			})

			// The PubSub documentation suggests that this should respond with
			// ERR_BADMESSAGE or ERR_BADTOPIC. However, the server actually responds
			// with "unexpected http status 400".
			it('should require at least one topic', (done) => {
				let messageCount = 0
				const badData: any[] = [
					{ // No data
						type: 'LISTEN',
					},
					{ // No topics
						data: {},
						type: 'LISTEN',
					},
					{ // Empty topics array
						data: { topics: [] },
						type: 'LISTEN',
					},
				]

				badData.forEach((data) => {
					ws.send(JSON.stringify(data))
				})
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('unexpected http status 400')

					if (++messageCount >= badData.length) {
						done()
					}
				})
			})

			// The PubSub documentation suggests that this should respond with
			// ERR_BADTOPIC. However, the server actually responds with "Invalid Topic".
			it('should require a channel id', (done) => {
				let messageCount = 0
				const badData: any[] = [
					{ // No channel, no dot
						data: { topics: ['channel-bits-events-v2'] },
						type: 'LISTEN',
					},
					{ // No channel, with dot
						data: { topics: ['channel-bits-events-v2.'] },
						type: 'LISTEN',
					},
					{ // Multiple topics, one with no channel
						data: { topics: ['channel-bits-events-v2', 'channel-bits-events-v2.123'] },
						type: 'LISTEN',
					},
				]

				badData.forEach((data) => {
					ws.send(JSON.stringify(data))
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('Invalid Topic')

					if (++messageCount >= badData.length) {
						done()
					}
				})
			})

			// The PubSub documentation suggests that this should respond with
			// ERR_BADTOPIC. However, the server actually responds with "Invalid Topic".
			it('should fail when trying to subscribe to an unsupported topic', (done) => {
				let messageCount = 0
				const badData: any[] = [
					{ // Typo
						data: { topics: ['channel-bit-events-v2.123'] },
						type: 'LISTEN',
					},
					{ // Invalid version number
						data: { topics: ['channel-bits-events-v3.123'] },
						type: 'LISTEN',
					},
					{ // Bad topic with good topic
						data: { topics: ['bad-topic-v1.123', 'channel-bits-events-v2.123'] },
						type: 'LISTEN',
					},
				]

				badData.forEach((data) => {
					ws.send(JSON.stringify(data))
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('Invalid Topic')

					if (++messageCount >= badData.length) {
						done()
					}
				})
			})
		})

		describe('UNLISTEN requests', () => {
			it('should respond to UNLISTEN messages with RESPONSE', (done) => {
				ws.send(JSON.stringify({ type: 'UNLISTEN' }))
				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('')
					done()
				})
			})

			// TODO: Because UNLISTEN requests fail gracefully, there's not actually
			// a good way to know whether this failed or not without waiting on the
			// server to emit an event. This test should be updated when TwitchSpoofer
			// provides manual trigerring of events.
			it('should unsubscribe clients from provided topics', (done) => {
				const nonce = 'listen'
				const topicData = { topics: ['channel-bits-events-v2.123'] }
				ws.send(JSON.stringify({
					data: topicData,
					nonce,
					type: 'LISTEN',
				}))

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)

					if (data.nonce === 'listen') {
						ws.send(JSON.stringify({
							data: topicData,
							type: 'UNLISTEN',
						}))
					} else {
						expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
						expect(data).to.have.ownProperty('nonce').that.equals('')
						expect(data).to.have.ownProperty('error').that.equals('')
						done()
					}
				})
			})

			// This is how the live PubSub handles bad UNLISTEN requests
			it('should fail gracefully', (done) => {
				const ws2 = new WebSocket('http://localhost:8080')
				const badData: any[] = [
					{ // Empty topics array
						data: { topics: [] },
						type: 'UNLISTEN',
					},
					{ // Unsupported topic
						data: { topics: ['not-a-real-topic.123'] },
						type: 'UNLISTEN',
					},
					{ // Topic to which no client is subscribed
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'UNLISTEN',
					},
					{ // Topic to which a client is subscribed, but not this client
						data: { topics: ['channel-subscribe-events-v1.123'] },
						type: 'UNLISTEN',
					},
					{ // Multiple topics, some good, some bad
						data: { topics: ['channel-bits-events-v2.123', 'bad-topic'] },
						type: 'UNLISTEN',
					},
				]
				let messageCount = 0

				ws2.on('open', () => {
					ws2.send(JSON.stringify({
						data: { topics: ['channel-subscribe-events-v1.123'] },
						type: 'LISTEN',
					}))
				})
				ws2.on('close', () => {
					done()
				})
				ws2.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('error').that.equals('')

					badData.forEach((badItem) => {
						ws.send(JSON.stringify(badItem))
					})
				})

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('')

					if (++messageCount >= badData.length) {
						ws2.close()
					}
				})
			})
		})

		describe('Invalid requests', () => {
			// The PubSub documentation suggests that this should respond with
			// ERR_BADMESSAGE. However, the server actually does not respond.
			// TwitchSpoofer responds in order to provide better feedback.
			it('should not respond to invalid request types', (done) => {
				ws.send(JSON.stringify({
					data: { topics: ['channel-bits-events.123'] },
					type: 'LSITEN', // Intentional typo
				}))

				ws.on('message', (response: string) => {
					const data = JSON.parse(response)
					expect(data).to.have.ownProperty('type').that.equals('RESPONSE')
					expect(data).to.have.ownProperty('nonce').that.equals('')
					expect(data).to.have.ownProperty('error').that.equals('ERR_BADMESSAGE: Twitch would not have sent this response')
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
					data: { topics: ['channel-bits-events-v2.123'] },
					type: 'LISTEN',
				}))
			})

			ws.on('message', (response: string) => {
				const data = JSON.parse(response)

				if (data.type === 'MESSAGE') {
					// It is impossible to know the EXACT time it will take the code to execute,
					// so just check that it's reasonably lower than the default
					expect(Date.now() - startTime).to.be.lessThan(500)
					ws.close()
				}
			})

			ws.on('close', () => {
				done()
			})
		})

		it('should send messages to all clients subscribed to a topic', (done) => {
			ts = new TwitchSpoofer('all', 5) // 1ms is too fast, 5ms seems ok
			const ws = new WebSocket('http://localhost:8080')
			const ws2 = new WebSocket('http://localhost:8080')
			ts.start()

			let bitsUsed: number
			let closeCount = 0

			const onOpen = function() {
				this.send(JSON.stringify({
					data: { topics: ['channel-bits-events-v2.123'] },
					type: 'LISTEN',
				}))
			}

			const onMessage = function(response: string) {
				const data = JSON.parse(response)

				if (data.type === 'MESSAGE') {
					const res = JSON.parse(response)
					expect(res).to.have.ownProperty('data').that.is.an('object')
					expect(Object.keys(res.data)).to.have.length(2)
					expect(res.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
					expect(res.data).to.have.ownProperty('message').that.is.a('string')

					const message = JSON.parse(res.data.message)
					expect(message).to.have.ownProperty('data').that.is.an('object')
					expect(message.data).to.have.ownProperty('bits_used').that.is.a('number')

					// Compare the value of message.data.bits_used across both clients
					if (bitsUsed) {
						expect(message.data.bits_used).to.equal(bitsUsed)
					} else {
						bitsUsed = message.data.bits_used
					}

					this.close()
				}
			}

			const onClose = () => {
				if (++closeCount >= 2) {
					done()
				}
			}

			ws.on('open', onOpen.bind(ws))
			ws2.on('open', onOpen.bind(ws2))
			ws.on('message', onMessage.bind(ws))
			ws2.on('message', onMessage.bind(ws2))
			ws.on('close', onClose)
			ws2.on('close', onClose)
		})

		describe('bits events', () => {
			it('should emit bits v2 events', (done) => {
				ts = new TwitchSpoofer(['bits'], 1)
				const ws = new WebSocket('http://localhost:8080')
				ts.start()

				ws.on('open', () => {
					ws.send(JSON.stringify({
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'LISTEN',
					}))
				})
				ws.on('close', () => {
					done()
				})

				ws.on('message', (response: string) => {
					const res = JSON.parse(response)
					if (res.type === 'MESSAGE') {
						expect(res).to.have.ownProperty('data').that.is.an('object')
						expect(Object.keys(res.data)).to.have.length(2)
						expect(res.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
						expect(res.data).to.have.ownProperty('message').that.is.a('string')

						const message = JSON.parse(res.data.message)
						expect(message).to.have.ownProperty('data').that.is.an('object')
						expect(message).to.have.ownProperty('is_anonymous').that.is.null
						expect(message).to.have.ownProperty('message_id').that.is.a('string')
						expect(message).to.have.ownProperty('message_type').that.equals('bits_event')
						expect(message).to.have.ownProperty('version').that.equals('1.0')

						const msgData = message.data
						expect(msgData).to.have.ownProperty('badge_entitlement').that.is.null
						expect(msgData).to.have.ownProperty('bits_used').that.is.a('number')
						expect(msgData).to.have.ownProperty('channel_id').that.equals('123')
						expect(msgData).to.have.ownProperty('channel_name').that.is.a('string')
						expect(msgData).to.have.ownProperty('chat_message').that.is.a('string')
						expect(msgData).to.have.ownProperty('context').that.equals('cheer')
						expect(msgData).to.have.ownProperty('time').that.is.a('string')
						expect(msgData).to.have.ownProperty('total_bits_used').that.is.a('number')
						expect(msgData).to.have.ownProperty('user_id').that.is.a('string')
						expect(msgData).to.have.ownProperty('user_name').that.is.a('string')

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
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'LISTEN',
					}))
				})
				ws.on('close', () => {
					done()
				})

				ws.on('message', (response: string) => {
					const res = JSON.parse(response)
					if (res.type === 'MESSAGE') {
						expect(res).to.have.ownProperty('data').that.is.an('object')
						expect(Object.keys(res.data)).to.have.length(2)
						expect(res.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
						expect(res.data).to.have.ownProperty('message').that.is.a('string')

						const message = JSON.parse(res.data.message)
						expect(message).to.have.ownProperty('is_anonymous').that.is.true

						ws.close()
					}
				})
			})

			it('should include badge entitlement in the response', (done) => {
				ts = new TwitchSpoofer(['bits_entitled'], 1)
				const ws = new WebSocket('http://localhost:8080')
				ts.start()

				ws.on('open', () => {
					ws.send(JSON.stringify({
						data: { topics: ['channel-bits-events-v2.123'] },
						type: 'LISTEN',
					}))
				})
				ws.on('close', () => {
					done()
				})

				ws.on('message', (response: string) => {
					const res = JSON.parse(response)
					if (res.type === 'MESSAGE') {
						expect(res).to.have.ownProperty('data').that.is.an('object')
						expect(Object.keys(res.data)).to.have.length(2)
						expect(res.data).to.have.ownProperty('topic', 'channel-bits-events-v2.123')
						expect(res.data).to.have.ownProperty('message').that.is.a('string')

						const message = JSON.parse(res.data.message)
						expect(message).to.have.ownProperty('data').that.is.an('object')
						expect(message.data).to.have.ownProperty('badge_entitlement').that.is.an('object')
						expect(message.data.badge_entitlement).to.have.ownProperty('new_version').that.is.a('number')
						expect(message.data.badge_entitlement).to.have.ownProperty('previous_version').that.is.a('number')

						ws.close()
					}
				})
			})

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
