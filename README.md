# Loggamus
An easy to use out-of-the-box, flexible and configurable logger for NodeJS, with **no external dependencies!**


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


## Simplified Architecture Diagram
![Simplified Architecture Diagram](https://raw.githubusercontent.com/LordFokas/Loggamus/main/docs/arch-overview.png)


## Basic usage  --  for when you want to hit the ground running.
( examples/00-basic.js )
```js
import { Logger } from 'loggamus';

Logger.setAppRoot(3);

(function (){
	Logger.fatal("This is a fatal error!");
})();

(function named_function(){
	Logger.error("This is a recoverable error...");
})();

Logger.warn("I'll only warn you this once.");
Logger.info("Information is the currency of modern times...");
Logger.debug("Debugging: The fun mystery game where you are\nthe detective, the victim, and the murderer!!");
Logger.fine("This level of information is so fine that it probably doesn't matter.");
```
![Basic Usage](https://i.imgur.com/zyT2mTg.png)


## Pretty Printer  --  used internally, but available to you too!
( examples/01-pretty.js )
```js
import { PrettyPrinter } from 'loggamus';

const pretty = new PrettyPrinter();

// All printer methods return "this", so you can chain anything.
pretty
	.color('green') // set foreground color. There's .background() too.
	.write('Sometimes, ') // write text
	.style('underline', 'bright') // change style
	.color('red')
	.write('all', ' you', ' want') // takes multiple args
	.endl() // add 1 '\n'. If you pass it a number, it adds that many.
	.reset() // reset the styles -- is a shortcut to style('reset')
	.style('bright') // could have been style('reset', 'bright') instead
	.color('yellow') // unfortunately it also resets all the colors :(
	.write('is some pretty text!');

// The printer stores everything in an internal buffer
// and won't write anything until you flush it.
// When you flush it, it prints the whole buffer as a single message.
// Flushing also resets the printer to the initial state
// and returns "this" so you can keep going with the same instance.
pretty.flush();

// All the colors. Dim and Bright variations. Default style is Dim.
pretty.endl();
for(const c of [
	'black', 'red', 'green', 'yellow',
	'blue', 'magenta', 'cyan', 'white'
]){
	let bg = 'black';
	if(c == 'black') bg = 'white';
	pretty.background(bg).color(c).write(' test ').style('reverse').write(' test ').flush();
	pretty.style('bright');
	pretty.background(bg).color(c).write(' test ').style('reverse').write(' test ').flush();
}

// All the styles
pretty.endl();
pretty.style('underline').write('Underline. Underscore is also an alias.').flush();
pretty.style('bright').write('Bright makes foreground colors brighter. Duh.').flush();
pretty.style('dim').write('Dim makes colors dimmer. This is the default console style.').flush();
pretty.style('reverse').write('Reverse swaps background and foreground colors.').flush();
pretty.endl();
pretty.color('red').style('bright', 'underline')
	.write('I have no idea how to make these work, but I mapped them from the VT100 spec anyways:').flush();
pretty.style('blink').write('I have no idea how Blink works, but the control char is mapped. Good luck.').flush();
pretty.style('hidden').write('Hidden is also weird, at least in my terminal. But here you go.').flush();
```
![Pretty Printing](https://i.imgur.com/YwPvdnE.png)


## Overriding defaults  --  Don't like my style or configs? Define yours!
( examples/02-override.js)
```js
import { Logger, LogLevel, Pipe, Output, Transformer } from 'loggamus';

Logger.setAppRoot(3); // paths in stack traces start 2 levels above this file

Logger.setDefault(new Logger('root', {
	minlevel: LogLevel.WARN, // Logs below WARN will not log
	mintrace: LogLevel.FATAL, // Logs below FATAL won't display stack traces
	tracedepth: 5, // stack traces are at most 5 stack frames deep
	output: new Pipe( // any pipe (except outputs) replicates logs it receives between its children
		new Output.Terminal(), // output that writes pretty logs to terminal
		new Transformer.MetadataHeader( // transformer that adds metadata to the log message
			new Output.File('./examples.log') // output that writes raw logs to disk
		)
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
![Overriding defaults](https://i.imgur.com/b9iyodz.png)

Output to `example.log` :
```
********************************************************************************
{
  logger: 'root',
  timestamp: '2020-10-24T23:43:37.820Z',
  level: 'FATAL',
  levelid: 5,
  caller: '<Lambda Function>',
  source: 'loggamus/examples/02-override.js:20',
  metadata: {
    subject: 'this is custom metadata',
    function: 'anything we add here travels with our logs',
    destination: 'all the way to the target systems',
    correlationid: 'deadbeef-1337-cafe-babe-0123456789fe'
  }
}
--------------------------------------------------------------------------------
This is a fatal error!
@ <Lambda Function>  ( loggamus/examples/02-override.js:20 )
@ <Lambda Function>  ( loggamus/examples/02-override.js:26 )
@ ModuleJob.run  ( internal/modules/esm/module_job.js:146 )
@ Loader.import  ( internal/modules/esm/loader.js:165 )
@ Object.loadESM  ( internal/process/esm_loader.js:68 )


********************************************************************************


********************************************************************************
{
  logger: 'root',
  timestamp: '2020-10-24T23:43:37.832Z',
  level: 'ERROR',
  levelid: 4,
  caller: 'named_function',
  source: 'loggamus/examples/02-override.js:29'
}
--------------------------------------------------------------------------------
This is a recoverable error...

********************************************************************************


********************************************************************************
{
  logger: 'root/child-01',
  timestamp: '2020-10-24T23:43:37.834Z',
  level: 'WARN',
  levelid: 3,
  caller: '<Lambda Function>',
  source: 'loggamus/examples/02-override.js:34'
}
--------------------------------------------------------------------------------
I'll only warn you this once.

********************************************************************************

```
