

import * as path from 'path';
import * as fs from 'fs/promises';
import * as fse from 'fs-extra';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import drivelist from 'drivelist';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';
import notifier from 'node-notifier'
import { parseCSV, secondsToTime, sleep } from './helpers.js'
import { log } from 'console';

const Model = await setup();
await main( Model );

/*********************************/

async function setup() {

    const ARGS = process.argv.slice( 2 );
    const CWD = process.cwd();

    if ( ARGS.length < 1 ) {
        printGuide();
        process.exit();
    }

    const COMMAND = ARGS[ 0 ].trim();

    const commands = [
        'init',
        'upload',
        'progress',
        'mount',
        'unmount',
        'list',
        'monitor',
    ]

    if ( !commands.some( e => e == COMMAND ) ) {

        console.log( `\n    Command not recognized.` );
        printGuide();
        process.exit();

    }

    const __dirname = path.dirname( fileURLToPath( import.meta.url ) );

    const CONFIG_PATH = path.join( __dirname, 'data', 'config.json' )
    const PROGRESS_PATH = path.join( __dirname, 'data', 'progress.json' )
    const SONGS_PATH = path.join( __dirname, 'data', 'songs.json' )
    const CODES_PATH = path.join( __dirname, 'data', 'codes.json' )

    await fse.ensureFile( CONFIG_PATH );
    await fse.ensureFile( PROGRESS_PATH );
    await fse.ensureFile( SONGS_PATH );

    if ( COMMAND == 'init' ) {
        await init( {
            CONFIG_PATH: CONFIG_PATH,
            PROGRESS_PATH: PROGRESS_PATH,
            SONGS_PATH: SONGS_PATH,
            CODES_PATH: CODES_PATH,
        } );

        console.log( chalk.bold.blue( 'Init done.' ) );
        process.exit();
    }

    const { ASSIGNED_PATH, EXTRAS_PATH } = await getConfig( CONFIG_PATH );

    const progress = await getProgress( PROGRESS_PATH );
    const extras = await getExtras( EXTRAS_PATH )
    const songs = await getSongs( SONGS_PATH )

    const PASSWORD = await getPermissions();

    return {
        PASSWORD: PASSWORD,
        ARGS: ARGS,
        COMMAND: COMMAND,
        PROGRESS_PATH,
        extras: extras,
        progress: progress,
        songs: songs,
    }

}

async function main( Model ) {

    const {
        ARGS,
        COMMAND,
        PROGRESS_PATH,
        extras,
        progress,
        songs,
    } = Model

    if ( COMMAND == 'progress' ) {
        console.log( `
        ${chalk.bold( 'Uploaded: ' )} ${chalk.yellow( progress.length )}
        ${chalk.bold( 'Remaining:' )} ${chalk.yellow( songs.length - progress.length )}
        ${chalk.bold( 'Total:    ' )} ${chalk.yellow( songs.length )}
        `);
        process.exit();
    }

    if ( COMMAND == 'monitor' ) {

        await monitorDrives();
        process.exit();

    }

    // Get list of drives mounted on USB buses.
    let drives = await getDrives();

    if ( drives.length == 0 ) {
        console.log( chalk.bold.yellow( 'Notice:' ), 'No drives detected!' );
        process.exit();
    }

    if ( COMMAND == 'unmount' ) {
        await unmountAll( drives );
        process.exit();
    }

    await mountAll( drives );

    // Update drives with new mountpoints.
    drives = await getDrives();

    console.log( 'Number of drives:', chalk.yellow( drives.length ), '\n' );

    if ( COMMAND == 'list' ) {
        drives.forEach( drive => console.log( chalk.green( ( drive.mountpoints[ 0 ].label ) ) ) )
        process.exit();
    }


    // Pipeline for each drive. Await each command so they happen synchronously.

    const startTime = performance.now();

    const driveSongPairs = drives.map( drive => ( {
        drive: drive,
        song: getNewSong( songs, progress )
    } ) )

    const emptyProcessSpinner = ora( 'Emptying...' ).start();
    await parallelProcess( drives, emptyDrive );
    emptyProcessSpinner.succeed( 'Emptied' );


    //

    let driveCount = 0;
    const totalDrives = drives.length;
    const copyMessage = 'Copying contents to drives... ';
    const copyProcessSpinner = ora( copyMessage + `[${chalk.yellow( driveCount )}/${totalDrives}]` )
    copyProcessSpinner.start();

    // "Parallel processing" or moreso async i/o commands are at least 2x slower than just awaiting one copy command at a time.
    // At most, we can use fs-extra.copy() to copy whole directories.
    // Leaving code below for reference.

    // await parallelProcess( driveSongPairs, async ( pair ) => {
    //     const { drive, song } = pair;
    //     return copyContents( drive, song, extras )

    //     // await renameDrive( drive, song.code );

    //     // const iOfLength = `${completionCount++}/${drives.length}`;
    //     // const spinnerText = `[${chalk.bold( iOfLength )}] ${chalk.green( song.code )}\b`;
    //     // const spinner = ora( spinnerText );

    //     // driveProcessSpinner.clear();
    //     // spinner.succeed();
    // } )

    for ( const pair of driveSongPairs ) {
        const { drive, song } = pair;
        await copyContents( drive, song, extras );
        copyProcessSpinner.text = copyMessage + `[${chalk.yellow( ++driveCount )}/${totalDrives}]`;
    }

    copyProcessSpinner.succeed( 'Copied ' + `${chalk.green( `[${driveCount}/${totalDrives}]` )}` );

    //

    const renameProcessSpinner = ora( 'Renaming...' ).start();

    await parallelProcess( driveSongPairs, async ( pair ) => {
        const { drive, song } = pair;
        return renameDrive( drive, song.code )
    } );

    renameProcessSpinner.succeed( 'Renamed' );

    //

    await unmountAll( drives )

    await updateProgress( PROGRESS_PATH, progress )

    const totalTime = secondsToTime( ( ( performance.now() - startTime ) * 0.001 ).toFixed( 2 ) );
    console.log( 'Total time:', totalTime );

    // // Wait for a bit to ensure previous commands close.
    // await sleep();

    // const growl = new notifier.Growl();

    notifier.notify(
        // growl.notify(
        {
            title: 'SD Card Uploader',
            message: 'Batch finished uploading!',
            sound: true, // Only Notification Center or Windows Toasters
            wait: true, // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait or notify-send as it does not support the wait option
            // timeout: 1,
            // sticky: true
        }
    );

    return false;

}

/*********************************/

function printGuide() {

    console.log( `
    Run the script with 
        - ${chalk.bold( 'init' )} to start batch, or;
        - ${chalk.bold( 'upload' )} to upload to SD cards.
    ` );

}

async function init( paths ) {

    const { CONFIG_PATH, PROGRESS_PATH, SONGS_PATH, CODES_PATH } = paths;

    // console.log( chalk.bold.blue( 'Start init' ) );  

    const promptArray = [
        {
            type: 'text',
            name: 'ASSIGNED_PATH',
            message: 'Path to the assigned folder?',
            initial: path.join( '.', 'assigned' )
        },
        {
            type: 'text',
            name: 'EXTRAS_PATH',
            message: 'Path to the extra folder?',
            initial: path.join( '.', 'extra' )
        },
        {
            type: 'confirm',
            name: 'eraseProgress',
            message: 'Erase previous progress?',
            initial: true
        }
    ]

    const response = await prompts( promptArray );

    if ( Object.values( response ).length != promptArray.length ) {
        console.error( chalk.bold.yellow( 'Notice:' ), 'Did not finish submitting inputs.' );
        process.exit();
    }

    let config = {
        ASSIGNED_PATH: path.resolve( response.ASSIGNED_PATH ),
        EXTRAS_PATH: path.resolve( response.EXTRAS_PATH )
    };

    await fs.writeFile( CONFIG_PATH, JSON.stringify( config, null, 2 ) );

    if ( !!response.eraseProgress ) await fs.writeFile( PROGRESS_PATH, '[]' );

    const availableCodes = await parseCodes( CODES_PATH )
    const availableSongs = await parseSongDirectory( config.ASSIGNED_PATH, { includePath: true } )

    const songsJSON = combineSongCodes( availableSongs, availableCodes );
    await fse.outputFile( SONGS_PATH, JSON.stringify( songsJSON, null, 2 ) );

}

async function getPermissions() {

    // const sudoEcho = spawn( 'sudo', [ '-S', '-k', 'echo' ] );
    // return processSpawnInstance( sudoEcho );

    const promptArray = [
        {
            type: 'invisible',
            name: 'password',
            message: 'Password:',
        }
    ]

    const response = await prompts( promptArray )

    if ( Object.values( response ).length != promptArray.length ) {
        console.error( chalk.bold.yellow( 'Notice:' ), 'Did not finish submitting inputs.' );
        process.exit();
    }

    return response.password + '\n';

}

async function getConfig( CONFIG_PATH ) {

    let config;

    try {
        config = JSON.parse( await fs.readFile( CONFIG_PATH ) )
    } catch ( err ) {
        if ( COMMAND == 'init' ) return null;
        console.log( `
        ${chalk.bold.red( 'Error:' )} The config.json file could not be read.
        Check its validity or run with ${chalk.bold( 'init' )} to start over.` );
        process.exit();
    }

    return config;

}

async function getProgress( PROGRESS_PATH ) {

    let progress;

    try {
        // progress = ( await fs.readFile( PROGRESS_PATH, { encoding: 'utf-8' } ) ).split( '\n' );
        progress = JSON.parse( await fs.readFile( PROGRESS_PATH ) )
    } catch ( err ) {
        console.log( `
        ${chalk.bold.red( 'Error:' )} The progress.json file could not be read.
        Check its validity or run with ${chalk.bold( 'init' )} to start over.` );
        process.exit();
    }

    return progress;

}

async function getSongs( SONGS_PATH ) {

    let songsWithCodes;

    try {
        songsWithCodes = JSON.parse( await fs.readFile( SONGS_PATH ) )
    } catch ( err ) {
        console.log( chalk.bold.red( 'Error: ' ) + 'Is the songs.json file valid?' );
        process.exit();
    }

    return songsWithCodes;

}

async function getExtras( EXTRAS_PATH ) {

    const filenames = await fs.readdir( EXTRAS_PATH )

    return filenames.map( filename => ( {
        name: filename,
        path: path.join( EXTRAS_PATH, filename )
    } ) )

}

function getNewSong( songs, progress ) {

    // Find a code from the code bank that hasn't been uploaded i.e. in progress array
    const newSongIndex = songs.findIndex( song => !progress.some( uploaded => uploaded == song.code ) );

    if ( newSongIndex == -1 ) {
        console.log( `
        ${chalk.bold.red( 'Error:' )} Could not find a new song.
        Songs uploaded: ${progress.length}
        ` );
        process.exit();
    }

    progress.push( songs[ newSongIndex ].code );

    return songs[ newSongIndex ];
}

async function parseCodes ( CODES_PATH ) {

    const codes = JSON.parse( await fs.readFile( CODES_PATH ) );

    return codes;
    
}

async function parseSongDirectory( dirPath, options = { includePath: true } ) {

    const { includePath } = options;

    const filenames = await fs.readdir( dirPath );
    

    const songs = filenames.map( ( filename, i ) => {

        if ( filename[ 0 ] == '.' ) return;

        const name = (
            filename.slice( 0, 3 ) == '00-' ?
            filename.slice( 3 ) : // Remove '00-'
            filename
        )
        // .match( /( [A-Z]).+$/m )[ 0 ]   // Match first capital letter with a space before it.
        // .trim()                         // Remove the space
        .replace( /\.[^/.]+$/, '' );    // Remove file extension


        let result = {
            name: name,
        }

        if ( !!includePath ) {
            result = {
                ...result,
                path: path.join( dirPath, filename )
            }
        }

        // For debugging
        // console.log( result );
        // if ( i == 5 ) process.exit();

        return result;

    } ).filter( e => e != null );

    return songs;

}

function combineSongCodes( songs, codes ) {

    let extraCount = 0;

    return songs.map( song => {

        // const code = processedName.split( ' ' )[ 0 ];   // Split at first space
        const code = codes.length > 0 ? codes.splice( 0, 1 )[ 0 ] : `XXX-${extraCount++}`;   // Use given array of codes

        return {
            ...song,
            code: code
        }

    })

}

async function getDrives() {
    return ( await drivelist.list() )
        .filter( ( drive ) => drive.busType === 'USB' )
}

async function mountDrive( drive ) {

    const diskutilMount = spawn( 'sudo', [ '-S', '-k', 'diskutil', 'mount', `${drive.device}s1` ] );
    // const diskutilMount = spawnSync( 'sudo', [ '-S', '-k', 'diskutil', 'mount', `${drive.device}s1` ] );

    return processSpawnInstance( diskutilMount );
    return diskutilMount;

}

async function emptyDrive( drive ) {

    const drivePath = drive.mountpoints[ 0 ].path;

    // const rmrf = spawn( 'sudo', [ '-S', '-k', 'diskutil', 'eraseDisk', `${drive.device}s1` ] );
    // const rmrf = spawn( 'sudo', [ '-S', '-k', 
    //     'rm', '-rf', 
    //     path.join( drivePath, '*' )
    // ] );
    // return processSpawnInstance( rmrf )

    try {
        await fse.emptyDir( drivePath );
    } catch ( err ) {
        if ( err.code == 'EPERM' ) return false;
        return true;
    }

    return false;

}

async function copyContents( drive, song, extras ) {

    // return Promise.all( [ 
    //     new Promise( resolve => resolve() ),
    //     new Promise( resolve => resolve() )
    // ] );
    const drivePath = drive.mountpoints[ 0 ].path;

    // const cpPromises = Array( extras.length + 1 ).map( ( e, i ) => {

    //     let src;

    //     if ( i == 0 ) {
    //         src = song.path
    //     } else {
    //         src = extras[ i - 1 ].path
    //     }

    //     const dest = path.join( drivePath, path.basename( src ) )
    //     const cp = spawn( 'sudo', [ '-S', '-k', 'cp', src, dest ] )
    //     return processSpawnInstance( cp, { silent: false } );
    // } )


    const songCopy = await fse.copy( song.path, path.join( drivePath, path.basename( song.path ) ) );
    // const extrasCopy = await Promise.all( 
    //     extras.map( extra => fse.copy( extra.path, path.join( drivePath, path.basename( extra.path ) ) ) )
    // );
    for ( const extra of extras ) {
        await fse.copy( extra.path, path.join( drivePath, path.basename( extra.path ) ) );
    }

    // const cpPromises = [
    //     songCopy,
    //     ...extrasCopy
    // ]

    // return Promise.all( cpPromises );
    return;

}

async function renameDrive( drive, newName ) {

    const oldName = drive.mountpoints[ 0 ].label;

    const diskutilRename = spawn( 'sudo', [ '-S', '-k', 'diskutil', 'rename', oldName, newName ] )

    return processSpawnInstance( diskutilRename );

}

async function unmountDrive( drive ) {

    const diskutilUnmount = spawn( 'sudo', [ '-S', '-k', 'diskutil', 'unmount', `${drive.device}s1` ] );

    return processSpawnInstance( diskutilUnmount );

}

async function mountAll( drives ) {
    const spinner = ora( 'Mounting drives...' );
    await parallelProcess( drives, mountDrive );
    spinner.succeed( 'Drives mounted.' );
    return false;
}

async function unmountAll( drives ) {
    const spinner = ora( 'Unmounting drives...' ).start();
    await parallelProcess( drives, unmountDrive );
    spinner.succeed( 'Drives unmounted.' );
    return false;
}

async function monitorDrives() {

    return new Promise( async resolve => {

        const spinner = ora( 'Monitoring for new drives...' ).start();

        let prevCount = 0,
            oldDrives = [],
            drives = await getDrives();

        setInterval( async () => {

            drives = ( await getDrives() ).map( drive => ( { device: drive.device, label: drive.mountpoints.length > 0 ? drive.mountpoints[ 0 ].label : undefined } ) );

            // // Unmounted drives
            // const unmountedDrives = drives.filter( drive => drive.mountpoints.length == 0 )
            // if ( unmountedDrives.length > 0 ) {
            //     for ( const unmountedDrive of unmountedDrives ) {
            //         ora().warn( `${chalk.bold( unmountedDrive.device )}: ${chalk.yellow('Unmounted')}` )
            //     }
            // }

            // New drives
            if ( drives.length > prevCount ) {
                const newDrives = drives.filter( drive => !oldDrives.some( oldDrive => oldDrive.device == drive.device ) );
                for ( const newDrive of newDrives ) {
                    await mountDrive( newDrive );
                    spinner.clear();
                    if ( newDrive.label )
                        ora().succeed( `${chalk.bold( newDrive.device )}: ${chalk.green( newDrive.label )}` )
                    else
                        ora().warn( `${chalk.bold( newDrive.device )}: ${chalk.yellow( '<unknown>' )}` )
                }
                // oldDrives = [ ...drives ];
                // prevCount = drives.length
            }

            // Removed drives
            if ( drives.length < prevCount ) {
                const removedDrives = oldDrives.filter( oldDrive => !drives.some( drive => drive.device == oldDrive.device ) );
                for ( const removedDrive of removedDrives ) {
                    spinner.clear();
                    if ( removedDrive.label )
                        ora().fail( `${chalk.bold( removedDrive.device )}: ${chalk.red( removedDrive.label )}` )
                    else
                        ora().fail( `${chalk.bold( removedDrive.device )}: ${chalk.red( '<unknown>' )}` )

                }
                // oldDrives = [ ...drives ];
                // prevCount = drives.length
            }

            // Only update drives if there are none with no labels i.e. unmounted
            if ( !drives.some( drive => !drive.label ) ) {
                oldDrives = [ ...drives ];
                prevCount = drives.length
            }

        }, 500 )

    } )
}

async function updateProgress( PROGRESS_PATH, progress ) {

    return fs.writeFile( PROGRESS_PATH, JSON.stringify( progress, null, 2 ) )

}

// NodeJS `spawn` creates a shell that runs the command asynchronously from the main thread.
// This is simple processing to print output to console and return a Promise so the command's timeline can be handled here.
function processSpawnInstance( spawnInstance, options = { silent: true } ) {

    const { silent } = options;

    spawnInstance.stdin.write( Buffer.from( Model.PASSWORD ) );
    if ( !silent ) spawnInstance.stdout.on( 'data', ( data ) => console.log( '\r' + data.toString().trim() ) )
    spawnInstance.stderr.on( 'data', ( data ) => {
        const str = data.toString();
        // Silence password prompt since we got it from our own prompt in getPermissions();
        if ( str != 'Password:' )
            console.log( '\n', chalk.bold.red( 'Error:' ), str )
    } )
    return new Promise( resolve => spawnInstance.on( 'exit', resolve ) )
}

/**
 * Takes an async function as an argument as runs it for every element in the array.
 * Returns a promise that resolves when all the functions are finished.
 **/
async function parallelProcess( array, fn ) {

    return Promise.all( array.map( async e => fn( e ) ) )

}
