import createPowershellStream from './index.mjs';


// create a piped commandline with custom prompt - no callback needed
let {close, get} = createPowershellStream(null);

//get debug output:  process.env.DEBUG_PIPETOPOWERSHELL = true;
(async _ => {

	let {data: files} = await get('ls');

	console.log('Files in this folder: ', files.length);

	let {data: ver} = await get('$PSVersionTable.PSVersion');

	console.log(`PS Version: ${ver.Major}.${ver.Minor}.${ver.Patch}`);

	close();
})();