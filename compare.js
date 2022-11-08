import fs from 'fs/promises';
import path from 'path';
import leven from 'leven';
import { fileURLToPath } from 'url';

const ARGS = process.argv.slice( 2 );
const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

// let srcPath = ARGS[ 0 ];
// let destPath = ARGS[ 1 ];
let srcPath  = '../assets/spherePackingBach-source-m4a';
let destPath = '../assets/spherePackingBach-processed-mp3';

const srcFiles = await fs.readdir( srcPath );
const destFiles = await fs.readdir( destPath );

console.log( 'srcLength:', srcFiles.length );

const matched = srcFiles.map( file => {

    if ( file[ 0 ] == '.' ) return;

    let lowest = 100;
    let closestMatch = ''
    console.log(file);

    const match = destFiles.find( dFile => {
        
        const dFileName = dFile.slice( 3 );
        const diff = leven( file, dFileName );

        if ( lowest < diff ) {
            lowest = Math.min( lowest, diff );
            closestMatch = dFile;
        }
        console.log( diff );
        return diff == 0 

    })
    console.log(closestMatch);
    process.exit();

    if ( match ) return file;
    else return null;
}).filter( e => e != null );



console.log( 'matched', matched.length );