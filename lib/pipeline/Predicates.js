export class Predicates {
	static #checkVarargs(args){
		if(!args || args.length === 0){
			throw new Error("Predicate requires one or more arguments");
		}
	}

	static all(...predicates){
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(!predicate(p, r, m)) return false;
			}
			return true;
		}
	}

	static some(...predicates){
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(predicate(p, r, m)) return true;
			}
			return false;
		}
	}

	static none(...predicates){
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(predicate(p, r, m)) return false;
			}
			return true;
		}
	}

	static not(predicate){
		return (p, r, m) => !predicate(p, r, m);
	}

	static #_ll(cmp, ll){
		return (p, r, m) => cmp(m.log_level_id, ll);
	}

	static loglevel(cmp, ll){
		switch(cmp){
			case 'eq': return Predicates.#_ll(((a, b) => a == b), ll.level());
			case 'ne': return Predicates.#_ll(((a, b) => a != b), ll.level());
			case 'ge': return Predicates.#_ll(((a, b) => a >= b), ll.level());
			case 'gt': return Predicates.#_ll(((a, b) => a >  b), ll.level());
			case 'le': return Predicates.#_ll(((a, b) => a <= b), ll.level());
			case 'lt': return Predicates.#_ll(((a, b) => a <  b), ll.level());
		}
		throw new Error(`Unknown LogLevel compare function "${cmp}"`);
	}

	static meta(prop){
		return {
			is   : (val) => ((p,r,m) => m[prop] === val),
			isnt : (val) => ((p,r,m) => m[prop] !== val),
			eq   : (val) => ((p,r,m) => m[prop] ==  val),
			ne   : (val) => ((p,r,m) => m[prop] !=  val),
			null : (   ) => ((p,r,m) => m[prop] === null),
			undef: (   ) => ((p,r,m) => m[prop] === undefined),
			def  : (   ) => ((p,r,m) => m[prop] !== undefined)
		};
	}

	static user(prop){
		return {
			is   : (val) => ((p,r,m) => m.metadata[prop] === val),
			isnt : (val) => ((p,r,m) => m.metadata[prop] !== val),
			eq   : (val) => ((p,r,m) => m.metadata[prop] ==  val),
			ne   : (val) => ((p,r,m) => m.metadata[prop] !=  val),
			null : (   ) => ((p,r,m) => m.metadata[prop] === null),
			undef: (   ) => ((p,r,m) => m.metadata[prop] === undefined),
			def  : (   ) => ((p,r,m) => m.metadata[prop] !== undefined)
		};
	}
}