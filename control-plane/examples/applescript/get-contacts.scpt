-- Get Contacts via Jarvis
-- This script retrieves contacts from the Contacts app
-- Usage: osascript get-contacts.scpt "search query"

on run argv
    set searchQuery to ""
    if (count of argv) > 0 then
        set searchQuery to item 1 of argv
    end if

    tell application "Contacts"
        if searchQuery is "" then
            set peopleList to every person
        else
            set peopleList to every person whose name contains searchQuery
        end if

        set contactsText to ""
        repeat with aPerson in peopleList
            set personName to name of aPerson
            set contactsText to contactsText & personName & return
        end repeat

        return contactsText
    end tell
end run
