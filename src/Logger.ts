import { Color, Modifier, PrettyPrinter } from './printer/PrettyPrinter.js';
import { Output } from './pipeline/Output.js';

export type Style = {
	color:Color;
	mods:Modifier[];
}

export type StyleMap = { [key:string] : Style }

export type Options = {
	output: Output;
	minlevel: LogLevel;
	mintrace: LogLevel;
	tracedepth: number;
	errordepth: number;
	styles: StyleMap;
}

export class LogLevel {
	// default Loggamus log levels. New ones can be defined.
	static readonly FINE  = new LogLevel('FINE' ,  0);
	static readonly DEBUG = new LogLevel('DEBUG', 10);
	static readonly INFO  = new LogLevel('INFO' , 20);
	static readonly WARN  = new LogLevel('WARN' , 30);
	static readonly ERROR = new LogLevel('ERROR', 40);
	static readonly FATAL = new LogLevel('FATAL', 50);

	// special levels to represent limits
	static readonly $MIN  = new LogLevel('$MIN', -9999);
	static readonly $MAX  = new LogLevel('$MAX',  9999);

	// ***********************************************************
	#ns:string; #name:string; #level:number;
	namespace() : string { return this.#ns; }
	name() : string { return this.#name; }
	level() : number { return this.#level; }
	// ***********************************************************
	eq(ll:LogLevel) : boolean { return this.#level == ll.#level; }
	ne(ll:LogLevel) : boolean { return this.#level != ll.#level; }
	gt(ll:LogLevel) : boolean { return this.#level >  ll.#level; }
	ge(ll:LogLevel) : boolean { return this.#level >= ll.#level; }
	lt(ll:LogLevel) : boolean { return this.#level <  ll.#level; }
	le(ll:LogLevel) : boolean { return this.#level <= ll.#level; }
	// ***********************************************************

	constructor(name:string, level:number){
		this.#name = name;
		this.#level = level;
	}
}

export class Logger {
	static Level = LogLevel;
	static #terminal:Output = new Output.Terminal();
	static #default:Logger = new Logger('default');
	static #appRoot:RegExp;

	static getDefault() : Logger {
		return Logger.#default;
	}

	static setDefault(logger:Logger) : void {
		Logger.#default = logger;
	}

	// Sets the app root (initial portion of the path to be trimmed in trace sources)
	// parent: how many levels above the caller is the root. Default = 1.
	static setAppRoot(parent:number=1) : void {
		const prt = new RegExp('^(?:\\w+://)');
		const exp = new RegExp('(?:[/\\\\][^/\\\\]+){'+parent+'}$');
		const path = Logger.#getStackTrace(1)[0].getFileName().replace(prt, '').replace(exp, '')+'/';
		Logger.#appRoot = new RegExp('^(?:\\w+://)?'+path);
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	static fatal (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.FATAL, meta); }
	static error (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.ERROR, meta); }
	static warn  (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.WARN,  meta); }
	static info  (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.INFO,  meta); }
	static debug (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.DEBUG, meta); }
	static fine  (message:string|object, meta?:object) : void { Logger.#default.#_log(message, LogLevel.FINE,  meta); }

	static log(message:string|object, level:LogLevel = LogLevel.FINE, meta?:object) : void {
		Logger.#default.#_log(message, level, meta);
	}

	static #getStackTrace(param:Error|number) : NodeJS.CallSite[] {
		const exception = (param instanceof Error) ? param : null;
		const prepare = Error.prepareStackTrace;
		Error.prepareStackTrace = ($, stack) => stack;
		const error = exception || new Error();
		if(!exception) Error.captureStackTrace(error);

		// @ts-ignore: error.stack is a CallSite[], but some definitions seem to think it's a string instead.
		const stack:NodeJS.CallSite[] = error.stack;

		Error.prepareStackTrace = prepare;
		if(exception) return stack;

		// @ts-ignore: if param is not a number this line is unreachable.
		return stack.slice(param+1);
	}

	// ########################################################################
	#name:string = null;
	#printer:PrettyPrinter = null;
	#output:Output = null;
	#tracenext:boolean = null;
	#minlevel:LogLevel = null;
	#mintrace:LogLevel = null;
	#tracedepth:number = null;
	#errordepth:number = null;
	#styles:StyleMap = {
		'FINE'  : { color: 'white' , mods: ['dim']        },
		'DEBUG' : { color: 'blue'  , mods: ['bright']     },
		'INFO'  : { color: 'green' , mods: [ ]            },
		'WARN'  : { color: 'yellow', mods: [ ]            },
		'ERROR' : { color: 'red'   , mods: ['bright']     },
		'FATAL' : { color: 'red'   , mods: ['underscore'] },

		// call stack styles
		'$CALLSITE' : { color: 'white' , mods: ['dim']    },
		'$LAMBDA'   : { color: 'white' , mods: ['bright'] },
		'$FUNCTION' : { color: 'green' , mods: ['bright'] },
		'$STATIC'   : { color: 'blue'  , mods: ['bright'] },
		'$PATH'     : { color: 'yellow', mods: ['bright'] },
		'$LINE'     : { color: 'cyan'  , mods: ['bright'] }
	};

	constructor(name:string, options:Partial<Options> = {}){
		if(!name) throw new Error('Logger must be named!');
		this.#name = name;
		this.setOutput(options.output);
		this.setMinLevel(options.minlevel);
		this.setMinTrace(options.mintrace);
		this.setTraceDepth(options.tracedepth);
		this.setErrorDepth(options.errordepth);
		this.applyStyles(options.styles);
	}

	name() : string {
		return this.#name;
	}

	child(name, options:Partial<Options> = {}) : Logger {
		if(!name) throw new Error('Child logger must be named!');
		return new Logger(this.#name+'/'+name, {
			output: options.output || this.#output,
			minlevel: options.minlevel || this.#minlevel,
			mintrace: options.mintrace || this.#mintrace,
			tracedepth: options.tracedepth || this.#tracedepth,
			errordepth: options.errordepth || this.#errordepth,
			styles: options.styles || this.#styles
		});
	}

	setOutput(output:Output) : Logger {
		this.#output = output || Logger.#terminal;
		this.#printer = new PrettyPrinter(this.#output);
		return this;
	}

	// clone styles deep enough to prevent mutation.
	applyStyles(styles:StyleMap = {}) : Logger {
		for(const level of Object.keys(styles)){
			this.#styles[level] = {
				color: styles[level].color || this.#styles[level].color,
				mods: [ ...(styles[level].mods) ]
			};
		}
		return this;
	}

	setMinLevel(level:LogLevel = LogLevel.FINE) : Logger {
		this.#minlevel = level;
		return this;
	}

	setMinTrace(trace:LogLevel = LogLevel.ERROR) : Logger {
		this.#mintrace = trace;
		return this;
	}

	setTraceDepth(depth:number = 1) : Logger {
		this.#tracedepth = depth;
		return this;
	}

	setErrorDepth(depth:number = 1) : Logger {
		this.#errordepth = depth;
		return this;
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	fatal (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.FATAL, meta); }
	error (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.ERROR, meta); }
	warn  (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.WARN,  meta); }
	info  (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.INFO,  meta); }
	debug (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.DEBUG, meta); }
	fine  (message:string|object, meta?:object) : void { this.#_log(message, LogLevel.FINE,  meta); }

	log(message:string|object, level:LogLevel = LogLevel.FINE, meta?:object) : void {
		this.#_log(message, level, meta);
	}

	// Logs a message, with a level.
	#_log(message:string|object, level:LogLevel, meta:object) : void {
		// Ignore messages below minimum log level;
		if(level.lt(this.#minlevel)) return;

		// Determine if we're printing stack traces
		let doTrace = this.#tracenext;
		if(doTrace === null){ // if not overriding trace, check min trace level.
			doTrace = level.ge(this.#mintrace);
		}else{ // otherwise clear trace override for next round.
			this.#tracenext = null;
		}

		// Prepare to print stack traces
		const isError = (message instanceof Error);
		if(isError) doTrace = true;
		if(doTrace) this.#printer.endl();

		// Write message
		const style:Style = this.#styles[level.name()];
		this.#printer.color(style.color).style(...(style.mods));
		this.#printer.write(message);
		
		// print information about the stack frame that called us.
		let stack:NodeJS.CallSite[];
		if(doTrace){
			stack = Logger.#getStackTrace(2);
			const depth = isError ? this.#errordepth : this.#tracedepth;
			this.#printer.endl();
			if(typeof stack === "string"){
				this.#printer.reset().background("white").color("black").write(stack).reset().endl();
			}else{
				for(let i=0; i<depth && i<stack.length; i++){
					this.#addStackFrameInfo(stack[i], this.#printer, i==0, 'Logged', 'cyan');
				}
			}
		}

		// print information about the error stack trace
		let error:NodeJS.CallSite[];
		if(isError){
			error = Logger.#getStackTrace(message);
			if(typeof error === "string"){
				this.#printer.reset().background("white").color("black").write(error).reset().endl();
			}else{
				for(let i=0; i<error.length; i++){
					this.#addStackFrameInfo(error[i], this.#printer, i==0, 'Thrown', 'magenta');
				}
			}
		}

		// Flush all data to output with aditional metadata
		const metadata = {
			logger: this.#name,
			timestamp: new Date().toISOString(),
			log_level_id: level.level(),
			log_level: level.name(),
			error_at: undefined,
			logged_at: undefined,
			metadata: undefined
		};
		if(error){
			if(typeof error === "string"){
				metadata.error_at = {
					caller: "<unknown>",
					source: "<unknown>"
				};
			}else{
				metadata.error_at = {
					caller: Logger.#getFrameCaller(error[0]),
					source: Logger.#getFrameSource(error[0])
				};
			}
		} 
		if(doTrace){
			if(typeof stack === "string"){
				metadata.logged_at = {
					caller: "<unknown>",
					source: "<unknown>"
				};
			}else{
				metadata.logged_at = {
					caller: Logger.#getFrameCaller(stack[0]),
					source: Logger.#getFrameSource(stack[0])
				};
			}
		}
		
		if(meta !== undefined) metadata.metadata = meta; // I'm So Meta Even This Acronym :)
		this.#printer.flush(1, metadata);
	}

	#addStackFrameInfo(frame:NodeJS.CallSite, print:PrettyPrinter, first:boolean, verb:string, vc:Color) : void {
		const c = this.#styles['$CALLSITE'];
		const l = this.#styles['$LAMBDA'];
		const f = this.#styles['$FUNCTION'];
		const s = this.#styles['$STATIC'];
		const p = this.#styles['$PATH'];
		const n = this.#styles['$LINE'];
		print.reset();
		if(first) print.color(vc).write(verb).reset();
		else print.write('      ');
		print.color(c.color).style(...(c.mods)).write(' at ');

		// Function Name
		let style = f; // default is function
		if(!frame.getFunctionName()){ style = l; } // check lambda
		else if(Logger.#isStaticFrame(frame)){ style = s; } // check static
		print.reset().color(style.color).style(...(style.mods));
		print.write(Logger.#getFrameCaller(frame)).reset();

		// Source
		let source:string|string[] = Logger.#getFrameSource(frame);
		if(source === null){
			print.color(c.color).style(...(c.mods)).write(' in <unknown>').endl();
		}else{
			source = source.split(':');
			print.color(c.color).style(...(c.mods)).write(' in ').reset();
			print.color(p.color).style(...(p.mods)).write(source[0]).reset();
			print.color(n.color).style(...(n.mods)).write(':', source[1]).endl();
		}
	}

	forceStackTrace(trace:boolean) : Logger{
		this.#tracenext = !!trace; // coerce trace to boolean.
		return this;
	}

	static #getFrameCaller(frame:NodeJS.CallSite) : string {
		let caller = frame.getFunctionName();
		if(!caller) return '[[Lambda Function]]';
		let type = frame.getTypeName();
		let access = '.';
		if(type){
			// check if static
			if(type === 'Function'){
				type = '[[Class]]';
				access = '::';
			}
			return type + access + caller;
		}
		return caller;
	}

	static #isStaticFrame(frame:NodeJS.CallSite) : boolean {
		return frame.getTypeName() === 'Function';
	}

	static #getFrameSource(frame:NodeJS.CallSite) : string {
		let line = frame.getLineNumber();
		let path = frame.getFileName();
		if(!path && !line){ return null; }
		if(Logger.#appRoot && path){
			path = path.replace(Logger.#appRoot, '');
		}
		return (path||'<unknown>') +':'+ (line||'<?>');
	}
}