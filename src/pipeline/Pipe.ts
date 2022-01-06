import { Output } from './Output.js';

export class Pipe extends Output{
	readonly #downstreams:Output[];

	constructor(...downstreams:Output[]){
		super(false, false);
		this.#downstreams = downstreams || [];
		let pretty = false;
		let raw    = false;
		for(const downstream of downstreams){
			pretty = pretty || downstream.usesPretty();
			raw    = raw    || downstream.usesRaw();
		}
		this.$setStreams(pretty, raw);
	}

	write(pretty:string, raw:string|object, meta:object){
		for(const downstream of this.#downstreams){
			downstream.write(pretty, raw, meta);
		}
	}
}