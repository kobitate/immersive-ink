# Immersive Ink - Smart Lighting Sync for Splatoon 3

[![wakatime](https://wakatime.com/badge/github/kobitate/immersive-ink.svg?style=flat-square)](https://wakatime.com/badge/github/kobitate/immersive-ink) [![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-5e0c73.svg?style=flat-square)](code_of_conduct.md)

Sync your smart lights with the current team colors on Splatoon 3! Requires a
Capture Card to gather information from the game screen. Lights are controlled 
via Home Assistant. Works best on macOS (see [Compatibility Note](#compatibility-note))

https://github.com/kobitate/immersive-ink/assets/2555575/09dc60ae-8d8f-45c7-a99a-8928edf42077

https://github.com/kobitate/immersive-ink/assets/2555575/1cd07559-8a38-4357-b3d8-56e085a937e6

Examples above are recorded with version 1.0.0, aka the Proof of Concept version.
I'm hoping to improve speed and add more features. See [issues page](https://github.com/kobitate/immersive-ink/issues) 
for planned fixes and features.

## Compatibility Note

**This app runs best on macOS** - The library this repo uses to access the 
system's cameras supports Mac, Linux, and Windows; however, I attempted to 
run this script from my Windows media center PC and found the app kept 
crashing. I suspect the executable that is acting as the middleman between 
Node and the system isn't really meant to run every second or so. Through 
much tweaking, I found Windows simply didn't work. I'd like to rewrite this,
maybe as a browser app instead, for better webcam access. 
