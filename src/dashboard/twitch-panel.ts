(() => {

const twitchR: any = nodecg.Replicant('twitchState')
const checkElem: HTMLInputElement = document.querySelector('#spoofCheck')
const statusElem: HTMLElement = document.querySelector('#pubsubConnection')
const resetSessionElem: HTMLElement = document.querySelector('#resetSessionBtn')
const twitchChannelsElem: HTMLElement = document.querySelector('#twitchChannels')

const sessionTotals = {
	bits: 0,
	subs: 0,
}

// TODO: Strongly type this replicant
twitchR.on('change', (newValue: any, oldValue: any) => {
	checkElem.checked = newValue.isSpoofing
	sessionTotals.bits = newValue.totals.bits
	sessionTotals.subs = newValue.totals.subs

	if (newValue.isConnected) {
		statusElem.innerHTML = `connected to ${newValue.url}.`
		statusElem.className = 'status primary'
	} else {
		statusElem.innerHTML = 'disconnected.'
		statusElem.className = 'status warn'
	}

	let channelsHtml = ''
	newValue.channels.forEach((channel: string) => {
		channelsHtml += `<div class="channel">${channel}</div>`
	})
	twitchChannelsElem.innerHTML = channelsHtml
})

checkElem.onchange = (ev) => {
	twitchR.value.isSpoofing = checkElem.checked
}

resetSessionElem.onclick = (ev) => {
	// TODO: open dialog asking for confirmation
	nodecg.sendMessage('twitch.resetSession')
	console.log('sent message')
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
