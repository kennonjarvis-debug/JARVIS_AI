-- Show macOS Notification via Jarvis
-- This script displays a native macOS notification
-- Usage: osascript show-notification.scpt "Title" "Message"

on run argv
    if (count of argv) < 2 then
        display dialog "Usage: osascript show-notification.scpt title message" buttons {"OK"} default button 1
        return
    end if

    set notificationTitle to item 1 of argv
    set notificationMessage to item 2 of argv

    display notification notificationMessage with title notificationTitle sound name "Ping"
end run
