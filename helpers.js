import { readFile, readdir } from 'fs/promises';
import * as path from 'path';

// Convert total duration in seconds to minutes:seconds format.
const secondsToTime = ( duration ) => {
    const minutes = Math.floor( duration / 60 )
    const seconds = Math.floor( duration % 60 ).toString().padStart( 2, '0' );
    const time = minutes + ':' + seconds

    return time;
}

const parseCSV = async ( csvPath ) => {

    const csvEntries = ( await readFile( csvPath, { encoding: 'utf8' } ) )
        .replaceAll( '\"', '' )
        .split( '\r' );

    const csvArr = csvEntries.map( entry => {

        const tokens = entry.split( '/' );
        const code = tokens[ 0 ].trim();
        const name = tokens[ 1 ].split( '.m4a' )[ 0 ].trim();

        return {
            code: code,
            name: name
        }

    } )

    return csvArr;

}

const sleep = ( ms = 1000 ) => new Promise( ( r ) => setTimeout( r, ms ) );

// Converts Float32Array to Int16Array and retains value within range.
const float32ToInt16 = ( float32Buffer ) => {

    const int16Buffer = new Int16Array( float32Buffer.length );
    for ( let i = 0, lenFloat = float32Buffer.length; i < lenFloat; i++ ) {
        if ( float32Buffer[ i ] < 0 ) {
            int16Buffer[ i ] = 0x8000 * float32Buffer[ i ];
        } else {
            int16Buffer[ i ] = 0x7FFF * float32Buffer[ i ];
        }
    }

    return int16Buffer;

}



export {
    secondsToTime,
    parseCSV,
    sleep,
    float32ToInt16,
}