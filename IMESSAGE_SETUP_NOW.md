# 🚀 iMessage Setup - Let's Connect Your Messages NOW!

## ✅ Status Check
- ✅ iMessage database found: `/Users/benkennon/Library/Messages/chat.db`
- ❌ **NEEDS PERMISSION:** Terminal cannot access the database yet

---

## 📋 Step 1: Grant Full Disk Access (Required)

**Your terminal needs permission to read your iMessage database.**

### 🔧 How to Grant Access:

1. **Open System Settings** (or System Preferences on older macOS)
   ```bash
   # Run this command to open System Settings:
   open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"
   ```

2. **Navigate to Privacy & Security**
   - Click **"Privacy & Security"** in the sidebar
   - Scroll down and click **"Full Disk Access"**

3. **Add Your Terminal App**

   You're using one of these terminal apps:
   - **Terminal.app** → Located at `/Applications/Utilities/Terminal.app`
   - **iTerm.app** → Located at `/Applications/iTerm.app`
   - **Warp** → Located at `/Applications/Warp.app`
   - **VS Code Terminal** → Located at `/Applications/Visual Studio Code.app`

   **To add it:**
   - Click the **"+"** button
   - Navigate to **Applications** (or **Applications/Utilities**)
   - Select your terminal app
   - Click **Open**
   - Toggle the switch **ON** (it should turn blue/green)

4. **⚠️ RESTART YOUR TERMINAL**
   - **IMPORTANT:** Quit and reopen your terminal app completely
   - Just opening a new tab won't work!

---

## 📱 Step 2: Get Your Phone Number

**What's your phone number or Apple ID email?**

We need this to:
- Add you as an allowed contact
- Enable auto-responses for your messages
- Test the integration

Examples:
- `+1234567890` (with country code)
- `your-apple-id@icloud.com`

---

## 🎯 Step 3: After Granting Access

Once you've granted Full Disk Access and restarted your terminal, run:

```bash
# 1. Test database access
npm run imessage test

# 2. Add yourself as allowed contact
npm run imessage allow "+YOUR-PHONE-NUMBER"

# 3. Start monitoring
npm run imessage start

# 4. Check status
npm run imessage status

# 5. View on dashboard
# Open: http://localhost:5175/imessage
```

---

## 🧪 Step 4: Test It!

1. **Send yourself a message from your iPhone**
   - Open Messages on your iPhone
   - Send a message to your own number
   - It will appear on your Mac

2. **Watch it on the dashboard**
   - Open http://localhost:5175/imessage
   - You'll see the message appear in real-time!
   - Watch Jarvis automatically respond!

---

## 🆘 Troubleshooting

### Still getting "authorization denied"?
- ✅ Did you grant Full Disk Access?
- ✅ Did you **fully quit and restart** your terminal?
- ✅ Is the correct terminal app added? (not just Terminal if you use iTerm, etc.)

### Messages not appearing?
- Check if Messages.app is running
- Try: `npm run imessage recent` to see recent messages
- Check dashboard: http://localhost:5175/imessage

### Want to stop monitoring?
```bash
npm run imessage stop
# Or use the Stop button on the dashboard
```

---

## 🎉 What Happens Next?

Once connected:
1. ✅ Your iMessages sync to Jarvis dashboard in real-time
2. ✅ Jarvis auto-responds to allowed contacts (like you!)
3. ✅ All messages are redacted for privacy (credit cards, SSNs, etc.)
4. ✅ Smart routing: Support questions → Auto-respond
5. ✅ High-risk messages → Request your approval
6. ✅ Full conversation history maintained

---

**Let me know once you've granted Full Disk Access and restarted your terminal!**

Then tell me your phone number and I'll set you up! 📱
