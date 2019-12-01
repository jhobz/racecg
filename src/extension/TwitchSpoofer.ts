import {Server as MockServer} from 'ws'

export type TwitchEvent = 'subscription'|'resubscription'|'subscription_gift'|'bits'|'bits_anon'|'bits_entitled'

const SUPPORTED_EVENTS: TwitchEvent[] = [
	'bits',
	'bits_anon',
	'bits_entitled',
	'subscription',
	// 'subscription_gift',
	// 'resubscription',
]

const SUPPORTED_TOPICS = [
	'channel-bits-events-v2',
	'channel-subscribe-events-v1',
]

const TOPICS_MAP = {
	bits: 'channel-bits-events-v2',
	bits_anon: 'channel-bits-events-v2',
	bits_entitled: 'channel-bits-events-v2',
	resubscription: 'channel-subscribe-events-v1',
	subscription: 'channel-subscribe-events-v1',
	subscription_gift: 'channel-subscribe-events-v1',
}

interface TopicClientsMap {
	[key: string]: WebSocket[]
}

interface TwitchResponse {
	error?: string,
	nonce?: string,
	type: 'RESPONSE' | 'PONG',
}

export class TwitchSpoofer {
	private events: TwitchEvent[]
	private wss: MockServer
	private frequency: number
	private port: number
	private emitter: NodeJS.Timeout
	private topicSubscriptions: TopicClientsMap = {}

	constructor(eventsToSpoof: TwitchEvent[]|'all', frequency: number = 10000, port: number = 8080) {
		if (!eventsToSpoof) {
			throw new Error('You must define some events to spoof!')
		}

		if (eventsToSpoof === 'all') {
			this.events = SUPPORTED_EVENTS
		} else if (eventsToSpoof.find((ev) => !SUPPORTED_EVENTS.includes(ev))) {
			throw new Error('One or more of the events you included is unsupported.\n' +
				`Supported events are: ${SUPPORTED_EVENTS.join(', ')}`)
		} else {
			this.events = eventsToSpoof
		}

		this.frequency = frequency
		this.port = port
	}

	public start() {
		// Server has already started
		if (this.wss || this.emitter) {
			return
		}

		this.wss = new MockServer({ port: this.port })
		const self = this
		this.wss.on('connection', (socket) => {
			socket.on('message', (message) => {
				self.handleMessage(message, socket)
			})
		})

		this.emitter = this.startEmitter(this.events, this.frequency)
	}

	public stop() {
		// Server hasn't been started
		if (!this.wss || !this.emitter) {
			return
		}

		this.stopEmitter(this.emitter)
		delete this.emitter

		const self = this
		this.wss.close(() => {
			delete self.wss
		})
	}

	public isRunning() {
		return !!this.emitter
	}

	private handleMessage(msg: any, socket: any) {
		const message = JSON.parse(msg)
		const type = message.type
		const doTopicsExist = message.data &&
			message.data.topics &&
			Array.isArray(message.data.topics) &&
			message.data.topics.length
		const areTopicsValid = doTopicsExist &&
			message.data.topics.every((topic: string) => {
				const dotIndex = topic.indexOf('.')

				return dotIndex >= 0 &&
					dotIndex < topic.length - 1 &&
					SUPPORTED_TOPICS.includes(topic.substring(0, dotIndex)) &&
					!isNaN(+topic.substring(dotIndex + 1))
		})

		if (type === 'LISTEN') {
			if (!doTopicsExist) {
				socket.send(this.generateResponse(type, message.nonce, 'unexpected http status 400'))
				return
			} else if (!areTopicsValid) {
				socket.send(this.generateResponse(type, message.nonce, 'Invalid Topic'))
				return
			}

			message.data.topics.forEach((topic: string) => {
				const topicSubscribers = this.topicSubscriptions[topic]

				if (topicSubscribers) {
					topicSubscribers.push(socket)
				} else {
					this.topicSubscriptions[topic] = [socket]
				}
			})
		} else if (type === 'UNLISTEN') {
			if (areTopicsValid) {
				message.data.topics.forEach((topic: string) => {
					const topicSubscribers = this.topicSubscriptions[topic]

					if (topicSubscribers) {
						const index = topicSubscribers.indexOf(socket)

						if (index > -1) {
							topicSubscribers.splice(index, 1)
						}
					} // else fail gracefully
				})
			} // else fail gracefully
		} else if (type !== 'PING') {
			// NOTE: Twitch actually doesn't respond to invalid request types
			// We respond here to make things easier to test and provide more feedback
			socket.send(this.generateResponse(type, message.nonce,
				'ERR_BADMESSAGE: Twitch would not have sent this response'))
			return
		}

		socket.send(this.generateResponse(type, message.nonce))
	}

	private generateResponse(type: string, nonce: string, error: string = '') {
		const response: TwitchResponse = {
			nonce: nonce || '',
			type: 'RESPONSE',
		}

		if (type === 'PING') {
			response.type = 'PONG'
			delete response.nonce
		} else {
			response.error = error
		}

		return JSON.stringify(response)
	}

	private startEmitter(types: TwitchEvent[], frequency: number) {
		return setInterval(() => {
			// pick a random event type from the list
			const randomType = types[Math.floor(Math.random() * types.length)]

			// figure out the corresponding topic(s)
			const baseTopic = TOPICS_MAP[randomType]
			const topics = Object.keys(this.topicSubscriptions).filter((v) => v.indexOf(baseTopic) > -1)

			// construct the message and send to all subscribed clients
			topics.forEach((topic) => {
				const message = this.generateRandomMessage(randomType, topic)
				this.topicSubscriptions[topic].forEach((socket: WebSocket) => {
					socket.send(JSON.stringify(message))
				})
			})
		}, frequency)
	}

	private stopEmitter(emitterHandle: NodeJS.Timeout) {
		clearInterval(emitterHandle)
	}

	private generateRandomMessage(type: TwitchEvent, topic: string) {
		const channelId = topic.substring(topic.indexOf('.') + 1)
		let message: any

		switch (type) {
			case 'bits':
				message = this.generateBitMessage(channelId)
				break
			case 'bits_anon':
				message = this.generateBitMessage(channelId, true)
				break
			case 'bits_entitled':
				message = this.generateBitMessage(channelId, false, true)
				break
			// TODO: To be implemented
			// case 'resubscription':
			case 'subscription':
			// case 'subscription_gift':
				message = this.generateSubMessage(channelId)
				break
		}

		return {
			data: {
				message: JSON.stringify(message),
				topic,
			},
			type: 'MESSAGE',
		}
	}

	private generateBitMessage(channelId: string, isAnonymous = false, isEntitled = false) {
		const message: any = {
			data: {
				badge_entitlement: null,
				bits_used: Math.floor(Math.random() * 999999),
				channel_id: channelId,
				channel_name: 'TheLongestNameAllowedIs25'.substr(0, Math.random() * 21 + 4),
				chat_message: ('cheer10000 New badge hype! But what if the message were much, ' +
							  'much longer? I don\'t know what the maximum length for messages ' +
							  'is on Twitch, but I will make this as long as I think is reasonable ' +
							  'to design around. Something like this oughta be ok.').substr(0, Math.random() * 274 + 6),
				context: 'cheer',
				time: Date.now().toString(),
				total_bits_used: Math.floor(Math.random() * 999999),
				user_id: Math.floor(Math.random() * 99999999).toString(),
				user_name: 'ThisPersonCheeredAnAmount'.substr(0, Math.random() * 21 + 4),
			},
			is_anonymous: isAnonymous || null,
			message_id: '8145728a4-35f0-4cf7-9dc0-f2ef24de1eb6', // TODO: Actually update this
			message_type: 'bits_event',
			version: '1.0',
		}

		if (isEntitled) {
			// TODO: Make it randomly select from all possible badge values
			message.data.badge_entitlement = {
				new_version: 25000,
				previous_version: 10000,
			}
		}

		return message
	}

	// TODO: To be implemented
	private generateSubMessage(channelId: string, isGift = false, isResub = false) {
		const message: any = {
			'channel_id': channelId,
			'channel_name': 'TheLongestNameAllowedIs25'.substr(0, Math.random() * 21 + 4),
			'context': 'sub',
			'cumulative-months': Math.floor(Math.random() * 24),
			'display_name': 'DisplayThisName',
			'streak-months': Math.floor(Math.random() * 24),
			'sub_message': {
				emotes: [],
				message: ('Sub, sub sub sub! But what if the message were much, ' +
							'much longer? I don\'t know what the maximum length for messages ' +
							'is on Twitch, but I will make this as long as I think is reasonable ' +
							'to design around. Something like this oughta be ok.').substr(0, Math.random() * 274 + 6),
			},
			'sub_plan': 'Prime',
			'sub_plan_name': 'Channel Subscription (example_channel)',
			'time': Date.now().toString(),
			'user_id': Math.floor(Math.random() * 99999999).toString(),
			'user_name': 'ThisPersonSubscribed'.substr(0, Math.random() * 16 + 4),
			// message_id: '8145728a4-35f0-4cf7-9dc0-f2ef24de1eb6', // TODO: Actually update this
			// message_type: 'bits_event',
			// version: '1.0',
		}

		return message
	}
}
