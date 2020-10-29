import { PrettyPrinter } from './printer/PrettyPrinter.js';
import { Output } from './pipeline/Output.js';

export class LogLevel {
	// default Loggamus log levels. New ones can be defined.
	static FINE  = new LogLevel('FINE' ,  0);
	static DEBUG = new LogLevel('DEBUG', 10);
	static INFO  = new LogLevel('INFO' , 20);
	static WARN  = new LogLevel('WARN' , 30);
	static ERROR = new LogLevel('ERROR', 40);
	static FATAL = new LogLevel('FATAL', 50);

	// special levels to represent limits
	static $MIN  = new LogLevel('$MIN', -9999);
	static $MAX  = new LogLevel('$MAX',  9999);

	// ******************************************
	#ns; #name; #level;
	namespace(){ return this.#ns; }
	name(){ return this.#name; }
	level(){ return this.#level; }
	// ******************************************
	eq(ll){ return this.#level == ll.#level; }
	ne(ll){ return this.#level != ll.#level; }
	gt(ll){ return this.#level >  ll.#level; }
	ge(ll){ return this.#level >= ll.#level; }
	lt(ll){ return this.#level <  ll.#level; }
	le(ll){ return this.#level <= ll.#level; }
	// ******************************************

	constructor(name, level){
		this.#name = name;
		this.#level = level;
	}
}

export class Logger {
	static Level = LogLevel;
	static #terminal = new Output.Terminal();
	static #default = new Logger('default');
	static #appRoot = null;

	static getDefault(){
		return Logger.#default;
	}

	static setDefault(logger){
		Logger.#default = logger;
	}

	// Sets the app root (initial portion of the path to be trimmed in trace sources)
	// parent: how many levels above the caller is the root. Default = 1.
	static setAppRoot(parent=1){
		const exp = new RegExp('(?:[/\\\\][^/\\\\]+){'+parent+'}$');
		const path = Logger.#getStackTrace(1)[0].getFileName().replace(exp, '')+'/';
		Logger.#appRoot = new RegExp('^'+path);
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	static fatal (message, meta){ Logger.#default.#_log(message, LogLevel.FATAL, meta); }
	static error (message, meta){ Logger.#default.#_log(message, LogLevel.ERROR, meta); }
	static warn  (message, meta){ Logger.#default.#_log(message, LogLevel.WARN,  meta); }
	static info  (message, meta){ Logger.#default.#_log(message, LogLevel.INFO,  meta); }
	static debug (message, meta){ Logger.#default.#_log(message, LogLevel.DEBUG, meta); }
	static fine  (message, meta){ Logger.#default.#_log(message, LogLevel.FINE,  meta); }

	static log(message, level=Level.FINE, meta){
		Logger.#default.#_log(message, level, meta);
	}

	static #getStackTrace(param){
		const exception = (param instanceof Error) ? param : null; 
		const prepare = Error.prepareStackTrace;
		Error.prepareStackTrace = ($, stack) => stack;
		const error = exception || new Error();
		if(!exception) Error.captureStackTrace(error);
		const stack = error.stack;
		Error.prepareStackTrace = prepare;
		if(exception) return stack;
		return stack.slice(param+1);
	}

	// ########################################################################
	#name = null;
	#printer = null;
	#output = null;
	#tracenext = null;
	#minlevel = null;
	#mintrace = null;
	#tracedepth = null;
	#styles = {
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
		'$PATH'     : { color: 'yellow', mods: ['bright'] }
	};

	constructor(name, options = {}){
		if(!name) throw new Error('Logger must be named!');
		this.#name = name;
		this.setOutput(options.output);
		this.setMinLevel(options.minlevel);
		this.setMinTrace(options.mintrace);
		this.setTraceDepth(options.tracedepth);
		this.applyStyles(options.styles);
	}

	name(){
		return this.#name;
	}

	child(name, options = {}){
		if(!name) throw new Error('Child logger must be named!');
		return new Logger(this.#name+'/'+name, {
			output: options.output || this.#output,
			minlevel: options.minlevel || this.#minlevel,
			mintrace: options.mintrace || this.#mintrace,
			tracedepth: options.tracedepth || this.#tracedepth,
			styles: options.styles || this.#styles
		});
	}

	setOutput(output){
		this.#output = output || Logger.#terminal;
		this.#printer = new PrettyPrinter(this.#output);
		return this;
	}

	applyStyles(styles = {}){ // clone styles deep enough to prevent mutation.
		for(const level of Object.keys(styles)){
			this.#styles[level] = {
				color: styles[level].color || this.#styles[level].color,
				mods: [ ...(styles[level].mods) ]
			};
		}
		return this;
	}

	setMinLevel(level = LogLevel.FINE){
		this.#minlevel = level;
		return this;
	}

	setMinTrace(trace = LogLevel.ERROR){
		this.#mintrace = trace;
		return this;
	}

	setTraceDepth(depth = 1){
		this.#tracedepth = depth;
		return this;
	}

	// Shortcut logging methods. Metadata is optional and not printed by default, but other outputs (file, ELK, etc) might care.
	fatal (message, meta){ this.#_log(message, LogLevel.FATAL, meta); }
	error (message, meta){ this.#_log(message, LogLevel.ERROR, meta); }
	warn  (message, meta){ this.#_log(message, LogLevel.WARN,  meta); }
	info  (message, meta){ this.#_log(message, LogLevel.INFO,  meta); }
	debug (message, meta){ this.#_log(message, LogLevel.DEBUG, meta); }
	fine  (message, meta){ this.#_log(message, LogLevel.FINE,  meta); }

	log(message, level=Level.FINE, meta){
		this.#_log(message, level, meta);
	}

	// Logs a message, with a level.
	#_log(message, level, meta){
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
		const style = this.#styles[level.name()];
		this.#printer.color(style.color).style(...(style.mods));
		this.#printer.write(message);
		
		// print information about the stack frame that called us.
		const stack = Logger.#getStackTrace(2);
		if(doTrace){
			const depth = isError ? 1 : this.#tracedepth;
			this.#printer.endl();
			for(var i=0; i<depth && i<stack.length; i++)
				this.#addStackFrameInfo(stack[i], this.#printer, i==0, 'Logged', 'cyan');
		}

		// print information about the error stack trace
		let error;
		if(isError){
			error = Logger.#getStackTrace(message);
			for(var i=0; i<error.length; i++)
				this.#addStackFrameInfo(error[i], this.#printer, i==0, 'Thrown', 'magenta');
		}

		// Flush all data to output with aditional metadata
		const metadata = {
			logger: this.#name,
			timestamp: new Date().toISOString(),
			log_level_id: level.level(),
			log_level: level.name(),
			logged_at: {
				caller: Logger.#getFrameCaller(stack[0]),
				source: Logger.#getFrameSource(stack[0])
			}
		};
		if(error) metadata.error_at = {
			caller: Logger.#getFrameCaller(error[0]),
			source: Logger.#getFrameSource(error[0])
		};
		if(meta !== undefined) metadata.metadata = meta; // I'm So Meta Even This Acronym :)
		this.#printer.flush(1, metadata);
	}

	#addStackFrameInfo(frame, print, first, verb, vc){
		const c = this.#styles['$CALLSITE'];
		const l = this.#styles['$LAMBDA'];
		const f = this.#styles['$FUNCTION'];
		const s = this.#styles['$STATIC'];
		const p = this.#styles['$PATH'];
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
		const source = Logger.#getFrameSource(frame);
		print.color(c.color).style(...(c.mods)).write(' in ').reset();
		print.color(p.color).style(...(p.mods)).write(source).endl();
	}

	forceStackTrace(trace){
		this.#tracenext = !!trace; // coerce trace to boolean.
		return this;
	}

	static #getFrameCaller(frame){
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

	static #isStaticFrame(frame){
		return frame.getTypeName() === 'Function';
	}

	static #getFrameSource(frame){
		let path = frame.getFileName();
		if(Logger.#appRoot){
			path = path.replace(Logger.#appRoot, '');
		}
		return path +':'+ frame.getLineNumber();
	}
}