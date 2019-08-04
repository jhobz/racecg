// Bugfix for badly defined function signature in package
export * from '../node_modules/riot/riot'
declare module 'riot' {
	export function mount<P = object, S = object>(selector: string, componentName?: string, initialProps?: P): RiotComponent<P, S>[]
}