```
 ____  ____     ___   __   ____  ____    ____  __    __   __    ____ 
/ ___)(    \   / __) / _\ (  _ \(    \  (_  _)/  \  /  \ (  )  / ___)
\___ \ ) D (  ( (__ /    \ )   / ) D (    )( (  O )(  O )/ (_/\\___ \
(____/(____/   \___)\_/\_/(__\_)(____/   (__) \__/  \__/ \____/(____/
```
A compilation of tools to interface with SD Cards for Sphere Packing and other relevant sound array artworks by Rafael Lozano-Hemmer.

# Synopsis
```
npm run <command>

Commands:

init        Initiate a new group of SD cards. You will be prompted for paths to source files.
upload      Upload to a batch of (16) SD cards.
monitor     Run a monitor that watches for newly mounted drives. Useful for ensuring SD cards are not corrupted.
progress    Print the number of uploaded, remaining, and total cards.
list        Mounts and lists all available drives.

```
# Requirements
- [Node.js](https://nodejs.org/en/) v14+.

# Usage
1. Clone this repository, then run `npm install` to install dependencies. 
2. Prepare source files.
   - If source files are not in .mp3 format, convert them using a third-party batch processing program since the GUI is useful. **Twisted Wave** is a good option.
3. If the files need to be looped to the length of the longest file, run `npm run mp3`.


*By Faadhi Fauzi for Antimodular Research, Oct 2022*