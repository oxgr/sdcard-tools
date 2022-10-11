#! /usr/local/bin/node

// const fs = require( 'fs' );
// const path = require( 'path' );
// const leven = require( 'leven' );

import fs from 'fs/promises';
import path from 'path';
import leven from 'leven';
import readline from 'readline';
import { parseCSV } from './helpers.js'

( async () => {

    const ARGS = process.argv;
    ARGS.splice( 0, 2 );
    console.dir( 'args:', ARGS );

    const CWD = process.cwd();

    console.log( 'cwd:', CWD );

    const csvPath = path.resolve( path.join( CWD, ARGS[ 0 ] ) );
    const songsPath = path.resolve( path.join( CWD, ARGS[ 1 ] ) );

    const csvArr = await parseCSV( csvPath )

    const { found, notFound } = await ( async ( songsPath, csvArr ) => {

        const songFilenames = await fs.readdir( songsPath );
        const found = [];
        const notFound = [];

        // for ( const filename of songFilenames ) {

        songFilenames.forEach( async ( filename, i ) => {

            // Ignore dotfiles ( mostly .DS_STORE );
            if ( filename[ 0 ] == '.' ) return;

            const extension = (/(?:\.([^.]+))?$/).exec( filename )[0];
            const actualName = ( filename.substring( 0, filename.lastIndexOf( '.' ) ) || filename )
                .replace( /^.+?(\ )/, '' );

            let closest = {
                diff: 100,
                name: '',
                code: ''
            };

            csvArr.forEach( ( csvObj, i ) => {
                const diff = leven( actualName, csvObj.name );
                if ( diff < closest.diff ) {
                    closest = {
                        diff: diff,
                        index: i,
                        name: csvObj.name,
                        code: csvObj.code
                    }
                }
            } )

            console.log( i, filename );

            const newName = '00-' + csvArr[ closest.index ].code + '-' + actualName + extension;

            fs.rename(
                path.join( songsPath, filename ),
                path.join( path.dirname( songsPath ), 'spherePackingBach-processed-labelled', newName )
            );
        } )
    // }

    return {
        found,
        notFound
    }

    } )( songsPath, csvArr );

} ) ();

