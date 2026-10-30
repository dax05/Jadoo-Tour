Task: Reconstruct Git History Using Feature-Wise Branching and PR Workflow

You are acting as a Senior Git Engineer and Release Manager.

I have already developed my entire project, but I have NOT committed my changes to Git yet.

I want to organize the existing uncommitted work into a professional, clean, feature-wise Git history, following industry-standard Git branching and Pull Request practices.

Your first responsibility is to thoroughly analyze the project and create a detailed execution plan.

IMPORTANT: THIS IS A PLANNING-ONLY TASK. DO NOT EXECUTE ANY GIT WRITE OPERATIONS.

1. NON-NEGOTIABLE SAFETY RULES

During this entire task:

DO NOT create any Git branches.
DO NOT create any commits.
DO NOT push anything to GitHub.
DO NOT merge any branches.
DO NOT create or submit any Pull Requests.
DO NOT switch branches.
DO NOT reset, rebase, cherry-pick, stash, or clean the repository.
DO NOT discard, overwrite, or modify existing project code.
DO NOT modify existing Git history.
DO NOT run destructive Git commands.
DO NOT change the current working tree.

You are ONLY allowed to inspect the repository and create ONE planning document.

You may use read-only Git commands such as:

bash
git status
git branch -a
git log --oneline --all
git remote -v
git diff
git diff --stat
git diff --cached
git ls-files
git status --short


You may inspect source files, folder structures, package files, configuration files, and existing documentation.

Do not expose secrets, API keys, passwords, JWT secrets, database credentials, or tokens in your plan. Refer to sensitive files by name without copying their contents.

If you discover that any changes are already committed, preserve them and report them. Do not rewrite existing history.

2. PHASE A: COMPLETE PROJECT AUDIT

Before proposing commits, understand the entire project.

Inspect:

Complete folder and file structure.
Existing Git branches and remote repositories.
Current branch.
Current Git status.
All tracked modified files.
All untracked files.
Staged and unstaged changes.
Existing application architecture.
Frontend features.
Backend features.
Authentication and authorization.
Database configuration and schema.
API routes and controllers.
Validation logic.
Error handling.
Testing infrastructure.
Existing documentation.

Read the actual source code instead of guessing features from filenames.

Identify all logically independent features and bug fixes.

For example:

Login UI
Registration UI
Authentication API
JWT middleware
User profile
Destination listing
Destination filtering
Booking functionality
Wishlist functionality
Testimonials
Newsletter subscriptions
Database initialization
Backend configuration
Responsive design
Form validation
Error handling
Bug fixes
Documentation

These are examples only. Include features only if they actually exist in my project.

3. PHASE B: FEATURE-WISE CHANGE ANALYSIS

This is the most important part.

I want my existing large uncommitted changes divided into meaningful, small commits.

For every modified file:

Inspect the complete diff.
Identify which feature each change belongs to.
Separate unrelated changes.
Identify logical dependencies between changes.
Identify whether a file contains changes belonging to multiple features.
Identify changes that must be committed together to keep the application working.
Identify bug fixes separately from feature development.

Do not divide changes based purely on line counts.

A 500-line file may need to be divided into multiple commits if different sections implement independent features.

However, keep logically connected changes together, even if a commit contains many lines.

For every proposed commit, document:

Feature name.
Commit type: feat, fix, refactor, docs, test, chore, or style.
Files involved.
Exact changes to include.
Purpose of the commit.
Dependencies.
Suggested commit message.
Whether the changes can safely be committed independently.

Use Conventional Commits formatting.

Examples:

text
feat(login): add initial login UI and validation
feat(auth): implement JWT authentication
feat(booking): add trip reservation functionality
fix(login): correct name field validation
fix(auth): handle expired JWT tokens
refactor(database): improve connection pooling
test(auth): add login integration tests
docs(readme): update project setup instructions


Do not invent changes that do not exist.

4. PHASE C: DESIGN THE BRANCHING STRATEGY

My required branching strategy is:

The dev branch is the integration branch. The main branch must NEVER receive direct merges from feature or fix branches.

Every feature must have its own branch.

Branch naming conventions:

Feature branches:

text
feat-login
feat-registration
feat-authentication
feat-user-profile
feat-destinations
feat-booking
feat-wishlist


Bug-fix branches:

text
fix-login-validation
fix-auth-token
fix-booking-calculation
fix-destination-filter


Other branches when appropriate:

text
refactor-database
test-authentication
docs-project-setup
chore-dependencies


Use descriptive, lowercase, hyphen-separated names.

Required workflow for EVERY feature:
Start from the latest dev branch.
Create a dedicated feature branch.
Make small, meaningful commits on that branch.
Follow Conventional Commits.
Run relevant tests and checks.
Review the complete branch diff.
Push the branch to the remote repository.
Create a Pull Request targeting dev.
Review the Pull Request.
Merge the Pull Request into dev only after approval and successful checks.
Delete the feature branch after merging, if appropriate.
Create the next feature branch from the updated dev.

The same workflow applies to bug fixes, using fix-* branches.

IMPORTANT:

Never merge a feature branch directly into main.
Never create a Pull Request targeting main.
All feature and fix Pull Requests must target dev.
Do not combine multiple unrelated features into one branch.
If a feature depends on another unmerged feature, explicitly document the dependency and the safest integration order.
Do not create branches from stale versions of dev.
5. PHASE D: PLAN THE COMMIT HISTORY

For each branch, propose a realistic sequence of small commits.

Example:

Branch: feat-login

text
feat(login): create initial login page structure
feat(login): add login form fields and styling
feat(login): implement client-side validation
feat(login): connect login form to authentication API
feat(login): handle authentication errors
test(login): add login flow tests


Branch: fix-login-validation

text
fix(login): correct name field validation
fix(login): prevent empty email submission
test(login): cover invalid input scenarios


These examples are illustrative. Generate commit sequences based on actual changes in my repository.

Important requirements:

Every commit should represent one coherent logical change.
Avoid excessively large commits.
Avoid meaningless one-line commits.
Do not artificially split code just to reach a particular line count.
Preserve dependencies between related code changes.
Make sure each commit is understandable when viewed independently.
Identify commits that may temporarily leave a feature incomplete and document that fact.
Keep bug fixes separate from feature implementation wherever possible.
6. PHASE E: DEPENDENCY AND MERGE ORDER

Determine which features depend on other features.

For example:

text
Backend configuration
        |
Database connection
        |
Authentication API
        |
JWT middleware
        |
Protected routes
        |
Booking functionality


Create a dependency-aware implementation and merge order.

Do not assume the example above perfectly matches my project. Verify dependencies using the actual source code.

If two features modify the same files, identify possible conflicts and recommend a safe order.

7. PHASE F: TESTING AND QUALITY CONTROL

For each feature branch, identify the checks that should be performed before opening a PR.

Consider:

TypeScript compilation.
Frontend build.
Backend build.
ESLint.
Unit tests.
Integration tests.
API endpoint testing.
Authentication testing.
Database compatibility.
Regression testing.

Use existing project scripts where available.

Do not run operations that modify project files or databases during this planning-only task.

Identify missing tests and risks.

8. PHASE G: CREATE THE MASTER PLAN FILE

After completing the audit, create exactly ONE new document:

text
GIT_WORKFLOW_PLAN.md


Place it in the project root.

This must be a comprehensive and actionable execution plan.

It must contain:

Section 1: Repository Overview
Current branch.
Existing branches.
Remote configuration (without credentials).
Current working tree status.
Existing commits.
Number of modified and untracked files.
Section 2: Project Feature Inventory

List every actual feature discovered in the project.

Section 3: Complete File Categorization

Group files into:

Frontend
Backend
Configuration
Database
Middleware
Controllers
Routes
Tests
Documentation
Other
Section 4: Change-to-Feature Mapping

Create a table:

File	Feature	Change Type	Proposed Branch	Dependencies
Section 5: Proposed Branches

List every proposed branch with its purpose and target branch.

Section 6: Commit-by-Commit Plan

For every branch, list all proposed commits in their intended order.

Include exact suggested Conventional Commit messages.

Section 7: Dependency Graph

Show which features must be merged before other features.

Section 8: Merge Sequence

Show the complete order in which feature and fix branches should be merged into dev.

Section 9: Testing Strategy

List the checks required for every branch.

Section 10: Conflict and Risk Analysis

Identify:

Files shared by multiple features.
Potential merge conflicts.
Dependent changes.
Incomplete functionality.
Missing tests.
Risks to the existing working tree.
Section 11: Exact Future Git Command Sequence

Prepare commands for the future execution phase.

Show commands for:

Creating feature branches from updated dev.
Staging selected hunks.
Reviewing staged changes.
Creating commits.
Running tests.
Pushing branches.
Creating Pull Requests targeting dev.
Merging approved Pull Requests.

These commands are documentation only. DO NOT execute them.

Section 12: Execution Checklist

Provide a checklist that I can follow feature by feature.

9. FINAL VALIDATION

Before finishing:

Verify that no existing source file was modified.
Verify that no Git branch was created.
Verify that no commits were created.
Verify that no pushes or merges occurred.
Verify that only GIT_WORKFLOW_PLAN.md was newly created.
Verify that the plan does not expose secrets.
Ensure every recommendation is grounded in actual repository changes.

If something cannot be determined, clearly mark it as UNKNOWN instead of guessing.

10. FINAL RESPONSE

After creating the plan, report:

What you discovered about the repository.
How many features you identified.
How many feature branches you recommend.
How many fix branches you recommend.
How many logical commits you propose.
The recommended branch merge order.
The location of GIT_WORKFLOW_PLAN.md.
Confirmation that no commits, branches, pushes, merges, or Pull Requests were created.

Do not begin execution.

STOP AFTER CREATING THE PLAN FILE AND WAIT FOR MY EXPLICIT APPROVAL.

My next task will be to review your plan and then authorize execution separately.