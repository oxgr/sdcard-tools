import { writeFile } from 'fs/promises';
import * as path from 'path';
import { parseSongDirectory } from './helpers.js'

main();

function main() {

    const ARGS = process.argv;
    ARGS.splice( 0, 2 );

    if ( ARGS.length < 1 ) {
        // console.log( 'Pass a path to the original csv please.' );
        console.log( 'Pass a path to directory of songs please.' );
        process.exit();
    }

    const songs = parseSongDirectory( ARGS[ 0 ] );

    console.log( 'Length:', songs.length );

    writeFile( ARGS[ 1 ], JSON.stringify( songs, null, 2 ) )

    return false;

}