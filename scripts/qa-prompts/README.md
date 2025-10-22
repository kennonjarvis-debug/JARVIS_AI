# Jarvis v2 QA - Phase 1 Parallel Testing Prompts

This directory contains ready-to-use prompts for running Phase 1 QA tests in parallel across 5 Claude Code instances.

## 🚀 Quick Start

### Prerequisites
- Setup phase complete (infrastructure ready)
- 5 terminal windows/tabs available
- Clean git working directory

### Execution Steps

1. **Open 5 Terminal Windows**
   ```bash
   # Terminal 1 - Claude A (Security)
   cd /Users/benkennon/Jarvis && claude code

   # Terminal 2 - Claude B (Agents)
   cd /Users/benkennon/Jarvis && claude code

   # Terminal 3 - Claude C (Memory)
   cd /Users/benkennon/Jarvis && claude code

   # Terminal 4 - Claude D (Analytics)
   cd /Users/benkennon/Jarvis && claude code

   # Terminal 5 - Claude E (AI)
   cd /Users/benkennon/Jarvis && claude code
   ```

2. **Copy-Paste Prompts**
   - Terminal 1: Copy contents of `phase1-claude-a.txt` and paste
   - Terminal 2: Copy contents of `phase1-claude-b.txt` and paste
   - Terminal 3: Copy contents of `phase1-claude-c.txt` and paste
   - Terminal 4: Copy contents of `phase1-claude-d.txt` and paste
   - Terminal 5: Copy contents of `phase1-claude-e.txt` and paste

3. **Wait for Completion**
   - All 5 instances will run in parallel
   - Expected duration: 10-15 minutes
   - Watch for PR creation messages

4. **Verify Success**
   ```bash
   # Check for PRs
   gh pr list --label qa-automated

   # Check progress log
   cat /Users/benkennon/Jarvis/docs/QA_PROGRESS.log
   ```

## 📁 Files

| File | Agent | Focus Area | Duration |
|------|-------|------------|----------|
| `phase1-claude-a.txt` | Claude A | Security & Firewall | ~10-15 min |
| `phase1-claude-b.txt` | Claude B | Domain Agents | ~10-15 min |
| `phase1-claude-c.txt` | Claude C | Memory Layer | ~10-15 min |
| `phase1-claude-d.txt` | Claude D | Analytics | ~10-15 min |
| `phase1-claude-e.txt` | Claude E | AI Integrations | ~10-15 min |

## ⚠️ Important Notes

- **Run in Parallel**: All 5 can run simultaneously - no dependencies
- **Isolated Resources**: Each uses separate DB, Redis, ports (no conflicts)
- **Auto-Fix Enabled**: Safe-level fixes only (test files, mocks)
- **PR Creation**: Each creates its own PR automatically
- **Error Threshold**: Stops if >30% error rate

## 🔍 Monitoring Progress

Each Claude will:
1. Acquire its lock file (`/tmp/qa-lock-[a-e]`)
2. Create test branch
3. Write tests
4. Run tests
5. Auto-fix failures (if safe)
6. Commit changes
7. Update progress log
8. Create PR
9. Release lock

Check locks:
```bash
ls -la /tmp/qa-lock-*
```

View logs:
```bash
tail -f /Users/benkennon/Jarvis/logs/qa/claude-a/progress.log
tail -f /Users/benkennon/Jarvis/logs/qa/claude-b/progress.log
# ... etc
```

## ✅ Success Criteria

Phase 1 complete when:
- [ ] 5 PRs created
- [ ] No critical errors
- [ ] Progress log updated by all agents
- [ ] All locks released

## 🔄 Next Steps

After Phase 1 completes:
1. Review created PRs
2. Proceed to Phase 2 (Sequential Integration Tests)
3. Follow Phase 2 execution guide

## 🆘 Troubleshooting

**If an instance gets stuck:**
```bash
# Remove lock
rm /tmp/qa-lock-[a-e]

# Restart that specific instance
```

**If tests fail:**
- Check the specific agent's log directory
- Review the created test files
- Safe-level issues should auto-fix
- Critical issues require manual review

**If conflicts occur:**
- Shouldn't happen (isolated resources)
- But if they do, check port/DB usage:
  ```bash
  lsof -i :5000-5499
  redis-cli -n 1 PING
  ```

---

**Ready to run?** Open 5 terminals, start `claude code` in each, and paste the respective prompts!
