nodecg.listenFor('cheer', (cheer) => {
	nodecg.log.info('Received cheer', cheer)
})

nodecg.listenFor('subscription', (subscription) => {
	nodecg.log.info('Received subscription', subscription)
})

const nameReplicant = nodecg.Replicant('name')

nameReplicant.on('change', (newValue, oldValue) => {
	document.getElementById('message').innerText = `Hello, ${newValue}!`
})

// You can access the NodeCG api anytime from the `window.nodecg` object
// Or just `nodecg` for short. Like this!:
nodecg.log.info('Here\'s an example of using NodeCG\'s logging API!')
