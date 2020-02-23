nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

const twitchR = nodecg.Replicant('twitch.channels')

twitchR.on('change', (newValue: any[], oldValue) => {
	const bitsTotal = newValue.map((c) => c.sessionTotals.bits).reduce((sum: number, bits: number) => sum + bits)
	const subsTotal = newValue.map((c) => c.sessionTotals.subs).reduce((sum: number, subs: number) => sum + subs)
	document.getElementById('message').innerText = `$${((bitsTotal / 100) + (subsTotal * 2.50)).toFixed(2)}`
})

const urlParams = new URLSearchParams(window.location.search)
if (urlParams.has('align') && urlParams.get('align').toLowerCase() === 'right') {
	document.getElementById('message').className += ' right-align'
}
