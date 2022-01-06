import { type LogLevel } from '../Logger.js';

export type Predicate = (p, r, m) => boolean;
export type Comparator = (a:number, b:number) => boolean;

export interface PropChecker {
	is   : (val:any) => Predicate;
	isnt : (val:any) => Predicate;
	eq   : (val:any) => Predicate;
	ne   : (val:any) => Predicate;
	null : (       ) => Predicate;
	undef: (       ) => Predicate;
	def  : (       ) => Predicate;
}

export class Predicates {
	static #checkVarargs(args) : void{
		if(!args || args.length === 0){
			throw new Error("Predicate requires one or more arguments");
		}
	}

	static all(...predicates:Predicate[]) : Predicate{
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(!predicate(p, r, m)) return false;
			}
			return true;
		}
	}

	static some(...predicates:Predicate[]) : Predicate{
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(predicate(p, r, m)) return true;
			}
			return false;
		}
	}

	static none(...predicates:Predicate[]) : Predicate{
		Predicates.#checkVarargs(predicates);
		return (p, r, m) => {
			for(const predicate of predicates){
				if(predicate(p, r, m)) return false;
			}
			return true;
		}
	}

	static not(predicate) : Predicate {
		return (p, r, m) => !predicate(p, r, m);
	}

	static #_ll(cmp:Comparator, ll:number) : Predicate {
		return (p, r, m) => cmp(m.log_level_id, ll);
	}

	static loglevel(cmp:string, ll:LogLevel) : Predicate{
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

	static meta(prop:string) : PropChecker{
		return {
			is   : (val:any) => ((p,r,m) => m[prop] === val),
			isnt : (val:any) => ((p,r,m) => m[prop] !== val),
			eq   : (val:any) => ((p,r,m) => m[prop] ==  val),
			ne   : (val:any) => ((p,r,m) => m[prop] !=  val),
			null : (       ) => ((p,r,m) => m[prop] === null),
			undef: (       ) => ((p,r,m) => m[prop] === undefined),
			def  : (       ) => ((p,r,m) => m[prop] !== undefined)
		};
	}

	static user(prop:string) : PropChecker{
		return {
			is   : (val:any) => ((p,r,m) => m.metadata[prop] === val),
			isnt : (val:any) => ((p,r,m) => m.metadata[prop] !== val),
			eq   : (val:any) => ((p,r,m) => m.metadata[prop] ==  val),
			ne   : (val:any) => ((p,r,m) => m.metadata[prop] !=  val),
			null : (       ) => ((p,r,m) => m.metadata[prop] === null),
			undef: (       ) => ((p,r,m) => m.metadata[prop] === undefined),
			def  : (       ) => ((p,r,m) => m.metadata[prop] !== undefined)
		};
	}
}