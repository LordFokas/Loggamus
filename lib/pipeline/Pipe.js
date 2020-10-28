export class Pipe {
	static $build(_, downstreams){
		return new Pipe(...downstreams);
	}

	#downstreams = [];
	#usesPretty = false;
	#usesRaw    = false;

	constructor(...downstreams){
		this.#downstreams = downstreams;
		let pretty = false;
		let raw    = false;
		for(const downstream of downstreams){
			pretty = pretty || downstream.usesPretty();
			raw    = raw    || downstream.usesRaw();
		}
		this.$setStreams(pretty, raw);
	}

	$setStreams(pretty, raw){
		this.#usesPretty = !!pretty;
		this.#usesRaw    = !!raw;
	}

	usesPretty(){ return this.#usesPretty; }
	usesRaw   (){ return this.#usesRaw; }

	write(pretty, raw, meta){
		for(const downstream of this.#downstreams){
			downstream.write(pretty, raw, meta);
		}
	}
}