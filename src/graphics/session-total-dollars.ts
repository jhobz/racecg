nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

// @ts-ignore
const twitchR = nodecg.Replicant('twitch.channels')

twitchR.on('change', (newValue: any[], oldValue) => {
	let channelId: string

	if (window.location.search) {
		const params: any = new Proxy(new URLSearchParams(window.location.search), {
			get: (searchParams, prop: string) => searchParams.get(prop)
		})
		if (params.cid) {
			channelId = params.cid
		}
		if (params.align && params.align.toLowerCase() === 'right') {
			document.getElementById('message').className += ' right-align'
		}
	}

	const bitsTotal = newValue.filter((channel) => channelId ? channel.id === channelId : true)
							  .map((c) => c.sessionTotals.bits).reduce((sum: number, bits: number) => sum + bits)
	const subsTotal = newValue.filter((channel) => channelId ? channel.id === channelId : true)
							  .map((c) => c.sessionTotals.subs).reduce((sum: number, subs: number) => sum + subs)
	const commerceTotal = newValue.filter((channel) => channelId ? channel.id === channelId : true)
							  .map((c) => c.sessionTotals.commerce).reduce((sum: number, commerce: number) => sum + commerce)
	document.getElementById('message').innerText = `$${((bitsTotal / 100) + (subsTotal * 2.50) + (commerceTotal / 100)).toFixed(2)}`
})
