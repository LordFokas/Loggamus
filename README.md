# Loggamus
A flexible and configurable logger for NodeJS.

The full dependency tree is only 3 packages (including Loggamus)!

## Features
- [x] Logging Levels
- [x] Define the minimum level to log messages (default is everything)
- [x] Define the minimum level at which messages also print the caller stack frame (default is error)
- [x] Pretty printer for colorful terminal output
- [x] You can instantiate your own pretty printer to write colorful messages straight to the terminal
- [x] Style of each logging level is fully configurable
- [x] Child loggers
- [x] Static methods shortcut to default logger, which by default prints in color to the terminal
- [x] Output stream system defines where and how logged messages are sent
- [x] File and Terminal output streams out of the box
- [x] Splitter stream will replicate messages among all children streams


## Basic usage
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
