// TODO: Switch this to the package once PR is merged, or to
//       my fork if merge takes too long
import TwitchPS = require('twitchps')
import {NodeCG} from '../../types/nodecg'
import {TwitchChannel} from '../../types/twitch'

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

	const pubsub = new TwitchPS({
		debug: true,
		init_topics: initTopics,
		reconnect: true,
	})

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
		nodecg.log.info('PubSub: received cheer:', cheer)
		nodecg.sendMessage('cheer', cheer)
	})

	pubsub.on('subscribe', (subscription: any) => {
		nodecg.log.info('PubSub: received subscription:', subscription)
		nodecg.sendMessage('subscription', subscription)
	})
}
