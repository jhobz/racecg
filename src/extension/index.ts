// TODO: Switch this to the package once PR is merged, or to
//       my fork if merge takes too long
import TwitchPS = require('twitchps')
import {NodeCG} from '../../types/nodecg'
import {TwitchChannel} from '../../types/twitch'
import {TwitchSpoofer} from './TwitchSpoofer'

module.exports = (nodecg: NodeCG) => {
	const initTopics: object[] = []
	const connectionR: any = nodecg.Replicant('twitch.connection')
	const channelsR: any = nodecg.Replicant('twitch.channels')

	// Reset the list of authorized channels (we're about to read it)
	channelsR.value = []

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

			channelData.authorizedTopics.push(topic)
			channelData.enabledTopics.push(topic)
			initTopics.push({
				token: channel.token,
				topic: `${topic}.${channel.channel_id}`,
			})
		})

		channelsR.value.push(channelData)
	})

	const spoofer = new TwitchSpoofer('all', 10000, 8082)
	let useSpoofer: boolean

	const opts = {
		debug: process.env.NODE_ENV !== 'production',
		init_topics: initTopics, // required
		reconnect: true, // TODO: Replace with reconnect option
		url: 'wss://pubsub-edge.twitch.tv',
	}

	connectionR.value.isConnected = false
	connectionR.value.url = opts.url

	// TODO: Actually make this change what TwitchPS is pointing at while running
	// TODO: Strongly type this replicant
	connectionR.on('change', (newValue: any, oldValue: any) => {
		useSpoofer = newValue.isSpoofing
	})

	if (useSpoofer) {
		opts.url = 'ws://localhost:8082'
		spoofer.start()
	}

	const pubsub = new TwitchPS(opts)

	pubsub.on('connected', () => {
		nodecg.log.info('PubSub: connected')
		connectionR.value.isConnected = true
		connectionR.value.url = opts.url
	})

	pubsub.on('disconnected', () => {
		nodecg.log.info('PubSub: disconnected')
		connectionR.value.isConnected = false
	})

	pubsub.on('reconnect', () => {
		nodecg.log.info('PubSub: reconnecting...')
	})

	pubsub.on('bits', (cheer: any) => {
		const channel = channelsR.value.find((c: any) => c.id === cheer.channel_id)

		channel.sessionTotals.bits += cheer.bits_used

		nodecg.sendMessage('cheer', cheer)
	})

	pubsub.on('subscribe', (subscription: any) => {
		const channel = channelsR.value.find((c: any) => c.id === subscription.channel_id)

		// Anonymous gift subs currently generate two subscription events: one with no
		// user name and one with the name "ananonymousgifter". We need to make sure
		// not to include the blank one.
		// TODO: Fix this in TwitchPS library
		if (subscription.user_name) {
			channel.sessionTotals.subs++

			nodecg.sendMessage('subscription', subscription)
		}
	})

	nodecg.listenFor('twitch.resetSession', (startValue: number) => {
		channelsR.value.forEach((channel: any) => {
			channel.sessionTotals = {
				bits: startValue / channelsR.value.length || 0,
				commerce: 0,
				subs: 0,
				whispers: 0,
			}
		})
	})

	// TODO: Track this in a different field called "other" rather than in "commerce"
	nodecg.listenFor('twitch.addToSession', ({ channel, amount }) => {
		channelsR.value.filter((c: any) => c.name === channel).forEach((channel: any) => {
			channel.sessionTotals.commerce += amount
		})
	})

	interface TopicToggleData {
		cid: string,
		topic: string,
		state: boolean
	}

	nodecg.listenFor('twitch.toggleTopic', ({ cid, topic, state }: TopicToggleData) => {
		const channel = channelsR.value.find((c: any) => c.id === cid)

		if (state) {
			pubsub.addTopic([{ topic: `${topic}.${cid}` }])
			channel.enabledTopics.push(topic)
		} else {
			pubsub.removeTopic([{ topic: `${topic}.${cid}` }])
			channel.enabledTopics = channel.enabledTopics.filter((t: string) => t !== topic)
		}
	})
}
