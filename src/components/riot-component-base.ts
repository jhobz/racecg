let ctx: RiotComponentBase

/**
 * All Riot components MUST extend this class. Any methods
 * from child classes that want to access the Riot context must
 * capture the value returned by `super.getRiotContext()`.
 */
export class RiotComponentBase {
	private riot: any

	constructor() {
		ctx = this
	}

	public onBeforeMount(props: any, state: any): void {
		ctx.riot = this
	}

	protected getRiotContext() {
		return ctx.riot
	}
}
