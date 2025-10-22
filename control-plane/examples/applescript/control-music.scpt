-- Control Music via Jarvis
-- This script controls the Music app
-- Usage: osascript control-music.scpt [play|pause|next|previous|volume]

on run argv
    if (count of argv) < 1 then
        display dialog "Usage: osascript control-music.scpt [play|pause|next|previous|volume]" buttons {"OK"} default button 1
        return
    end if

    set musicCommand to item 1 of argv

    tell application "Music"
        if musicCommand is "play" then
            play
            display notification "Music playing" with title "Jarvis Music"
        else if musicCommand is "pause" then
            pause
            display notification "Music paused" with title "Jarvis Music"
        else if musicCommand is "next" then
            next track
            display notification "Next track" with title "Jarvis Music"
        else if musicCommand is "previous" then
            previous track
            display notification "Previous track" with title "Jarvis Music"
        else if musicCommand is "volume" then
            if (count of argv) > 1 then
                set volumeLevel to item 2 of argv as integer
                set sound volume to volumeLevel
                display notification "Volume set to " & volumeLevel with title "Jarvis Music"
            end if
        else
            display dialog "Unknown command: " & musicCommand buttons {"OK"} default button 1
        end if
    end tell
end run
