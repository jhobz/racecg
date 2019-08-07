nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

const twitchR = nodecg.Replicant('twitch.state')

twitchR.on('change', (newValue: any, oldValue) => {
	document.getElementById('message').innerText = newValue.sessionSums.bits.toString()
})
