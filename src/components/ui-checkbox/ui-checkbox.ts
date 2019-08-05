import {RiotComponentBase} from '../riot-component-base'

export default class Checkbox extends RiotComponentBase {
	private color: string
	private compName: string
	private isChecked: boolean

	constructor() {
		super()
	}

	public onBeforeMount(props: any, state: any) {
		super.onBeforeMount.call(this)
	}

	private onClick(e: MouseEvent) {
		const riot = super.getRiotContext()
		riot.update({
			isChecked: !riot.state.isChecked,
		})
	}
}
