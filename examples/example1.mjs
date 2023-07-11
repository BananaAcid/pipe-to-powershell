import createPowershellStream from '../index.mjs';


process.stdout.write('press ^D to end \n:: ');

// create a piped commandline with custom prompt 
let {close, call, get} = createPowershellStream(({data, errors}) => {
	// show powershell result
	console.log('ERRORS:', errors, 'DATA:', data);

	// show a custom promt for next input
	process.stdout.write(':: ');
}, {stream: process.stdin}); // process.stdin or null (null == string pipe)

// force quit
//setTimeout(_ => {close(); console.log('\nSession time ended');}, 5_000);

// trigger a command an let the resultCallback handle it
//setTimeout(_ => {exec('ls');}, 5_000);

// trigger a command and wait for its result, temporarely rerouting the resultCallback
/*
setTimeout(async _ => {
	let a = await get('ls');
	console.log('A', a); 
}, 5_000);
*/

