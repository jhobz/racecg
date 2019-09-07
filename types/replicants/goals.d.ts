export type Goal = {
	name: string;
	value: number;
	currency?: "all" | "bits" | "gifts" | "merch" | "subs" | "tips";
}