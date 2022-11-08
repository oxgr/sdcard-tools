import * as fs from 'fs/promises';
import * as fse from 'fs-extra';
import * as path from 'path'
import getMp3Duration from 'get-mp3-duration';
import { float32ToInt16, sleep, secondsToTime } from './helpers.js';
import ora from 'ora';
import { spawn } from 'child_process';
import chalk from 'chalk';

const ARGS = process.argv;
ARGS.splice( 0, 2 );

if ( ARGS.length < 1 ) {
    console.log( 'Pass a path to the directory with songs.' );
    process.exit();
}

const dirPath = ARGS[ 0 ];
const sourceFilepaths = ( await fs.readdir( dirPath ) ).map( name => path.join( dirPath, name ) );

//

// Find longest file
const longestFileSpinner = ora( 'Finding longest file...' ).start();
const longestFile = await findLongestFile( sourceFilepaths );
longestFileSpinner.succeed();
console.log( `
Longest file:
    name: ${chalk.green(longestFile.name)}
    duration: ${chalk.yellow( secondsToTime(longestFile.duration) )}   
`);

process.exit()

//

// Prepare paths
const outputPath = path.resolve( path.join(
    path.dirname( dirPath ),
    path.basename( dirPath ) + '-looped'
    ) )
const tmpPath = path.resolve( path.join(
    path.dirname( dirPath ),
    'tmp'
    ) )
fse.ensureDir( outputPath )

const copySpinner = ora( 'Copying songs to temp...' ).start();
await fse.copy( dirPath, outputPath );
copySpinner.succeed();

const outputFilepaths = sourceFilepaths.map( filepath => path.join( outputPath, path.basename( filepath ) ) );

//

//// Begin main process

// Convert to mp3 here

//

// Loop wav file buffers
const createLoopsSpinner = ora( 'Creating looped songs...' ).start();

( async ( filepaths ) => {
    const promises = [];
    for ( const filepath of filepaths ) {
        if ( isDotFile( path.basename( filepath ) ) ) continue;
        // promises.push( 
            // ffmpegLoop( filepath, tmpPath, longestFile.duration.toString() )
        // )
        await ffmpegLoop( filepath, tmpPath, longestFile.duration.toString() )
        console.log( filepath + '\r' );
    }
    // await Promise.all( promises )
})( outputFilepaths )

createLoopsSpinner.succeed();

//

// Copy tmp
// const moveSpinner = ora( 'Moving to output...' ).start();
// await fse.copy( tmpPath, outputPath );
// moveSpinner.succeed();

// if ( await fse.pathExists( tmpPath ) ) 
// await fse.remove( tmpPath )

// sleep for a second to make sure ffmpeg finishes
await sleep()

async function findLongestFile( filepaths ) {

    // await all promises in parallel
    const filesWithSizes = await Promise.all(

        filepaths.map( ( filepath, index ) => {

            const filename = path.basename( filepath )

            return fs.stat( filepath )
                .then( stat => ( {
                    name: filename,
                    path: filepath,
                    size: stat.size
                } ) )

        } )
    )

    let longestFile = {
        name: '',
        path: '',
        size: 0,
    }

    for ( const fws of filesWithSizes ) {

        if ( fws.size > longestFile.size ) {
            longestFile = fws;
        }
    }

    // longestFile.duration = await getAudioDurationInSeconds( longestFile.path )
    longestFile.duration = getMp3Duration( ( await fs.readFile( longestFile.path ) ) ) * 0.001;

    return longestFile;
}


async function ffmpegRemoveSilence( filepath, tmpPath ) {

    const tmpOutputPath = path.join( tmpPath, path.basename( filepath ) )
    const ffmpeg = spawn( 'ffmpeg', [
        // '-loglevel', '+info',
        // '-nostats',
        // '-loglevel', '0',
        '-stream_loop', '-1',
        '-t', duration,
        '-i', filepath,
        // '-af', 'highpass=f=200,silenceremove=1:0:-50dB',
        '-y',
        // '-c:a', 'libmp3lame',
        '-c', 'copy',
        // '-af', 'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB', //https://stackoverflow.com/questions/65362706/ffmpeg-remove-all-silent-parts-from-audio-file
        '-t', duration,
        tmpOutputPath,
    ] )

    // ffmpeg.stdout.on( 'data', data => console.log( data.toString() ) )
    ffmpeg.stderr.on( 'data', data => console.log( data.toString() ) )

    // Promise resolves when ffmpeg command finishes.
    return new Promise( ( resolve ) => { 
        ffmpeg.on( 'exit', () => { 
            fse.move( tmpOutputPath, filepath, { overwrite: true } )
            resolve
        } )
    } ) ;


}

async function ffmpegLoop( filepath, tmpPath, duration ) {

    const tmpOutputPath = path.join( tmpPath, path.basename( filepath ) )
    const ffmpeg = spawn( 'ffmpeg', [
        // '-loglevel', '+info',
        // '-nostats',
        // '-loglevel', '0',
        '-stream_loop', '-1',
        '-t', duration,
        '-i', filepath,
        // '-af', 'highpass=f=200,silenceremove=1:0:-50dB',
        '-y',
        // '-c:a', 'libmp3lame',
        '-c', 'copy',
        // '-af', 'silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB', //https://stackoverflow.com/questions/65362706/ffmpeg-remove-all-silent-parts-from-audio-file
        '-t', duration,
        tmpOutputPath,
    ] )

    // ffmpeg.stdout.on( 'data', data => console.log( data.toString() ) )
    ffmpeg.stderr.on( 'data', data => console.log( data.toString() ) )

    // Promise resolves when ffmpeg command finishes.
    return new Promise( ( resolve ) => { 
        ffmpeg.on( 'exit', () => { 
            fse.move( tmpOutputPath, filepath, { overwrite: true } )
            resolve
        } )
    } ) ;


}

// Used to detect if a filename is a isDotFilefile 
function isDotFile( filename ) {
    return filename[0] == '.';
}