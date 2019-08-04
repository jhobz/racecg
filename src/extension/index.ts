// TODO: Switch this to the package once PR is merged, or to
//       my fork if merge takes too long
import TwitchPS = require('twitchps')
import {NodeCG} from '../../types/nodecg'
import {TwitchChannel} from '../../types/twitch'
import {TwitchSpoofer} from './TwitchSpoofer'

module.exports = (nodecg: NodeCG) => {
	const initTopics: object[] = []
	const twitchR: any = nodecg.Replicant('twitch.state')

	// Reset the list of authorized channels (we're about to read it)
	twitchR.value.authorizedChannels = []

	nodecg.bundleConfig.twitch.channels.forEach((channel: TwitchChannel) => {
		const channelData: any = {
			authorizedTopics: [],
			enabledTopics: [],
			id: channel.channel_id,
			name: channel.channel_name,
			sessionTotals: {
				bits: 0,
				commerce: 0,
				subs: 0,
				whispers: 0,
			},
		}

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

			// TODO: Get rid of initTopics; add all topics dynamically
			initTopics.push({
				token: channel.token,
				topic: `${topic}.${channel.channel_id}`,
			})

			channelData.authorizedTopics.push(topic)
			// TODO: Read this from the replicant and add topics
			channelData.enabledTopics.push(topic)
		})

		twitchR.value.authorizedChannels.push(channelData)
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
		// TODO: Subscribe and unsubscribe from topics based on enabledTopics
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
		const channel = twitchR.value.authorizedChannels.find((c: any) => c.id === cheer.channel_id)

		channel.sessionTotals.bits += cheer.bits_used
		twitchR.value.sessionSums.bits += cheer.bits_used

		nodecg.sendMessage('cheer', cheer)
	})

	pubsub.on('subscribe', (subscription: any) => {
		nodecg.sendMessage('subscription', subscription)
	})

	nodecg.listenFor('twitch.resetSession', () => {
		twitchR.value.authorizedChannels.forEach((channel: any) => {
			channel.sessionTotals = {
				bits: 0,
				commerce: 0,
				subs: 0,
				whispers: 0,
			}
		})
		twitchR.value.sessionSums = {
			bits: 0,
			commerce: 0,
			subs: 0,
			whispers: 0,
		}
	})
}
