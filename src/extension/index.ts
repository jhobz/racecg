// TODO: Switch this to the package once PR is merged, or to
//       my fork if merge takes too long
import TwitchPS = require('twitchps')
import {NodeCG} from '../../types/nodecg'
import {TwitchChannel} from '../../types/twitch'
import {TwitchSpoofer} from './TwitchSpoofer'

module.exports = (nodecg: NodeCG) => {
	const initTopics: object[] = []
	nodecg.bundleConfig.twitch.channels.forEach((channel: TwitchChannel) => {
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
		})
	})

	const spoofReplicant = nodecg.Replicant('spoofTwitch')
	let useSpoofer: boolean

	// TODO: Actually make this change what TwitchPS is pointing at while running
	spoofReplicant.on('change', (newValue: boolean, oldValue: boolean) => {
		useSpoofer = newValue
	})

	const opts: any = {
		debug: true, // TODO: Replace with debug option
		init_topics: initTopics,
		reconnect: true, // TODO: Replace with reconnect option
	}

	if (useSpoofer) {
		opts.url = 'ws://localhost:8080'
		const spoofer = new TwitchSpoofer('all')
		spoofer.start()
	}

	const pubsub = new TwitchPS(opts)

	pubsub.on('connected', () => {
		nodecg.log.info('PubSub: connected')
	})

	pubsub.on('disconnected', () => {
		nodecg.log.info('PubSub: disconnected')
	})

	pubsub.on('reconnect', () => {
		nodecg.log.info('PubSub: reconnecting...')
	})

	pubsub.on('bits', (cheer: any) => {
		nodecg.sendMessage('cheer', cheer)
	})

	pubsub.on('subscribe', (subscription: any) => {
		nodecg.sendMessage('subscription', subscription)
	})
}
