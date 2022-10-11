import { getAudioDurationInSeconds } from 'get-audio-duration';
import fs from 'fs/promises';
import path from 'path';
import { secondsToTime } from './helpers.js';

( async () => {

    const dirPath = process.argv[ 2 ];
    // const filenames = fs.readdirSync( dirPath );
    const filenames = await fs.readdir( dirPath );

    console.log( 'filenames length:', filenames.length );

    let min = 10000000;
    let max = 0;

    filenames.forEach( async ( filename, i ) => {

        if ( filename.includes( '.DS_Store' ) ) return;
        if ( i > 5 ) return;

        const filepath = path.join( dirPath, filename )

        const duration = await getAudioDurationInSeconds( filepath )
            // .then( ( duration ) => {

        const time = secondsToTime( duration );

        console.log( filename );
        console.log( i, time, '\n' );

        min = Math.min( min, duration );
        max = Math.max( max, duration );

            // } );

    } );

    console.log( `
    Min length: ${secondsToTime( min )}
    Max length: ${secondsToTime( max )}
    `);

} )()