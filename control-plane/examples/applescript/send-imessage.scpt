-- Send iMessage via Jarvis
-- This script sends an iMessage to a contact
-- Usage: osascript send-imessage.scpt "recipient" "message"

on run argv
    if (count of argv) < 2 then
        display dialog "Usage: osascript send-imessage.scpt recipient message" buttons {"OK"} default button 1
        return
    end if

    set targetBuddy to item 1 of argv
    set messageText to item 2 of argv

    tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set theBuddy to participant targetBuddy of targetService
        send messageText to theBuddy
    end tell

    display notification "Message sent to " & targetBuddy with title "Jarvis iMessage"
end run
