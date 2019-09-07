import * as riot from 'riot'
import { Goal } from '../../types/replicants/goals'
import EditableRow from '../components/ui-editable-row.riot'
import EditableTable from '../components/ui-editable-table.riot'

riot.register('ui-editable-row', EditableRow)
riot.register('ui-editable-table', EditableTable)

const createEditableTable = riot.component(EditableTable)
const goalsR = nodecg.Replicant<Goal[]>('goals')

goalsR.on('change', (newValue) => {
	// We don't want to edit the replicant directly on the ui element, so let's clone it
	const goals = JSON.parse(JSON.stringify(newValue))
	const tableElem = document.createElement('ui-editable-table')
	document.querySelector('body').appendChild(tableElem)
	createEditableTable(tableElem, {
		cols: [
			{
				name: 'name',
				type: 'text',
			},
			{
				name: 'value',
				type: 'number',
			},
			{
				name: 'currency',
				type: 'text', // TODO: dropdown
			},
		],
		entries: goals,
	})
})
