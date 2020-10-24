# Loggamus
A flexible and configurable logger for NodeJS, with no external dependencies!


## Features
- [x] Logging Levels
- [x] Define the minimum level to log messages (default is everything)
- [x] Define the minimum level at which messages also print the caller stack frame (default is error)
- [x] Pretty printer for colorful terminal output
- [x] You can instantiate your own pretty printer to write colorful messages straight to the terminal
- [x] Style of each logging level is fully configurable
- [x] Child loggers
- [x] Static methods shortcut to default logger, which by default prints in color to the terminal
- [x] Output pipelining system defines where and how logged messages are sent
- [x] File and Terminal output pipes out of the box
- [x] Splitter pipe will replicate messages among all children pipes


## Basic usage
( examples/00-basic.js )
```js
import { Logger } from 'loggamus';

Logger.fatal("This is a fatal error!");

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

Logger.warn("I'll only warn you this once.");
Logger.info("Information is the currency of modern times...");
Logger.debug("Debugging: The fun mystery game where you are the detective, the victim, and the murderer!");
Logger.fine("This level of information is so fine that it probably doesn't matter.");
```
![Basic Usage](https://i.imgur.com/loR9Nox.png)


## Overriding defaults
( examples/02-override.js)
```js
import { Logger, LogLevel, Pipe, Output } from '../index.js';
Logger.setAppRoot(3); // paths in stack traces start 2 levels above this file

Logger.setDefault(new Logger('root', {
	minlevel: LogLevel.WARN, // Logs below WARN will not log
	mintrace: LogLevel.FATAL, // Logs below FATAL won't display stack traces
	tracedepth: 5, // stack traces are at most 5 stack frames deep
	output: new Pipe( // log receptacle that replicates logs it receives between its children
		new Output.Terminal(), // log receptacle that writes pretty logs to terminal
		new Output.File('./examples.log') // log receptacle that writes raw logs to disk
	)
}));

(function (){
	Logger.fatal("This is a fatal error!", {
		subject: 'this is custom metadata',
		function: 'anything we add here travels with our logs',
		destination: 'all the way to the target systems',
		correlationid: 'deadbeef-1337-cafe-babe-0123456789fe' // this is a valid UUID :)
	});
})();

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

// Child logger will inherit everything from the parent, unless we override it.
const child = Logger.getDefault().child('child-01');
child.warn("I'll only warn you this once.");

// these will never be seen because the log level is too high
child.info("Information is the currency of modern times...");
child.debug("Debugging: The fun mystery game where you are\nthe detective, the victim, and the murderer!!");
child.fine("This level of information is so fine that it probably doesn't matter.");
```
![Overriding defaults](https://i.imgur.com/6uWUm1K.png)
```
========================================
{
  logger: 'root',
  timestamp: '2020-10-24T05:29:40.782Z',
  level: 'FATAL',
  levelid: 5,
  caller: '<Lambda Function>',
  source: 'loggamus/examples/02-override.js:19',
  metadata: {
    subject: 'this is custom metadata',
    function: 'anything we add here travels with our logs',
    destination: 'all the way to the target systems',
    correlationid: 'deadbeef-1337-cafe-babe-0123456789fe'
  }
}
----------------------------------------
This is a fatal error!
@ <Lambda Function>  ( loggamus/examples/02-override.js:19 )
@ <Lambda Function>  ( loggamus/examples/02-override.js:25 )
@ ModuleJob.run  ( internal/modules/esm/module_job.js:146 )
@ Loader.import  ( internal/modules/esm/loader.js:165 )
@ Object.loadESM  ( internal/process/esm_loader.js:68 )


========================================


========================================
{
  logger: 'root',
  timestamp: '2020-10-24T05:29:40.793Z',
  level: 'ERROR',
  levelid: 4,
  caller: 'named_function',
  source: 'loggamus/examples/02-override.js:28'
}
----------------------------------------
This is a recoverable error...

========================================


========================================
{
  logger: 'root/child-01',
  timestamp: '2020-10-24T05:29:40.797Z',
  level: 'WARN',
  levelid: 3,
  caller: '<Lambda Function>',
  source: 'loggamus/examples/02-override.js:32'
}
----------------------------------------
I'll only warn you this once.

========================================

```
