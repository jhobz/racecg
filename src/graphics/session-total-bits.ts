nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

// @ts-ignore
const twitchR = nodecg.Replicant('twitch.channels')

twitchR.on('change', (newValue: any[], oldValue) => {
	const bitsTotal = newValue.map((c) => c.sessionTotals.bits).reduce((sum: number, bits: number) => sum + bits)
	document.getElementById('message').innerText = bitsTotal
})
