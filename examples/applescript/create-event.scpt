-- Create Calendar Event via Jarvis
-- This script creates a calendar event
-- Usage: osascript create-event.scpt "Event Title" "2024-12-25 10:00:00"

on run argv
    if (count of argv) < 2 then
        display dialog "Usage: osascript create-event.scpt title startDate" buttons {"OK"} default button 1
        return
    end if

    set eventTitle to item 1 of argv
    set startDateStr to item 2 of argv

    -- Parse date
    set startDate to date startDateStr
    set endDate to startDate + (1 * hours)

    tell application "Calendar"
        tell calendar "Calendar"
            make new event with properties {summary:eventTitle, start date:startDate, end date:endDate, location:"", description:"Created by Jarvis"}
        end tell
    end tell

    display notification "Event created: " & eventTitle with title "Jarvis Calendar"
end run
