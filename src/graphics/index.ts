nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

const twitchR = nodecg.Replicant('twitchState')

twitchR.on('change', (newValue: any, oldValue) => {
	document.getElementById('message').innerText = newValue.totals.bits.toString()
})

// You can access the NodeCG api anytime from the `window.nodecg` object
// Or just `nodecg` for short. Like this!:
nodecg.log.info('Here\'s an example of using NodeCG\'s logging API!')
