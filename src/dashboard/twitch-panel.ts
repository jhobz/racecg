import * as riot from 'riot'
import Checkbox from '../components/ui-checkbox.riot'
import Checktree from '../components/ui-checktree.riot'

// TODO: Get rid of this IIFE
(() => {
riot.register('ui-checkbox', Checkbox)
riot.register('ui-checktree', Checktree)

const createChecktree = riot.component(Checktree)
const connectionR: any = nodecg.Replicant('twitch.connection')
const channelsR: any = nodecg.Replicant('twitch.channels')
const checkElem: HTMLInputElement = document.querySelector('#spoofCheck')
const statusElem: HTMLElement = document.querySelector('#pubsubConnection')
const resetSessionElem: HTMLElement = document.querySelector('#resetSessionBtn')
const twitchChannelsElem: HTMLElement = document.querySelector('#twitchChannels')

connectionR.on('change', (newValue: any, oldValue: any) => {
	checkElem.checked = newValue.isSpoofing

	if (newValue.isConnected) {
		statusElem.innerHTML = `connected to ${newValue.url}.`
		statusElem.className = 'status primary'
	} else {
		statusElem.innerHTML = 'disconnected.'
		statusElem.className = 'status warn'
	}
})

channelsR.on('change', (newValue: any, oldValue: any) => {
	twitchChannelsElem.innerHTML = ''
	newValue.forEach((channel: any) => {
		const elem = document.createElement('ui-checktree')
		elem.id = `ui-checktree-${channel.name}`
		twitchChannelsElem.appendChild(elem)

		// Construct the array of topic information needed by ui-checkbox
		const topics = channel.authorizedTopics.map((topic: string) => {
			const dashIndex = topic.indexOf('-') + 1

			return {
				cb: (state: boolean) => { onTopicToggle(channel.id, topic, state) },
				checked: channel.enabledTopics.includes(topic),
				name: topic.substring(dashIndex, topic.indexOf('-', dashIndex)),
			}
		})

		createChecktree(elem, {
			header: channel.name,
			items: topics,
		})
	})
})

checkElem.onchange = (ev) => {
	connectionR.value.isSpoofing = checkElem.checked
}

resetSessionElem.onclick = (ev) => {
	// TODO: open dialog asking for confirmation
	nodecg.sendMessage('twitch.resetSession')
}

nodecg.listenFor('cheer', (cheer) => {
	logTwitchEvent('cheer', cheer)
})
nodecg.listenFor('subscription', (sub) => {
	logTwitchEvent('subscription', sub)
})

// Helper functions

function logTwitchEvent(type: string, data: any) {
	const elem = document.querySelector('#messageLog')
	const html = elem.innerHTML
	elem.innerHTML = `<pre>${type.toUpperCase()}: ${JSON.stringify(data)}</pre>` + html
}

function onTopicToggle(cid: string, topic: string, state: boolean) {
	nodecg.sendMessage('twitch.toggleTopic', { cid, topic, state })
}

})()
