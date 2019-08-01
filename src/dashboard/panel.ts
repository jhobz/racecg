	const nameInput = document.querySelector('#nameInput')
	const submitButton = document.querySelector('#submitButton')

	const nameReplicant = nodecg.Replicant('name')

	// Do something when nameReplicant changes
	nameReplicant.on('change', (newValue, oldValue) => {
		nameInput.value = newValue
	})

	submitButton.onclick = () => {
		nameReplicant.value = nameInput.value
	}

	// You can access the NodeCG api anytime from the `window.nodecg` object
	// Or just `nodecg` for short. Like this!:
	// nodecg.log.info('Here\'s an example of using NodeCG\'s logging API!');
