import { PrettyPrinter } from './printer/PrettyPrinter.js';
import { Output } from './pipeline/Output.js';

export class LogLevel {
	static FINE  = { l:0, n:'FINE'  };
	static DEBUG = { l:1, n:'DEBUG' };
	static INFO  = { l:2, n:'INFO'  };
	static WARN  = { l:3, n:'WARN'  };
	static ERROR = { l:4, n:'ERROR' };
	static FATAL = { l:5, n:'FATAL' };

	// special levels to represent limits
	static $MIN  = { l:-9999, n:'$MIN' };
	static $MAX  = { l: 9999, n:'$MAX' };
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

	static #getStackTrace(discard=0){
		const prepare = Error.prepareStackTrace;
		Error.prepareStackTrace = ($, stack) => stack;
		const error = new Error();
		Error.captureStackTrace(error);
		const stack = error.stack;
		Error.prepareStackTrace = prepare;
		return stack.slice(discard+1);
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
		'$CALLSITE' : { color: 'yellow', mods: ['bright']     },
		'$LAMBDA'   : { color: 'white' , mods: ['dim']        },
		'$FUNCTION' : { color: 'yellow', mods: ['underscore'] }
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
	#_log(message, level=LogLevel.FINE, meta){
		// Ignore messages below minimum log level;
		if(this.#minlevel.l > level.l) return;

		// Write message
		const style = this.#styles[level.n];
		this.#printer.color(style.color).style(...(style.mods));
		this.#printer.write(message);

		// Write caller stack frame
		let doTrace = this.#tracenext;
		if(doTrace === null){ // if not overriding trace, check min trace level.
			doTrace = level.l >= this.#mintrace.l;
		}else{ // otherwise clear trace override for next round.
			this.#tracenext = null;
		}
		const stack = Logger.#getStackTrace(2);
		if(doTrace){ // print information about the stack frame that called us.
			this.#printer.endl()
			for(var i=0; i<this.#tracedepth && i<stack.length; i++)
				this.#addStackFrameInfo(stack[i], this.#printer);
		}

		// Flush all data to output with aditional metadata
		const metadata = {
			logger: this.#name,
			timestamp: new Date().toISOString(),
			level: level.n,
			levelid: level.l,
			caller: Logger.#getFrameCaller(stack[0]),
			source: Logger.#getFrameSource(stack[0])
		};
		if(meta !== undefined)
			metadata.metadata = meta; // I'm So Meta Even This Acronym :)
		this.#printer.flush(1, metadata);
	}

	#addStackFrameInfo(frame, print){
		const c = this.#styles['$CALLSITE'];
		const l = this.#styles['$LAMBDA'];
		const f = this.#styles['$FUNCTION'];
		print.reset().color(c.color).style(...(c.mods)).write('@ ');

		// Function Name
		if(frame.getFunctionName()){
			print.reset().color(f.color).style(...(f.mods));
			print.write(Logger.#getFrameCaller(frame));
		}else{
			print.reset().color(l.color).style(...(l.mods));
			print.write(Logger.#getFrameCaller(frame));
		}

		// Source
		print.reset().color(c.color).style(...(c.mods));
		print.write('  ( ', Logger.#getFrameSource(frame), ' )').endl();
	}

	forceStackTrace(trace){
		this.#tracenext = !!trace; // coerce trace to boolean.
		return this;
	}

	static #getFrameCaller(frame){
		if(!frame.getFunctionName())
			return '<Lambda Function>';
		let caller = '';
		if(frame.getTypeName())
			caller = frame.getTypeName() + '.';
		return caller + frame.getFunctionName();
	}

	static #getFrameSource(frame){
		let path = frame.getFileName();
		if(Logger.#appRoot){
			path = path.replace(Logger.#appRoot, '');
		}
		return path +':'+ frame.getLineNumber();
	}
}