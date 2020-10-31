import { Predicates } from './Predicates.js';
import { Pipe } from './Pipe.js';

export class Filter extends Pipe {
	#predicate;

	constructor(predicate, ...downstreams){
		super(...downstreams);
		this.#predicate = predicate;
	}

	write(pretty, raw, meta){
		if(this.#predicate(pretty, raw, meta)){
			super.write(pretty, raw, meta);
		}
	}

	static Predicates = Predicates;
}

