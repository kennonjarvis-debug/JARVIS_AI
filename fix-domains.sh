#!/bin/bash

# Fix code-optimization-domain.ts clearance levels
sed -i '' 's/Priority\.CRITICAL, 2,/Priority.CRITICAL, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/code-optimization-domain.ts
sed -i '' 's/Priority\.HIGH, 2,/Priority.HIGH, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/code-optimization-domain.ts
sed -i '' 's/Priority\.MEDIUM, 2,/Priority.MEDIUM, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/code-optimization-domain.ts
sed -i '' 's/Priority\.LOW, 2,/Priority.LOW, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/code-optimization-domain.ts

# Fix cost-optimization-domain.ts similarly
sed -i '' 's/Priority\.CRITICAL, 2,/Priority.CRITICAL, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/cost-optimization-domain.ts
sed -i '' 's/Priority\.HIGH, 2,/Priority.HIGH, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/cost-optimization-domain.ts
sed -i '' 's/Priority\.MEDIUM, 2,/Priority.MEDIUM, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/cost-optimization-domain.ts
sed -i '' 's/Priority\.LOW, 2,/Priority.LOW, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/cost-optimization-domain.ts

# Fix system-health-domain.ts similarly
sed -i '' 's/Priority\.CRITICAL, 2,/Priority.CRITICAL, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/system-health-domain.ts
sed -i '' 's/Priority\.HIGH, 2,/Priority.HIGH, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/system-health-domain.ts
sed -i '' 's/Priority\.MEDIUM, 2,/Priority.MEDIUM, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/system-health-domain.ts
sed -i '' 's/Priority\.LOW, 2,/Priority.LOW, ClearanceLevel.MODIFY_SAFE,/g' src/autonomous/domains/system-health-domain.ts

echo "Fixed clearance levels in domain files"
