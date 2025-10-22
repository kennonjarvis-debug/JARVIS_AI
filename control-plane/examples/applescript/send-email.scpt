-- Send Email via Jarvis
-- This script sends an email using Mail.app
-- Usage: osascript send-email.scpt "recipient@email.com" "Subject" "Body"

on run argv
    if (count of argv) < 3 then
        display dialog "Usage: osascript send-email.scpt recipient subject body" buttons {"OK"} default button 1
        return
    end if

    set recipientEmail to item 1 of argv
    set emailSubject to item 2 of argv
    set emailBody to item 3 of argv

    tell application "Mail"
        set newMessage to make new outgoing message with properties {subject:emailSubject, content:emailBody}
        tell newMessage
            make new to recipient with properties {address:recipientEmail}
            send
        end tell
    end tell

    display notification "Email sent to " & recipientEmail with title "Jarvis Mail"
end run
