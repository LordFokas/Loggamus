console.log("\n\n\n");


import { PrettyPrinter } from '../dist/index.js';

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


console.log("\n\n\n");