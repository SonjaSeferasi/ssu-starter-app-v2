# School communities

This expands the launch release's single-campus policy at the user's request on October 22, 2026. A verified school email determines community membership; clients cannot choose a campus ID.

## Domain policy

Automatic registration supports `.edu`, `.edu.xx`, and `.ac.xx` academic domains. Email confirmation remains required. For example, `student@school.edu` and `student@students.school.edu` share the `school.edu` community. Personal domains and suffix spoofing such as `school.edu.attacker.test` are rejected. This recognizes academic domain formats; it is not a worldwide accreditation or student-enrollment check. Schools using other domain formats require a future explicitly maintained mapping.

The first registration creates the domain mapping atomically. The account joins only after Supabase verifies email ownership. Existing Salem State IDs and data are preserved. New communities initially display their canonical domain; administrators may replace `socialu.university.name` with an official school name. Different official domains for the same institution must be mapped to the same university by an administrator; ownership cannot be inferred from names alone.

## Boundaries

The database enforces same-school feeds, profile access, discovery, follows, friend requests, post interactions, chat participation, and shared DormSpace players/messages. Events already filter through the university/domain mapping. Existing block and friendship-consent rules remain in force. Profile photos and post photos use the existing signed-media workflow.

Apply `supabase/migrations/20261026000100_school_communities.sql` after the existing migrations, then deploy the matching application code. The migration was applied to the connected Supabase project on October 22, 2026. Hosted read-only checks confirmed canonical domains, rejection of personal email, eight relationship guards, and feed scoping. The signed-in Linh Nguyen account still loads with Salem State University in the header.

## Validation

`__tests__/university-email.test.ts` covers domain formats and spoofing. `__tests__/database/school-communities.test.ts` uses disposable PostgreSQL to exercise verified onboarding, separate feeds, direct access denial, same-campus friendship/chat, cross-campus group denial, and rejection of unverified onboarding. `__tests__/database/school-dormspace.test.ts` verifies separate hallway snapshots and realtime recipients. No hosted test accounts or fake student data were created. A real email-verification journey at a second school still needs an owner of that mailbox.

Keep later database migrations from replacing these access predicates with single-campus versions. Run the community database tests whenever changing shared feed/profile/chat functions.
