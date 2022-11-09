
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs';


await main();

async function main() {

    const ARGS = process.argv.slice( 2 );
    const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

    outputFormattedCodes();
    // outputVectorJSON();

}

async function outputFormattedCodes() {

    const csvPath = path.join( '..', 'assets', 'data', 'spherePackingBach-codes-2022.csv' );

    const csv = parse( ( await fs.readFile( csvPath ) ), {
        columns: true,
    } );

    const rowCounts = getRowCounts( csv );
    const rowSliceCounts = getRowSliceCounts( csv );

    const counts = {};

    for ( const rowSlice of Object.keys( rowSliceCounts ) ) {
        counts[ rowSlice ] = 0;
    }

    const uidArray = csv.map( e => {

        let id = [
            e.row,
            e.slice,
            '-',
            counts[ e.row + e.slice ],
            '-',
            e.index
        ].join( '' );

        counts[ e.row + e.slice ]++;

        return id;

    } )


    console.log( uidArray );

    function getRowCounts( csv ) {

        const counts = {};

        csv.forEach( e => {

            if ( !counts[ e.row ] )
                  counts[ e.row ] = 0

            counts[ e.row ]++;

        } )

        return counts

    }

    function getRowSliceCounts( csv ) {

        const counts = {};

        csv.forEach( e => {

            if ( !counts[ e.row + e.slice ] )
                  counts[ e.row + e.slice ] = 0

            counts[ e.row + e.slice ]++;

        } )

        return counts

    }

    function pad( num, size ) {
        return ( '000000000' + num ).substring( -size );
    }

}

async function outputVectorJSON() {


    const txtPath = path.join( __dirname, '..', 'models', 'BACH SPHERE 2022_SPEAKERS POINT CLOUD_INCHES.txt' );

    const str = await fs.readFile( txtPath, { encoding: 'utf-8' } );

    const vecArr = str.split( '\r\n' ).map( line => line.split( '\t' ) )
    const lineArr = vecArr.flatMap( num => num );

    console.log( lineArr );

    await fs.writeFile( path.join( __dirname, 'data', 'speakerArray.txt' ), JSON.stringify( lineArr, null, 2 ) );
    await fs.writeFile( path.join( __dirname, 'data', 'speakerVectorArray.txt' ), JSON.stringify( vecArr, null, 2 ) );

}