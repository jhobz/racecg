// TODO: Switch this to the package once PR is merged, or to
//       my fork if merge takes too long
import TwitchPS = require('twitchps')
import {NodeCG} from '../../types/nodecg'
import {TwitchChannel} from '../../types/twitch'
import {TwitchSpoofer} from './TwitchSpoofer'

module.exports = (nodecg: NodeCG) => {
	const initTopics: object[] = []
	const twitchR: any = nodecg.Replicant('twitchState')

	// initialize twitchR first time
	if (!twitchR.value) {
		twitchR.value = {
			totals: {
				bits: 0,
				subs: 0,
			},
		}
	}

	twitchR.value.channels = []
	twitchR.value.topics = []

	nodecg.bundleConfig.twitch.channels.forEach((channel: TwitchChannel) => {
		twitchR.value.channels.push(channel.channel_name)

		channel.scopes.forEach((scope: string) => {
			let topic: string
			switch (scope) {
				case 'channel_subscriptions':
					topic = 'channel-subscribe-events-v1'
					break
				case 'bits:read':
					topic = 'channel-bits-events-v2'
					break
			}

			initTopics.push({
				token: channel.token,
				topic: `${topic}.${channel.channel_id}`,
			})
			twitchR.value.topics.push(topic)
		})
	})

	const spoofer = new TwitchSpoofer('all')
	let useSpoofer: boolean

	const opts = {
		debug: true, // TODO: Replace with debug option
		init_topics: initTopics,
		reconnect: true, // TODO: Replace with reconnect option
		url: 'wss://pubsub-edge.twitch.tv',
	}

	twitchR.isConnected = false
	twitchR.url = opts.url

	// TODO: Actually make this change what TwitchPS is pointing at while running
	// TODO: Strongly type this replicant
	twitchR.on('change', (newValue: any, oldValue: any) => {
		useSpoofer = newValue.isSpoofing
	})

	if (useSpoofer) {
		opts.url = 'ws://localhost:8080'
		spoofer.start()
	}

	const pubsub = new TwitchPS(opts)

	pubsub.on('connected', () => {
		nodecg.log.info('PubSub: connected')
		twitchR.value.isConnected = true
		twitchR.value.url = opts.url
	})

	pubsub.on('disconnected', () => {
		nodecg.log.info('PubSub: disconnected')
		twitchR.value.isConnected = false
	})

	pubsub.on('reconnect', () => {
		nodecg.log.info('PubSub: reconnecting...')
	})

	pubsub.on('bits', (cheer: any) => {
		twitchR.value.totals.bits += cheer.bits_used
		nodecg.sendMessage('cheer', cheer)
	})

	pubsub.on('subscribe', (subscription: any) => {
		nodecg.sendMessage('subscription', subscription)
	})

	nodecg.listenFor('twitch.resetSession', () => {
		twitchR.value.totals = {
			bits: 0,
			subs: 0,
		}
	})
}
