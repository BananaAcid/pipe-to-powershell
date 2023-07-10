# Pipe to Powershell

Pipe commands to a powershell instance and get results as JSON

<img width="809" alt="test-screenshot" src="https://user-images.githubusercontent.com/1894723/252398263-92c0f828-261d-4e54-99d0-8513c1d8dfd5.png">


## Installation

```bash
npm i pipe-to-powershell
```

## FNs

### `createPowershellStream(returnCallback|null, config? = CONFIG_DEFAULT): pipeControl` 
Initializes (spawns) the powershell.

`returnCallback` = `( pipeResults: {data: JSON, errors: string[]} ): void`

- To not use `returnCallback` (like only using `get()`), you may deliberately pass `null`.

`pipeControl` = `{close, exec, get}` ... see below

`CONFIG_DEFAULT` = `{bin: string = 'pwsh' /*executable bin*/, stream: stream.Stream|null = stream.Readable /*input stream*/, execMode: 'brackets'|null = 'brackets'}`

- In case powershell changes its prompts, additional config properties `{delim = 'PS ', delimMultiline = '>> '}` can be overwritten.

You might want to use `get()` and change to an older powershell:
```js
let {close, get} = createPowershellStream(null, {bin: 'powershell.exe'});
````

### `close(): void`
Closes the pipes and Kills the spawned powershell.

### `exec(cmdStr: String): void`
Trigger a command an let the resultCallback handle it. Fire and forget.

### `get(cmdStr: String): Promise<pipeResults>`
Trigger a command and waits for its result, temporarely rerouting the resultCallback.

Should be awaited to mitigate race conditions. Running in paralell is not supported due to the nature of piping and rerouting the resultCallback.

Does not need returnCallback, during initialisation the param can be set to `null`. You should be using `close()`, when you are done.

```js
let {data, error} = await get('ls');

let {data: files} = await get('ls'); // this will decunstruct data, and provide it as variable 'files'
```

### pushing to the input pipe
You can always use `inputStream.push(string)`, but note, your command should end with `\n`


## Notes
- Variable expressions should always be in brackets, which is automatically done by `config.execMode`: `($a = "Hello")` - because the conversion to JSON for the result would save the JSON encoded version (with extra quotes).


## Examples

Terminal input to powershell
```js
import createPowershellStream from 'pipe-to-powershell';


process.stdout.write('press ^D to end \n:: ');

// create a piped commandline with custom prompt 
let {close, call, get} = createPowershellStream(({data, errors}) => {
	// show powershell result
	console.log('ERRORS:', errors, 'DATA:', data);

	// show a custom promt for next input
	process.stdout.write(':: ');
}, {stream: process.stdin}); // process.stdin or null (null == string pipe)
```

Trigger a few commands on powershell and get results, while piping to the same instance
```js
import createPowershellStream from 'pipe-to-powershell';


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
```
