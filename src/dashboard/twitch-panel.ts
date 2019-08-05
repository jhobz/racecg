import * as riot from 'riot'
import Checkbox from '../components/ui-checkbox/ui-checkbox.riot'

(() => {

riot.register('ui-checkbox', Checkbox)
riot.mount('ui-checkbox')

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

// TODO: Strongly type this replicant
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

	let channelsHtml = ''
	newValue.authorizedChannels.forEach((channel: any) => {
		channelsHtml += `<button class="channel primary">${channel.name}</button>`

		// FIXME: Technically, the below doesn't work properly. This is because I'm
		// just waiting until I add in the component engine to simplify things.
		let topicsHtml = ''
		channel.authorizedTopics.forEach((topic: string) => {
			const dashIndex = topic.indexOf('-') + 1
			const t = topic.substring(dashIndex, topic.indexOf('-', dashIndex))
			topicsHtml += `<button class="topic primary">${t}</button>`
		})
		twitchTopicsElem.innerHTML = topicsHtml
	})
	twitchChannelsElem.innerHTML = channelsHtml

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
