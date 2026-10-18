# SocialU — proposed Definition of Done

Prepared for the CSC 351 Sprint 1 board review on 13 October 2026. This is a local draft for team confirmation and commit; no teammate approval is claimed.

An SRS item is Done when:

- Its issue contains the exact SRS identifier, author initials, requirement, acceptance criterion and UR trace.
- Its implementation tasks are real sub-issues, assigned to the responsible student, with completion evidence. Tasks cover the necessary layers of that behavior; a read-only UI requirement may reuse existing database/API services without inventing new tables.
- The implementation is committed and merged through a pull request linked from the SRS issue. Future task-completing PRs include `Closes #<task number>` for each completed task.
- The stated acceptance behavior works in the integrated signed-in application using the appropriate account/data boundary. A design-only page or mocked API test alone is insufficient to prove a hosted vertical slice.
- Relevant automated tests pass. Evidence distinguishes current test results, historical results, mocked responses and hosted verification.
- The SRS issue includes a running-application screenshot and concise reproduction/demo steps.
- Required database migrations/configuration are applied and verified when that behavior depends on them. No schema reset is used to migrate an existing shared project.
- Known limitations and dependencies are explicit. Navigation to a teammate's page does not complete that teammate's entire feature; Game 1's entry menu does not complete its playable levels.
- Issue and project statuses reflect the verified scope. No board history, peer review, submission date or approval is fabricated.

The supplied Sprint 1 assignment calls for five SRS items in the Product Backlog and exactly one formal Sprint 1 SRS selection per student. Sonja requested a review and task breakdown of all five existing cards; the instructor's formal-selection rule still requires attention before Canvas submission. The existing shared project uses Backlog, Ready, In progress, In review and Done; its column terminology should be agreed by the team rather than changing teammates' statuses during an individual review.

Canvas submission must include the project link, board screenshot, selected SRS issue with branch/PR/evidence links, and its merged PR link. Demo-day attendance and the actual five-minute demonstration remain the student's responsibility.
