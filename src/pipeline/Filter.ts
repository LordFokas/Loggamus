import { Predicates, type Predicate } from './Predicates.js';
import { Pipe } from './Pipe.js';
import { Output } from './Output.js';

export class Filter extends Pipe {
	readonly #predicate:Predicate;

	constructor(predicate:Predicate, ...downstreams:Output[]){
		super(...downstreams);
		this.#predicate = predicate;
	}

	write(pretty:string, raw:string|object, meta:object){
		if(this.#predicate(pretty, raw, meta)){
			super.write(pretty, raw, meta);
		}
	}

	static Predicates = Predicates;
}

