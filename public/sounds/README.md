# Keystroke samples

Drop WAV files here to use real recordings for the studio's typing sounds.

If any of these exist, they are used. Otherwise hak falls back to a
synthesised click (OfflineAudioContext, noise burst + low thud) that
sounds like a mechanical keyboard.

## Expected filenames

    click-01.wav        (variants 01..08 are used at random, e.g. different keys)
    click-02.wav
    ...
    click-08.wav
    space.wav           (played for the space character)
    enter.wav           (played for \n)
    backspace.wav       (played for \b)

Only `click-NN.wav` is required for a custom kit. The others fall back
individually to `click-01.wav` if missing.

## Format

- WAV, PCM 16-bit
- Mono preferred, stereo OK
- 22050 Hz or 44100 Hz
- 40-200 ms in length, no leading silence
- Normalised to about -6 dBFS (not clipping)

Trim silence at the start and end. A key click with 30 ms of room tone
in front will sound laggy in the final export.

## Where to get CC0 samples

Search these sources and filter to CC0 / public domain:

- freesound.org      (filter: License = Creative Commons 0)
- freemusicarchive.org  (filter: CC0)
- Wikimedia Commons  (public-domain recordings)
- opsound.org        (mostly CC-BY-SA / public domain)

Popular search terms: "mechanical keyboard", "cherry mx blue",
"keyboard click", "typewriter key".

Check the individual file's license before shipping commercially. The
filename pattern above is what hak looks for; the license itself is on
you.
