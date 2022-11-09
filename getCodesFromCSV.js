import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

await main();

async function main() {

    const ARGS = process.argv.slice( 2 );

    if ( ARGS.length < 1 ) {
        // console.log( 'Pass a path to the original csv please.' );
        console.log( 'Pass a path to CSV file please.' );
        process.exit();
    }

    const codes = await getCodesFromCSV( ARGS[ 0 ], 'idStandard' );

    await fs.writeFile( path.join( 'data', 'codes.json' ), JSON.stringify( codes, null, 2 ) )

    return false;

}

async function getCodesFromCSV( csvPath, columnName ) {

    const csv = parse( ( await fs.readFile( csvPath ) ), {
        columns: true
    } )

    // console.log( csv[ 0 ] );

    const codes = csv.map( e => e[ columnName ] );

    return codes;

}

export { getCodesFromCSV };