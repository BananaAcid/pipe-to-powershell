/**
 * Pipe to Powershell
 *
 * @author Nabil Redmann <repo@bananaacid.de>
 * @license ISC
 *
 * @usage npm i && npm start  ---> then type `ls` to get JSON feeedback from powershell
 */


const CONFIG_DEFAULT = {
  bin: 'pwsh', // or 'powershell'
  stream: null,

  delim: 'PS ',
  delimMultiline: '>> ',

  execMode: 'brackets',
};


import { spawn } from 'child_process';
import replaceStream from '@getflywheel/replacestream';
const ansiFormating = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g; // ANSI color markings

import {Readable} from 'stream';

// helper
function parseJson(str) {
  try { return JSON.parse(str); } catch(err) { return undefined; }
} 

// closes the pipes and Kills the spawned powershell
function closePowershellStream({inputStream, child, CONFIG}) {
  inputStream.pause();
  child.stdin.pause();
  child.kill();
}

// trigger a command an let the resultCallback handle it, fire and forget
function execCommand(cmdStr, {inputStream, child, CONFIG}) {
  if (CONFIG.execMode) cmdStr = '(' + cmdStr + ')';
  inputStream.push(cmdStr + '\n');
  // end:  inputStream.push(null);
}

// trigger a command and waits for its result, temporarely rerouting the resultCallback
function getCommand(cmdStr, {inputStream, child, CONFIG}) {
  let backupResultCallback = CONFIG.resultCallback;

  return new Promise( resolve => {
    CONFIG.resultCallback = o => {resolve(o); CONFIG.resultCallback = backupResultCallback; };

    if (CONFIG.execMode) cmdStr = '(' + cmdStr + ')';
    inputStream.push(cmdStr + '\n');
    // end:  inputStream.push(null);
  });
}

function createReadable() {
  // https://stackoverflow.com/a/22085851/1644202
  let s = new Readable();
  s._read = () => {};
  return s;
}

function createPowershellStream(resultCallback, config = null) {

  const CONFIG = {
    resultCallback,
    ...CONFIG_DEFAULT, 
    ...(config ?? {}),
  };

  let inputStream = CONFIG.stream ?? createReadable();
  let buffer = undefined;
  let errors = [];
  let started = false;
  let init = false;
  //let ignore = false; ..with: eats any following ending trigger, without will always end reliably


  // ended on error will just output, the real end by delim is still coming and might have data.
  // resolving should return {data,error} and not reject.
  let ended = (buffer, isError = false) => {
    let data = (isError) 
      //? new Error( buffer.replace(cols, '').replace(/\n$/, '') ) 
      ? buffer.replace(ansiFormating, '').replace(/\n$/, '') 
      : parseJson(buffer);

    //console.log('RESULT:\n', data);

    if (isError)
      errors.push(data);
    else if (CONFIG.resultCallback)
      CONFIG.resultCallback({data, errors: errors.length ? errors : null});
  }


  const child = spawn( CONFIG.bin, [
    '-NoLogo', 
    '-NoProfile',  // should make sure, we always get 'PS ...' as prompt 
    '-NoProfileLoadTime',
    '-noni',
  ]);
  // make sure, we deal with strings, not buffers
  child.stdout.setEncoding('utf8'); 
  child.stderr.setEncoding('utf8');

  child.stderr.on('data', data => {
    //ignore = true; // let stdout not trigger 
    ended(data, true);
  });

  child.stdout.on('data', (data) => {
    if (process.env.DEBUG_PIPETOPOWERSHELL) {
      console.log(`child stdout:\n${data}`);
    }

    /* Problem: multiline quotes -> pwsh will start lines with `>> ` and ConvertTo-Json is appended .. */
    if (data?.startsWith( CONFIG.delimMultiline )) 
    {
      ended('Multiline input piping to powershell is not supported (did you forget to close quotes?)', true);
      buffer = undefined;
      started = false;
      ended(undefined);
    }
    /* ... detect if JSON was started or if the string is complete json (true, false, undefined, null, ..) */
    else if (data && !started && (['"', "'", '[', '{'].indexOf(data.trim()[0]) !== -1 || parseJson(data)) ) {
      started = true;
      buffer = data;
    }
    /* end of command == end of JSON */
    else if (started && (data.startsWith( CONFIG.delim ) || data == '') ) {
      started = false;
      ended(buffer);
      buffer = undefined;
      errors = [];
    }
    /* buffer was full and more data has been pushed */
    else if (started) {
      buffer += data;
    }
    /* inital prompt or error occured and it ended */
    else if (!started && data.startsWith( CONFIG.delim )) {
      if (!init)
         init = true;
      //else if (ignore)
      //   ignore = false;
      else {
         ended(null);
         buffer = undefined;
         errors = [];
      }
    }

  });

  // connect to the spawned instance, append a command to always return JSON
  // does not work with `exit` ... (TODO ?)
  inputStream.pipe(replaceStream('\n', ' | ConvertTo-Json\n')).pipe(child.stdin);

  // return a control object
  return {
    close: _ => closePowershellStream({inputStream, child, CONFIG}), 
    exec: cmdStr => execCommand(cmdStr, {inputStream, child, CONFIG}), 
    get: cmdStr => getCommand(cmdStr, {inputStream, child, CONFIG}),
    child,
  };
}

export default createPowershellStream;
