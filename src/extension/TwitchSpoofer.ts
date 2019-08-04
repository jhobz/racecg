import {Server as MockServer} from 'ws'

type TwitchEvent = 'subscription'|'resubscription'|'subscription_gift'|'bits'|'bits_anon'

const SUPPORTED_EVENTS: TwitchEvent[] = [
	'bits',
	'bits_anon',
	// 'subscription',
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
	private emitter: NodeJS.Timeout
	private topicSubscriptions: TopicClientsMap = {}

	constructor(eventsToSpoof: TwitchEvent[]|'all', frequency: number = 10000) {
		if (!eventsToSpoof) {
			throw new Error('You must define some events to spoof!')
		}

		if (eventsToSpoof === 'all') {
			this.events = SUPPORTED_EVENTS
		} else {
			this.events = eventsToSpoof
		}

		this.frequency = frequency
	}

	public start() {
		this.wss = new MockServer({ port: 8080 })
		const self = this
		this.wss.on('connection', (socket) => {
			socket.on('message', (message) => {
				self.handleMessage(message, socket)
			})
		})

		this.emitter = this.startEmitter(this.events, this.frequency)
	}

	public stop() {
		this.stopEmitter(this.emitter)
		delete this.emitter
	}

	public isRunning() {
		return !!this.emitter
	}

	private handleMessage(msg: any, socket: any) {
		const message = JSON.parse(msg)
		const type = message.type

		if (type === 'LISTEN') {
			message.data.topics.forEach((topic: string) => {
				const topicSubscribers = this.topicSubscriptions[topic]

				if (topicSubscribers) {
					topicSubscribers.push(socket)
				} else {
					this.topicSubscriptions[topic] = [socket]
				}

			})
		} else if (type === 'UNLISTEN') {
			message.data.topics.forEach((topic: string) => {
				const topicSubscribers = this.topicSubscriptions[topic]
				const index = topicSubscribers.indexOf(socket)

				if (index > -1) {
					topicSubscribers.splice(index, 1)
				}
			})
		}

		socket.send(this.generateResponse(type, message.nonce))
	}

	private generateResponse(type: string, nonce: string) {
		const response: TwitchResponse = {
			nonce,
			type: 'RESPONSE',
		}

		if (type === 'PING') {
			response.type = 'PONG'
			delete response.nonce
		} else if (type === 'LISTEN' || type === 'UNLISTEN') {
			// TODO: Check against valid topics, add ERROR_BADTOPIC if invalid
			response.error = ''
		} else {
			response.error = 'ERROR_BADMESSAGE'
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
			case 'bits_anon':
				message = this.generateBitMessage(type, channelId)
				break
			case 'resubscription':
			case 'subscription':
			case 'subscription_gift':
				message = this.generateSubMessage(type, channelId)
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

	private generateBitMessage(type: 'bits'|'bits_anon', channelId: string) {
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
			is_anonymous: type === 'bits_anon' ? true : null,
			message_id: '8145728a4-35f0-4cf7-9dc0-f2ef24de1eb6', // TODO: Actually update this
			message_type: 'bits_event',
			version: '1.0',
		}

		// Randomly decide whether the cheer entitled a new badge or not
		if (Math.random() < 0.1) {
			// TODO: Make it randomly select from all possible badge values
			message.data.badge_entitlement = {
				new_version: 25000,
				previous_version: 10000,
			}
		}

		return message
	}

	private generateSubMessage(type: 'resubscription'|'subscription'|'subscription_gift', channelId: string) {
		return ''
	}
}
