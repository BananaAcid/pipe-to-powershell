import createPowershellStream from '../index.mjs';


// create a piped commandline with custom prompt - no callback needed
let {close, exec, get} = createPowershellStream(null);

// get debug output:  process.env.DEBUG_PIPETOPOWERSHELL = true;
(async _ => {

	await get(`$a = "Hello"`);

	let ret = await get('$a');

	console.log('Value: ', ret.data);

	await get(`$a = "$($a) World!"`);

	ret = await get('$a');

	console.log('Value: ', ret.data);

	close();
})();