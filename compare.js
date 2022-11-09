import fs from 'fs/promises';
import path from 'path';
import leven from 'leven';
import { fileURLToPath } from 'url';
import { log } from 'console';

const ARGS = process.argv.slice( 2 );
const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// let srcPath = ARGS[ 0 ];
// let destPath = ARGS[ 1 ];
let srcPath = '../assets/spherePackingBach-source-m4a';
let destPath = '../assets/spherePackingBach-processed-mp3/1156';

const srcFiles = noDot( await fs.readdir( srcPath ) );
const destFiles = noDot( await fs.readdir( destPath ) );

console.log( 'srcLength:', srcFiles.length );
console.log( 'destLength:', destFiles.length );

console.log( {
    src0: path.parse( srcFiles[ 0 ] ).name,
    dest0: path.parse( destFiles[ 0 ] ).name,
} );

// process.exit();

const noMatches = srcFiles.map( file => {

    const srcFilename = path.parse( file ).name;

    if ( file[ 0 ] == '.' ) return;

    let lowest = 100;
    let closestMatch = ''
    // console.log( file );

    const matchIndex = destFiles.findIndex( dFile => {

        const dFilename = path.parse( dFile.slice( 3 ) ).name;

        const diff = leven( srcFilename, dFilename );

        if ( lowest < diff ) {
            lowest = Math.min( lowest, diff );
            closestMatch = dFilename;
        }
        // console.log( diff );
        return diff == 0

    } )
    // console.log( closestMatch );
    if( destFiles.length < 1000 ) process.exit ();

    if ( matchIndex == -1 ) {
        console.log({
            file: srcFilename,
            cMatch: closestMatch,
            destLength: destFiles.length
        });
        return file;
    }
    else {
        destFiles.splice( matchIndex, 1 )
        return null;
    }
} ).filter( e => e != null );



console.log( 'noMatches', noMatches.length );

function noDot( array ) {
    return array.filter( e => e[ 0 ] != '.' )
}