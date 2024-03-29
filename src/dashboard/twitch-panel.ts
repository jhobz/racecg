import * as riot from 'riot'
// @ts-ignore
import LogTwitchEvent from '../components/log-twitch-event.riot'
// @ts-ignore
import Checkbox from '../components/ui-checkbox.riot'
// @ts-ignore
import Checktree from '../components/ui-checktree.riot'

// TODO: Get rid of this IIFE
(() => {
riot.register('ui-checkbox', Checkbox)
riot.register('ui-checktree', Checktree)
riot.register('log-twitch-event', LogTwitchEvent)

const createChecktree = riot.component(Checktree)
const createTwitchLog = riot.component(LogTwitchEvent)
const connectionR: any = nodecg.Replicant('twitch.connection')
const channelsR: any = nodecg.Replicant('twitch.channels')
const checkElem: HTMLInputElement = document.querySelector('#spoofCheck')
const statusElem: HTMLElement = document.querySelector('#pubsubConnection')
const resetSessionElem: HTMLElement = document.querySelector('#resetSessionBtn')
const twitchChannelsElem: HTMLElement = document.querySelector('#twitchChannels')
let sessionAddBtnElems: NodeListOf<HTMLElement>

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

// TODO: This all gets run every time any event comes in, meaning DOM elements
//		 are getting recreated often for no reason. Should check only for when
//		 the list of channels has actually changed.
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

	sessionAddBtnElems = document.querySelectorAll('[id^="submit-"]')
	sessionAddBtnElems.forEach(val => {
		val.onclick = (ev) => {
			const channel = val.id.slice(val.id.indexOf('-') + 1)
			const dollarsElem: HTMLInputElement = document.querySelector(`#add-${channel}`)
			if (dollarsElem.value) {
				nodecg.sendMessage('twitch.addToSession', { channel, amount: parseInt(dollarsElem.value, 10) })
			}
		}
	})
})

checkElem.onchange = (ev) => {
	connectionR.value.isSpoofing = checkElem.checked
}

resetSessionElem.onclick = (ev) => {
	// TODO: open dialog asking for confirmation
	const sessionStartElem: HTMLInputElement = document.querySelector('#sessionStart')
	nodecg.sendMessage('twitch.resetSession', parseInt(sessionStartElem.value, 10))
}

nodecg.listenFor('cheer', (cheer) => {
	logTwitchEvent('cheer', cheer)
})
nodecg.listenFor('subscription', (sub) => {
	logTwitchEvent('subscription', sub)
})

// Helper functions

function logTwitchEvent(type: string, data: any) {
	const elem = document.createElement('log-twitch-event')
	const container = document.querySelector('#messageLog')
	container.prepend(elem)
	createTwitchLog(elem, {
		amount: type === 'cheer' ? data.bits_used + ' bits' : data.cumulative_months + ' months',
		message: data.chat_message,
		name: data.user_name,
		type,
	})
}

function onTopicToggle(cid: string, topic: string, state: boolean) {
	nodecg.sendMessage('twitch.toggleTopic', { cid, topic, state })
}

})()
