import * as fs from 'fs/promises'
import * as fse from 'fs-extra'
import * as path from 'path'
import { spawn } from 'child_process'

let start;

const src = '../assets/testCopy/';
const dest = '/Volumes/A02-C1';

const flush = async ( dest ) => {
    for ( const file of ( await fs.readdir( dest ) ) ) {
        if ( file[0] != '.' ) await fse.remove( path.join( dest, file ) );
    }
}


// fs

await flush( dest );
console.log( 'Start fs...' );
start = performance.now();

for ( const file of ( await fs.readdir( src ) ) ) {
    await fs.copyFile( path.join( src, file ), path.join( dest, file ) );
}

const fsTime = performance.now() - start;
console.log( 'fs:',  ( fsTime  * 0.001 ).toFixed( 2 ) );

// fse

await flush( dest );
console.log( 'Start fse...' );
start = performance.now();

await fse.copy( src, dest );

const fseTime = performance.now() - start;
console.log( 'fse:', ( fseTime * 0.001 ).toFixed( 2 ) );

// cp

await flush( dest );

console.log( 'Start cp...' );
start = performance.now();

const cp = spawn( 'sudo', [ 'cp', '-r',
    src,
    dest
] );

cp.stdin.write( Buffer.from( 'hemmer' ) );
cp.stdout.on( 'data', ( data ) => console.log( '\r' + data.toString().trim() ) )
cp.stderr.on( 'data', ( data ) => console.log( data.toString() ) )

await new Promise( resolve => cp.on( 'exit', resolve ) );

const cpTime = performance.now() - start;
console.log( 'cp:',  ( cpTime  * 0.001 ).toFixed( 2 ) );



