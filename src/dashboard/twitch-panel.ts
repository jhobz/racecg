import * as riot from 'riot'
import Checkbox from '../components/ui-checkbox.riot'
import Checktree from '../components/ui-checktree.riot'
riot.register('ui-checkbox', Checkbox)
riot.register('ui-checktree', Checktree)
;
(() => {

const createChecktree = riot.component(Checktree)
const twitchR: any = nodecg.Replicant('twitch.state')
const checkElem: HTMLInputElement = document.querySelector('#spoofCheck')
const statusElem: HTMLElement = document.querySelector('#pubsubConnection')
const resetSessionElem: HTMLElement = document.querySelector('#resetSessionBtn')
const twitchChannelsElem: HTMLElement = document.querySelector('#twitchChannels')
const twitchTopicsElem: HTMLElement = document.querySelector('#twitchTopics')

const sessionTotals = {
	bits: 0,
	subs: 0,
}

twitchR.on('change', (newValue: any, oldValue: any) => {
	checkElem.checked = newValue.isSpoofing
	sessionTotals.bits = newValue.sessionSums.bits
	sessionTotals.subs = newValue.sessionSums.subs

	if (newValue.isConnected) {
		statusElem.innerHTML = `connected to ${newValue.url}.`
		statusElem.className = 'status primary'
	} else {
		statusElem.innerHTML = 'disconnected.'
		statusElem.className = 'status warn'
	}

	twitchChannelsElem.innerHTML = ''
	newValue.authorizedChannels.forEach((channel: any) => {
		const elem = document.createElement('ui-checktree')
		elem.id = `ui-checktree-${channel.name}`
		twitchChannelsElem.appendChild(elem)

		const topics = channel.authorizedTopics.map((topic: string) => {
			const dashIndex = topic.indexOf('-') + 1
			return {
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
	twitchR.value.isSpoofing = checkElem.checked
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

function logTwitchEvent(type: string, data: any) {
	const elem = document.querySelector('#messageLog')
	const html = elem.innerHTML
	elem.innerHTML = `<pre>${type.toUpperCase()}: ${JSON.stringify(data)}</pre>` + html
}

})()
