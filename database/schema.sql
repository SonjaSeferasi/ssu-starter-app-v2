-- SocialU | CSC 351 Database Schema Script | 25 September 2026
-- Baseline: documentation/SocialU_SRS_Editable.docx and documentation/user_requirements.md.
-- REVIEW DRAFT: one proposed reviewer per table; no human review is asserted completed.
-- Each reviewer must actually review and replace "proposed; review pending" before submission.
-- Run: psql -v ON_ERROR_STOP=1 -d YOUR_EMPTY_DEVELOPMENT_DATABASE -f database/schema.sql
-- DESTRUCTIVE DEVELOPMENT RESET: rerunning removes socialu, its data, and dependent objects.
-- This is a schema build, not a migration of supabase/schema.sql or the deployed application.
-- Do not run it on a database containing SocialU data that must be retained.
-- No application roles, passwords, sample students, reward amounts, or catalog assets are invented.
-- Raw tables are server-private. Authenticated service code must enforce acting-user authorization.
-- Secret digests are computed by the authentication service; plaintext passwords/codes are never stored.
-- Every identifier/FK provides row identity/relationships for its table's listed SRS items.
-- All other columns are explained in schema_review.md. See srs_storage_traceability.csv for every SRS ID.
-- SQL uses PostgreSQL core features only (no Supabase auth schema or optional extensions).

BEGIN;
DROP SCHEMA IF EXISTS socialu CASCADE;
CREATE SCHEMA socialu;
REVOKE ALL ON SCHEMA socialu FROM PUBLIC;
SET LOCAL search_path = socialu, pg_catalog;

-- Table: university
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-101.3, SRS-113.4, SRS-106.4
-- Purpose: Stores the one university served by the semester release.
CREATE TABLE university (
    university_id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (university_id = 1),
    name TEXT NOT NULL CHECK (btrim(name) <> '')
);

-- Table: university_domains
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-100.5, SRS-106.4
-- Purpose: Stores approved email domains belonging to the launch university.
CREATE TABLE university_domains (
    domain VARCHAR(253) PRIMARY KEY CHECK (domain = lower(domain) AND domain ~ '^[a-z0-9.-]+$'),
    university_id SMALLINT NOT NULL DEFAULT 1 REFERENCES university(university_id)
);

-- Table: students
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-100.1, SRS-100.2, SRS-100.3, SRS-100.4, SRS-100.5, SRS-100.6, SRS-100.9, SRS-100.10, SRS-103.5, SRS-103.6, SRS-106.8, SRS-106.9, SRS-123.6, SRS-123.9, SRS-NFR-14
-- Purpose: Stores each student identity, credential digest, and account access state once.
CREATE TABLE students (
    student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT NOT NULL CHECK (btrim(full_name) <> ''),
    username TEXT NOT NULL CHECK (btrim(username) <> ''),
    university_email VARCHAR(254) NOT NULL CHECK (university_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
    email_domain VARCHAR(253) GENERATED ALWAYS AS (lower(split_part(university_email, '@', 2))) STORED
        REFERENCES university_domains(domain),
    password_digest TEXT NOT NULL CHECK (btrim(password_digest) <> ''),
    email_verified_at TIMESTAMPTZ,
    failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    reverification_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: authentication_challenges
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-101.1, SRS-101.4, SRS-101.6, SRS-102.1, SRS-102.4, SRS-102.5, SRS-104.2, SRS-104.3, SRS-106.6, SRS-106.7
-- Purpose: Stores digests and validity times of email verification and password reset codes.
CREATE TABLE authentication_challenges (
    challenge_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('registration','reverification','password_reset','email_change')),
    destination_email VARCHAR(254) NOT NULL CHECK (destination_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
    code_digest TEXT NOT NULL CHECK (btrim(code_digest) <> ''),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    replaced_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,
    CHECK (expires_at = generated_at + INTERVAL '15 minutes'),
    CHECK (sent_at IS NULL OR sent_at >= generated_at),
    CHECK (replaced_at IS NULL OR replaced_at >= generated_at),
    CHECK (consumed_at IS NULL OR (consumed_at >= generated_at AND consumed_at < expires_at
        AND (replaced_at IS NULL OR consumed_at < replaced_at + INTERVAL '10 seconds')))
);

-- Table: login_sessions
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-103.12, SRS-104.12, SRS-105.14, SRS-105.15, SRS-107.2, SRS-107.3, SRS-107.4, SRS-107.5, SRS-107.6, SRS-107.8, SRS-108.5, SRS-NFR-22
-- Purpose: Stores login history and revocable sign-in sessions without an inactivity expiry.
CREATE TABLE login_sessions (
    session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    token_digest TEXT NOT NULL UNIQUE CHECK (btrim(token_digest) <> ''),
    signed_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location_text TEXT,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    CHECK (revoked_at IS NULL OR revoked_at >= signed_in_at)
);

-- Table: upload_policies
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-109.3, SRS-109.4, SRS-201.4, SRS-201.5, SRS-201.13, SRS-510.2, SRS-609.3, SRS-609.4, SRS-NFR-41
-- Purpose: Stores approved MIME types and byte limits for each required photograph or GIF workflow.
CREATE TABLE upload_policies (
    upload_context VARCHAR(20) NOT NULL CHECK (upload_context IN ('profile','avatar_face','post_photo','chat_photo','chat_gif','snipe')),
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type LIKE 'image/%'),
    max_bytes BIGINT NOT NULL CHECK (max_bytes > 0),
    PRIMARY KEY (upload_context, mime_type)
);

-- Table: media_assets
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-109.2, SRS-304.3, SRS-201.6, SRS-201.14, SRS-510.2, SRS-609.8
-- Purpose: Stores private object-storage references and validated metadata for accepted media.
CREATE TABLE media_assets (
    asset_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES students(student_id),
    storage_key TEXT NOT NULL UNIQUE CHECK (btrim(storage_key) <> ''),
    upload_context VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    byte_count BIGINT NOT NULL CHECK (byte_count > 0),
    FOREIGN KEY (upload_context, mime_type) REFERENCES upload_policies(upload_context, mime_type)
);

-- Table: student_profiles
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-109.2, SRS-109.5, SRS-109.6, SRS-109.7, SRS-109.8, SRS-109.9, SRS-110.5, SRS-110.6, SRS-113.2, SRS-113.3, SRS-113.5, SRS-113.6, SRS-113.7
-- Purpose: Stores a student profile separately from private authentication information.
CREATE TABLE student_profiles (
    student_id BIGINT PRIMARY KEY REFERENCES students(student_id),
    photo_id BIGINT REFERENCES media_assets(asset_id),
    major TEXT,
    class_year VARCHAR(10) CHECK (class_year IN ('Freshman','Sophomore','Junior','Senior','Graduate')),
    bio VARCHAR(250),
    display_name TEXT CHECK (display_name IS NULL OR btrim(display_name) <> ''),
    display_name_changed_at TIMESTAMPTZ,
    setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (NOT setup_completed OR (photo_id IS NOT NULL AND major IS NOT NULL AND btrim(major) <> ''
        AND class_year IS NOT NULL AND bio IS NOT NULL AND btrim(bio) <> ''))
);

-- Table: friend_requests
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-114.2, SRS-114.3, SRS-115.9, SRS-116.2, SRS-117.1, SRS-119.7, SRS-120.4, SRS-121.6, SRS-507.4
-- Purpose: Stores friend request outcomes and accepted friendship periods without a duplicate friendship table.
CREATE TABLE friend_requests (
    request_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES students(student_id),
    recipient_id BIGINT NOT NULL REFERENCES students(student_id),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','canceled','blocked')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    friendship_ended_at TIMESTAMPTZ,
    CHECK (sender_id <> recipient_id),
    CHECK ((status = 'pending') = (decided_at IS NULL)),
    CHECK (decided_at IS NULL OR decided_at >= requested_at),
    CHECK (friendship_ended_at IS NULL OR (status = 'accepted' AND friendship_ended_at >= decided_at))
);

-- Table: student_blocks
-- Reviewed by: SS (Sonja Seferasi) - proposed; review pending
-- Supports: SRS-121.4, SRS-121.8, SRS-121.9, SRS-121.10, SRS-121.11, SRS-122.9
-- Purpose: Stores directional student blocks used by profile, feed, friendship, and messaging access checks.
CREATE TABLE student_blocks (
    blocker_id BIGINT NOT NULL REFERENCES students(student_id),
    blocked_id BIGINT NOT NULL REFERENCES students(student_id),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- Table: student_preferences
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-601.1, SRS-601.4, SRS-601.7, SRS-627.2, SRS-627.4, SRS-627.9, SRS-NFR-62
-- Purpose: Stores account-wide navigation position and interface appearance preferences.
CREATE TABLE student_preferences (
    student_id BIGINT PRIMARY KEY REFERENCES students(student_id),
    navigation_position VARCHAR(6) NOT NULL DEFAULT 'side' CHECK (navigation_position IN ('side','bottom')),
    theme VARCHAR(5) NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark'))
);

-- Table: conversations
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-200.3, SRS-200.4, SRS-200.5, SRS-200.6, SRS-202.1, SRS-202.2, SRS-203.3, SRS-NFR-36
-- Purpose: Stores private conversation pairs and group identities in a shared conversation namespace.
CREATE TABLE conversations (
    conversation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind VARCHAR(7) NOT NULL CHECK (kind IN ('private','group')),
    created_by BIGINT NOT NULL REFERENCES students(student_id),
    private_student_low BIGINT REFERENCES students(student_id),
    private_student_high BIGINT REFERENCES students(student_id),
    CHECK ((kind = 'private' AND private_student_low IS NOT NULL AND private_student_high IS NOT NULL
            AND private_student_low < private_student_high AND created_by IN (private_student_low, private_student_high))
        OR (kind = 'group' AND private_student_low IS NULL AND private_student_high IS NULL)),
    UNIQUE (private_student_low, private_student_high)
);

-- Table: group_memberships
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-202.3, SRS-203.4, SRS-204.2, SRS-204.3, SRS-205.12, SRS-205.13, SRS-207.5, SRS-208.2, SRS-213.5, SRS-NFR-34, SRS-NFR-35
-- Purpose: Stores group membership periods and roles, preserving former members historical access boundaries.
CREATE TABLE group_memberships (
    membership_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id),
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    role VARCHAR(13) NOT NULL DEFAULT 'member' CHECK (role IN ('owner','administrator','member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- Table: group_invitations
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-205.1, SRS-205.3, SRS-205.5, SRS-205.6, SRS-205.8
-- Purpose: Stores pending and answered invitations to join group conversations.
CREATE TABLE group_invitations (
    invitation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id),
    inviter_id BIGINT NOT NULL REFERENCES students(student_id),
    invitee_id BIGINT NOT NULL REFERENCES students(student_id),
    status VARCHAR(8) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    CHECK (inviter_id <> invitee_id)
);

-- Table: message_requests
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-200.7, SRS-200.8, SRS-200.9, SRS-200.11, SRS-200.12, SRS-200.14, SRS-200.17, SRS-200.18, SRS-NFR-26
-- Purpose: Stores non-friend messaging introductions and accepted or declined consent.
CREATE TABLE message_requests (
    request_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES students(student_id),
    recipient_id BIGINT NOT NULL REFERENCES students(student_id),
    initial_text VARCHAR(500) NOT NULL CHECK (btrim(initial_text) <> ''),
    status VARCHAR(8) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    CHECK (sender_id <> recipient_id),
    CHECK ((status = 'pending') = (decided_at IS NULL)),
    CHECK (decided_at IS NULL OR decided_at >= created_at)
);

-- Table: messages
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-201.1, SRS-201.6, SRS-201.8, SRS-201.14, SRS-201.17, SRS-209.4, SRS-211.3, SRS-211.4, SRS-211.5, SRS-200.14, SRS-NFR-26
-- Purpose: Stores message content and same-conversation replies, with one link for a delivered request introduction.
CREATE TABLE messages (
    message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id),
    sender_id BIGINT NOT NULL REFERENCES students(student_id),
    kind VARCHAR(11) NOT NULL CHECK (kind IN ('text','emoji','photo','gif_upload','gif_library','request')),
    text_content VARCHAR(500),
    asset_id BIGINT REFERENCES media_assets(asset_id),
    gif_reference TEXT,
    accepted_request_id BIGINT UNIQUE REFERENCES message_requests(request_id),
    reply_to_id BIGINT,
    status VARCHAR(6) NOT NULL CHECK (status IN ('sent','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    UNIQUE (message_id, conversation_id),
    FOREIGN KEY (reply_to_id, conversation_id) REFERENCES messages(message_id, conversation_id),
    CHECK (reply_to_id IS NULL OR reply_to_id <> message_id),
    CHECK ((status = 'sent') = (sent_at IS NOT NULL)),
    CHECK (sent_at IS NULL OR sent_at >= created_at),
    CHECK ((kind IN ('text','emoji') AND text_content IS NOT NULL AND btrim(text_content) <> '' AND asset_id IS NULL AND gif_reference IS NULL AND accepted_request_id IS NULL)
        OR (kind IN ('photo','gif_upload') AND asset_id IS NOT NULL AND text_content IS NULL AND gif_reference IS NULL AND accepted_request_id IS NULL)
        OR (kind = 'gif_library' AND gif_reference IS NOT NULL AND btrim(gif_reference) <> '' AND asset_id IS NULL AND text_content IS NULL AND accepted_request_id IS NULL)
        OR (kind = 'request' AND accepted_request_id IS NOT NULL AND text_content IS NULL AND asset_id IS NULL AND gif_reference IS NULL))
);

-- Table: message_reads
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-211.6, SRS-211.7, SRS-211.8, SRS-212.1, SRS-212.5, SRS-603.1
-- Purpose: Stores which messages each recipient has read; absent rows indicate unread messages.
CREATE TABLE message_reads (
    message_id BIGINT NOT NULL REFERENCES messages(message_id),
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, student_id)
);

-- Table: hidden_messages
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-119.10, SRS-119.11, SRS-119.12, SRS-119.13
-- Purpose: Stores a senders personal hiding of their own sent message without deleting it for recipients.
CREATE TABLE hidden_messages (
    message_id BIGINT PRIMARY KEY REFERENCES messages(message_id)
);

-- Table: hidden_conversations
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-207.6, SRS-207.7
-- Purpose: Stores group conversation history hidden by a former member only in that members view.
CREATE TABLE hidden_conversations (
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id),
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    PRIMARY KEY (conversation_id, student_id)
);

-- Table: reaction_options
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-210.2, SRS-210.3
-- Purpose: Stores the team-approved fixed reaction emoji set without inventing that set.
CREATE TABLE reaction_options (
    emoji TEXT PRIMARY KEY CHECK (btrim(emoji) <> '')
);

-- Table: message_reactions
-- Reviewed by: LN (Linh Nguyen) - proposed; review pending
-- Supports: SRS-210.3, SRS-210.4, SRS-210.5, SRS-210.6
-- Purpose: Stores at most one approved emoji reaction per student on each group message.
CREATE TABLE message_reactions (
    message_id BIGINT NOT NULL REFERENCES messages(message_id),
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    emoji TEXT NOT NULL REFERENCES reaction_options(emoji),
    PRIMARY KEY (message_id, student_id)
);

-- Table: posts
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-303.2, SRS-303.3, SRS-305.3, SRS-306.2, SRS-306.4, SRS-307.3, SRS-315.1, SRS-315.2, SRS-315.3, SRS-405.1
-- Purpose: Stores published campus or friends-only posts; drafts and Snipes are excluded.
CREATE TABLE posts (
    post_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES students(student_id),
    text_content TEXT,
    visibility VARCHAR(12) NOT NULL CHECK (visibility IN ('public','friends_only')),
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMPTZ,
    CHECK (edited_at IS NULL OR edited_at >= published_at)
);

-- Table: post_photos
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-304.1, SRS-304.3, SRS-304.4, SRS-306.3, SRS-NFR-41
-- Purpose: Relates one or more accepted photographs to a published post.
CREATE TABLE post_photos (
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    asset_id BIGINT NOT NULL REFERENCES media_assets(asset_id),
    PRIMARY KEY (post_id, asset_id)
);

-- Table: post_tags
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-112.4, SRS-113.13
-- Purpose: Relates students to feed posts in which they are tagged for the profile Tagged category.
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    PRIMARY KEY (post_id, student_id)
);

-- Table: post_likes
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-308.2, SRS-308.3, SRS-309.1, SRS-405.2, SRS-405.3, SRS-405.4
-- Purpose: Stores one active like per student and post, with the latest like time for Trending.
CREATE TABLE post_likes (
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    liked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, student_id)
);

-- Table: post_comments
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-310.1, SRS-310.2, SRS-310.3, SRS-311.4, SRS-311.5
-- Purpose: Stores comment text, authorship, and submission time for each post comment.
CREATE TABLE post_comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES students(student_id),
    text_content TEXT NOT NULL CHECK (btrim(text_content) <> ''),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: post_reports
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-314.1, SRS-314.2, SRS-314.3, SRS-314.5, SRS-NFR-43
-- Purpose: Stores accepted content reports privately until the reported post is deleted.
CREATE TABLE post_reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    reporter_id BIGINT NOT NULL REFERENCES students(student_id)
);

-- Table: events
-- Reviewed by: MS (Merieme Sakhsoukhi) - proposed; review pending
-- Supports: SRS-400.1, SRS-400.2, SRS-400.3, SRS-400.4, SRS-400.5, SRS-400.6, SRS-404.7, SRS-404.9, SRS-NFR-45
-- Purpose: Stores each published campus event and its current cancellation state.
CREATE TABLE events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    creator_id BIGINT NOT NULL REFERENCES students(student_id),
    title TEXT NOT NULL CHECK (btrim(title) <> ''),
    description TEXT NOT NULL CHECK (btrim(description) <> ''),
    location TEXT NOT NULL CHECK (btrim(location) <> ''),
    starts_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(9) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled'))
);

-- Table: event_invitations
-- Reviewed by: MS (Merieme Sakhsoukhi) - proposed; review pending
-- Supports: SRS-402.1, SRS-402.3, SRS-402.5, SRS-403.2, SRS-403.3, SRS-403.4, SRS-403.5, SRS-404.11
-- Purpose: Stores each invited student and their current event RSVP without requiring a friendship.
CREATE TABLE event_invitations (
    event_id BIGINT NOT NULL REFERENCES events(event_id),
    invitee_id BIGINT NOT NULL REFERENCES students(student_id),
    rsvp VARCHAR(13) NOT NULL DEFAULT 'pending' CHECK (rsvp IN ('pending','attending','not_attending')),
    PRIMARY KEY (event_id, invitee_id)
);

-- Table: notifications
-- Reviewed by: LP (Loens Paul) - proposed; review pending
-- Supports: SRS-114.7, SRS-116.4, SRS-116.5, SRS-312.1, SRS-312.2, SRS-312.3, SRS-312.4, SRS-313.1, SRS-313.2, SRS-313.3, SRS-NFR-42
-- Purpose: Stores friend and feed interaction notices with real foreign-key targets and times for grouping.
CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES students(student_id),
    actor_id BIGINT NOT NULL REFERENCES students(student_id),
    kind VARCHAR(19) NOT NULL CHECK (kind IN ('friend_request','friendship_accepted','post_like','post_comment')),
    friend_request_id BIGINT REFERENCES friend_requests(request_id),
    post_id BIGINT REFERENCES posts(post_id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES post_comments(comment_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((kind IN ('friend_request','friendship_accepted') AND friend_request_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
        OR (kind = 'post_like' AND post_id IS NOT NULL AND friend_request_id IS NULL AND comment_id IS NULL)
        OR (kind = 'post_comment' AND comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL))
);

-- Table: activities
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-607.1, SRS-607.2, SRS-615.1, SRS-623.1
-- Purpose: Stores the included Game Room activities, descriptions, and instructions.
CREATE TABLE activities (
    activity_code VARCHAR(9) PRIMARY KEY CHECK (activity_code IN ('game1','wordle','dormspace')),
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    description TEXT NOT NULL CHECK (btrim(description) <> ''),
    instructions TEXT NOT NULL CHECK (btrim(instructions) <> ''),
    included BOOLEAN NOT NULL
);

-- Table: catalog_items
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-503.1, SRS-522.2, SRS-522.7, SRS-529.1, SRS-529.5, SRS-529.7, SRS-608.1
-- Purpose: Stores shared outfit and DormSpace catalog definitions and current offers.
CREATE TABLE catalog_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('furniture','decoration','outfit','wall','floor')),
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    preview_key TEXT NOT NULL CHECK (btrim(preview_key) <> ''),
    price_points BIGINT CHECK (price_points >= 0),
    purchasable BOOLEAN NOT NULL DEFAULT FALSE,
    unavailable_reason TEXT,
    starter_slot VARCHAR(6) UNIQUE CHECK (starter_slot IN ('bed','window','desk','chair')),
    is_initial_outfit BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (NOT is_initial_outfit OR (kind = 'outfit' AND NOT purchasable)),
    CHECK (NOT purchasable OR (price_points IS NOT NULL AND unavailable_reason IS NULL)),
    CHECK (starter_slot IS NULL OR (kind IN ('furniture','decoration') AND NOT purchasable))
);

-- Table: owned_items
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-503.1, SRS-503.4, SRS-505.6, SRS-522.6, SRS-523.1, SRS-524.2, SRS-608.1
-- Purpose: Stores one ownership record per student and catalog item shared by the closet and dorm.
CREATE TABLE owned_items (
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    item_id BIGINT NOT NULL REFERENCES catalog_items(item_id),
    purchase_transaction_id BIGINT UNIQUE,
    PRIMARY KEY (student_id, item_id)
);

-- Table: default_faces
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-607.4, SRS-608.4, SRS-608.5
-- Purpose: Stores provided default avatar faces and the initial default selection.
CREATE TABLE default_faces (
    face_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_key TEXT NOT NULL CHECK (btrim(asset_key) <> ''),
    is_initial BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: avatar_photo_faces
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-609.6, SRS-609.7, SRS-609.8, SRS-609.14, SRS-610.1
-- Purpose: Stores successfully saved photographic faces and normalized crop coordinates.
CREATE TABLE avatar_photo_faces (
    face_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    photo_id BIGINT NOT NULL REFERENCES media_assets(asset_id),
    crop_x NUMERIC NOT NULL CHECK (crop_x >= 0 AND crop_x < 1),
    crop_y NUMERIC NOT NULL CHECK (crop_y >= 0 AND crop_y < 1),
    crop_width NUMERIC NOT NULL CHECK (crop_width > 0 AND crop_width <= 1),
    crop_height NUMERIC NOT NULL CHECK (crop_height > 0 AND crop_height <= 1),
    processed_face_key TEXT,
    CHECK (crop_x + crop_width <= 1 AND crop_y + crop_height <= 1),
    UNIQUE (student_id, face_id)
);

-- Table: student_avatars
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-608.3, SRS-608.5, SRS-610.1, SRS-610.2, SRS-504.1, SRS-NFR-62
-- Purpose: Stores the one saved avatar face and owned complete outfit used across SocialU.
CREATE TABLE student_avatars (
    student_id BIGINT PRIMARY KEY REFERENCES students(student_id),
    outfit_id BIGINT NOT NULL,
    default_face_id BIGINT REFERENCES default_faces(face_id),
    photo_face_id BIGINT,
    FOREIGN KEY (student_id, outfit_id) REFERENCES owned_items(student_id, item_id),
    FOREIGN KEY (student_id, photo_face_id) REFERENCES avatar_photo_faces(student_id, face_id),
    CHECK (num_nonnulls(default_face_id, photo_face_id) = 1)
);

-- Table: room_surfaces
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.2, SRS-500.8, SRS-529.7
-- Purpose: Stores the fixed room grid dimensions for permitted furniture and decoration surfaces.
CREATE TABLE room_surfaces (
    surface_code TEXT PRIMARY KEY CHECK (btrim(surface_code) <> ''),
    width_cells INTEGER NOT NULL CHECK (width_cells > 0),
    height_cells INTEGER NOT NULL CHECK (height_cells > 0)
);

-- Table: reserved_room_cells
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.9
-- Purpose: Stores entrance and exit grid cells that must remain free of placed items.
CREATE TABLE reserved_room_cells (
    surface_code TEXT NOT NULL REFERENCES room_surfaces(surface_code),
    x INTEGER NOT NULL CHECK (x >= 0),
    y INTEGER NOT NULL CHECK (y >= 0),
    PRIMARY KEY (surface_code, x, y)
);

-- Table: item_footprints
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.2, SRS-500.7, SRS-500.8, SRS-529.7
-- Purpose: Stores each decoration footprint and its one permitted fixed-orientation surface.
CREATE TABLE item_footprints (
    item_id BIGINT PRIMARY KEY REFERENCES catalog_items(item_id),
    surface_code TEXT NOT NULL REFERENCES room_surfaces(surface_code),
    width_cells INTEGER NOT NULL CHECK (width_cells > 0),
    height_cells INTEGER NOT NULL CHECK (height_cells > 0),
    overlap_category TEXT NOT NULL CHECK (btrim(overlap_category) <> '')
);

-- Table: compatible_item_overlaps
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.10, SRS-529.7
-- Purpose: Stores the explicit catalog item pairs permitted to overlap in a dorm.
CREATE TABLE compatible_item_overlaps (
    item_low BIGINT NOT NULL REFERENCES item_footprints(item_id),
    item_high BIGINT NOT NULL REFERENCES item_footprints(item_id),
    PRIMARY KEY (item_low, item_high),
    CHECK (item_low < item_high)
);

-- Table: dorms
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.13, SRS-500.14, SRS-505.1, SRS-505.5, SRS-505.8, SRS-508.3, SRS-508.4
-- Purpose: Stores each owners current dorm appearance, welcome message, and save version.
CREATE TABLE dorms (
    owner_id BIGINT PRIMARY KEY REFERENCES students(student_id),
    wall_item_id BIGINT,
    floor_item_id BIGINT,
    welcome_text VARCHAR(500) NOT NULL DEFAULT 'Welcome! Thanks for coming.',
    save_version BIGINT NOT NULL DEFAULT 1 CHECK (save_version > 0),
    FOREIGN KEY (owner_id, wall_item_id) REFERENCES owned_items(student_id, item_id),
    FOREIGN KEY (owner_id, floor_item_id) REFERENCES owned_items(student_id, item_id)
);

-- Table: dorm_placements
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-500.2, SRS-500.3, SRS-500.4, SRS-500.5, SRS-500.6, SRS-505.2
-- Purpose: Stores each owned items single placement in its owners current dorm.
CREATE TABLE dorm_placements (
    owner_id BIGINT NOT NULL REFERENCES dorms(owner_id),
    item_id BIGINT NOT NULL REFERENCES item_footprints(item_id),
    x INTEGER NOT NULL CHECK (x >= 0),
    y INTEGER NOT NULL CHECK (y >= 0),
    PRIMARY KEY (owner_id, item_id),
    FOREIGN KEY (owner_id, item_id) REFERENCES owned_items(student_id, item_id)
);

-- Table: guestbook_notes
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-508.9, SRS-508.10, SRS-508.11, SRS-508.13, SRS-508.16, SRS-508.18, SRS-508.20
-- Purpose: Stores visitor notes with stable authorship and original creation times.
CREATE TABLE guestbook_notes (
    note_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dorm_owner_id BIGINT NOT NULL REFERENCES dorms(owner_id),
    author_id BIGINT NOT NULL REFERENCES students(student_id),
    text_content VARCHAR(500) NOT NULL CHECK (text_content ~ '[^[:space:]]'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (dorm_owner_id <> author_id)
);

-- Table: counted_dorm_visits
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-509.2, SRS-509.3, SRS-509.6, SRS-509.7, SRS-509.8, SRS-509.9
-- Purpose: Stores only counted visits so cumulative counts can be derived without duplicating them.
CREATE TABLE counted_dorm_visits (
    visit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dorm_owner_id BIGINT NOT NULL REFERENCES dorms(owner_id),
    visitor_id BIGINT NOT NULL REFERENCES students(student_id),
    entered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (dorm_owner_id <> visitor_id)
);

-- Table: game_levels
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-616.1, SRS-617.1, SRS-618.1, SRS-618.4
-- Purpose: Stores included Game 1 level numbers and authored course asset references.
CREATE TABLE game_levels (
    level_number SMALLINT PRIMARY KEY CHECK (level_number BETWEEN 1 AND 4),
    course_asset_key TEXT NOT NULL CHECK (btrim(course_asset_key) <> '')
);

-- Table: wordle_words
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-624.1, SRS-624.6
-- Purpose: Stores the approved five-letter English guess dictionary for optional Wordle.
CREATE TABLE wordle_words (
    word VARCHAR(5) PRIMARY KEY CHECK (word ~ '^[A-Z]{5}$')
);

-- Table: wordle_puzzles
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-624.1, SRS-624.12, SRS-625.2
-- Purpose: Stores the one Wordle answer assigned to each America/New_York calendar date.
CREATE TABLE wordle_puzzles (
    puzzle_date DATE PRIMARY KEY,
    answer VARCHAR(5) NOT NULL REFERENCES wordle_words(word)
);

-- Table: wordle_guesses
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-624.6, SRS-624.8, SRS-624.9, SRS-624.11, SRS-625.3, SRS-626.1, SRS-NFR-62
-- Purpose: Stores accepted daily guesses; results and letter feedback are derived from them.
CREATE TABLE wordle_guesses (
    guess_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    puzzle_date DATE NOT NULL REFERENCES wordle_puzzles(puzzle_date),
    guess_number SMALLINT NOT NULL CHECK (guess_number BETWEEN 1 AND 6),
    word VARCHAR(5) NOT NULL REFERENCES wordle_words(word),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submission_key UUID NOT NULL,
    UNIQUE (student_id, puzzle_date, guess_number),
    UNIQUE (student_id, submission_key),
    UNIQUE (student_id, guess_id),
    CHECK (puzzle_date = (accepted_at AT TIME ZONE 'America/New_York')::date)
);

-- Table: participation_settings
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-613.4, SRS-613.10, SRS-613.11
-- Purpose: Stores the immutable initial participation time zone for each participating account.
CREATE TABLE participation_settings (
    student_id BIGINT PRIMARY KEY REFERENCES students(student_id),
    time_zone TEXT NOT NULL CHECK (btrim(time_zone) <> '')
);

-- Table: participation_events
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-613.1, SRS-613.2, SRS-613.13, SRS-526.1, SRS-526.3
-- Purpose: Stores authenticated qualifying activity identities shared by streak and reward processing.
CREATE TABLE participation_events (
    event_id UUID PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES participation_settings(student_id),
    activity_code VARCHAR(9) NOT NULL REFERENCES activities(activity_code),
    occurred_at TIMESTAMPTZ NOT NULL,
    game_level SMALLINT REFERENCES game_levels(level_number),
    wordle_guess_id BIGINT UNIQUE,
    FOREIGN KEY (student_id, wordle_guess_id) REFERENCES wordle_guesses(student_id, guess_id),
    UNIQUE (student_id, event_id),
    CHECK ((activity_code = 'game1' AND game_level IS NOT NULL AND wordle_guess_id IS NULL)
        OR (activity_code = 'wordle' AND game_level IS NULL AND wordle_guess_id IS NOT NULL)
        OR (activity_code = 'dormspace' AND game_level IS NULL AND wordle_guess_id IS NULL))
);

-- Table: streak_instances
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-613.9, SRS-613.13, SRS-526.18, SRS-526.20
-- Purpose: Identifies each distinct shared streak from its first qualifying date to its reset.
CREATE TABLE streak_instances (
    streak_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES participation_settings(student_id),
    started_on DATE NOT NULL,
    reset_on DATE,
    UNIQUE (student_id, streak_id),
    UNIQUE (student_id, started_on),
    CHECK (reset_on IS NULL OR reset_on > started_on)
);

-- Table: participation_days
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-612.4, SRS-613.3, SRS-613.5, SRS-613.6, SRS-613.7, SRS-613.8, SRS-613.9, SRS-613.12, SRS-613.13
-- Purpose: Stores shared daily participation outcomes without a second rewards streak.
CREATE TABLE participation_days (
    student_id BIGINT NOT NULL REFERENCES participation_settings(student_id),
    participation_date DATE NOT NULL,
    state VARCHAR(10) NOT NULL CHECK (state IN ('played','forgiven','reset','inactive')),
    streak_id BIGINT,
    first_event_id UUID UNIQUE,
    PRIMARY KEY (student_id, participation_date),
    FOREIGN KEY (student_id, streak_id) REFERENCES streak_instances(student_id, streak_id),
    FOREIGN KEY (student_id, first_event_id) REFERENCES participation_events(student_id, event_id),
    CHECK ((state = 'played') = (first_event_id IS NOT NULL)),
    CHECK ((state = 'inactive') = (streak_id IS NULL))
);

-- Table: reminder_dismissals
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-614.1, SRS-614.3, SRS-614.5
-- Purpose: Stores participation reminder dismissals for the remainder of each participation day.
CREATE TABLE reminder_dismissals (
    student_id BIGINT NOT NULL REFERENCES participation_settings(student_id),
    participation_date DATE NOT NULL,
    PRIMARY KEY (student_id, participation_date)
);

-- Table: level_completions
-- Reviewed by: DP (Darrin Phimphisane) - proposed; review pending
-- Supports: SRS-619.3, SRS-619.4, SRS-619.9, SRS-618.6, SRS-520.4, SRS-528.6
-- Purpose: Stores confirmed successful Game 1 attempts and their collected-coin results.
CREATE TABLE level_completions (
    attempt_id UUID PRIMARY KEY REFERENCES participation_events(event_id),
    completed_at TIMESTAMPTZ NOT NULL,
    collected_coins INTEGER NOT NULL CHECK (collected_coins >= 0)
);

-- Table: snipe_requests
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-510.2, SRS-510.9, SRS-510.10, SRS-510.11, SRS-510.12, SRS-512.4, SRS-512.9, SRS-512.11, SRS-514.5, SRS-514.7
-- Purpose: Stores immutable Snipe submission identity, its original conversation, and approval lifecycle.
CREATE TABLE snipe_requests (
    snipe_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submitter_id BIGINT NOT NULL REFERENCES students(student_id),
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id),
    photo_id BIGINT NOT NULL REFERENCES media_assets(asset_id),
    submission_key UUID NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    review_locked BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(8) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','canceled','closed','removed')),
    published_at TIMESTAMPTZ,
    terminal_reason TEXT,
    UNIQUE (submitter_id, submission_key),
    CHECK (expires_at = submitted_at + INTERVAL '24 hours'),
    CHECK ((status IN ('approved','removed')) = (published_at IS NOT NULL)),
    CHECK (published_at IS NULL OR (published_at >= submitted_at AND published_at < expires_at)),
    CHECK (status IN ('pending','approved') OR (terminal_reason IS NOT NULL AND btrim(terminal_reason) <> ''))
);

-- Table: snipe_tags
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-510.5, SRS-510.6, SRS-511.2, SRS-511.3, SRS-511.4, SRS-511.9, SRS-511.11, SRS-513.1, SRS-513.6, SRS-525.2
-- Purpose: Stores each originally tagged student and their separate identity and sharing answers.
CREATE TABLE snipe_tags (
    snipe_id BIGINT NOT NULL REFERENCES snipe_requests(snipe_id),
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    identity_yes BOOLEAN,
    sharing_yes BOOLEAN,
    sharing_withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (snipe_id, student_id),
    CHECK (NOT sharing_withdrawn OR sharing_yes IS TRUE)
);

-- Table: snipe_reports
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-514.8, SRS-514.10, SRS-514.12, SRS-514.13
-- Purpose: Stores group Snipe reports and their administrator review outcomes.
CREATE TABLE snipe_reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    snipe_id BIGINT NOT NULL REFERENCES snipe_requests(snipe_id),
    reporter_id BIGINT NOT NULL REFERENCES students(student_id),
    reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
    status VARCHAR(10) NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved','dismissed','removed')),
    resolved_by BIGINT REFERENCES students(student_id),
    CHECK ((status = 'unresolved') = (resolved_by IS NULL))
);

-- Table: reward_rules
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-520.3, SRS-523.8, SRS-525.2, SRS-526.5, SRS-526.17, SRS-528.1, SRS-528.5, SRS-528.6
-- Purpose: Stores approved reward amounts and eligibility explanations without guessing undecided rates.
CREATE TABLE reward_rules (
    rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category VARCHAR(19) NOT NULL CHECK (category IN ('snipe','level_completion','daily_participation','streak_milestone')),
    points_per_unit BIGINT NOT NULL CHECK (points_per_unit >= 0),
    milestone_days SMALLINT CHECK (milestone_days IN (7,14,30)),
    eligibility_text TEXT NOT NULL CHECK (btrim(eligibility_text) <> ''),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK ((category = 'streak_milestone') = (milestone_days IS NOT NULL)),
    UNIQUE (rule_id, category)
);

-- Table: point_transactions
-- Reviewed by: KB (Kabanga Mbangu) - proposed; review pending
-- Supports: SRS-520.1, SRS-523.1, SRS-523.3, SRS-523.4, SRS-523.5, SRS-523.7, SRS-525.1, SRS-526.6, SRS-526.18, SRS-527.2, SRS-527.3, SRS-527.5, SRS-NFR-49, SRS-NFR-50
-- Purpose: Stores the immutable shared points ledger with typed sources and unique retry identities.
CREATE TABLE point_transactions (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(student_id),
    category VARCHAR(19) NOT NULL CHECK (category IN ('snipe','level_completion','daily_participation','streak_milestone','purchase')),
    points_change BIGINT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action_key UUID NOT NULL,
    reward_rule_id BIGINT,
    reward_units INTEGER,
    snipe_id BIGINT REFERENCES snipe_requests(snipe_id),
    attempt_id UUID REFERENCES level_completions(attempt_id),
    participation_date DATE,
    streak_id BIGINT,
    milestone_days SMALLINT CHECK (milestone_days IN (7,14,30)),
    purchased_item_id BIGINT REFERENCES catalog_items(item_id),
    FOREIGN KEY (reward_rule_id, category) REFERENCES reward_rules(rule_id, category),
    FOREIGN KEY (student_id, participation_date) REFERENCES participation_days(student_id, participation_date),
    FOREIGN KEY (student_id, streak_id) REFERENCES streak_instances(student_id, streak_id),
    UNIQUE (student_id, action_key),
    UNIQUE (student_id, transaction_id),
    CHECK ((category = 'purchase' AND reward_rule_id IS NULL AND reward_units IS NULL AND points_change <= 0)
        OR (category <> 'purchase' AND reward_rule_id IS NOT NULL AND reward_units > 0 AND points_change >= 0)),
    CHECK ((category = 'snipe' AND snipe_id IS NOT NULL AND num_nonnulls(attempt_id,participation_date,streak_id,milestone_days,purchased_item_id) = 0)
        OR (category = 'level_completion' AND attempt_id IS NOT NULL AND num_nonnulls(snipe_id,participation_date,streak_id,milestone_days,purchased_item_id) = 0)
        OR (category = 'daily_participation' AND participation_date IS NOT NULL AND num_nonnulls(snipe_id,attempt_id,streak_id,milestone_days,purchased_item_id) = 0)
        OR (category = 'streak_milestone' AND streak_id IS NOT NULL AND milestone_days IS NOT NULL AND num_nonnulls(snipe_id,attempt_id,participation_date,purchased_item_id) = 0)
        OR (category = 'purchase' AND purchased_item_id IS NOT NULL AND num_nonnulls(snipe_id,attempt_id,participation_date,streak_id,milestone_days) = 0))
);

-- Supporting indexes enforce uniqueness or serve the SRS retrieval paths.
-- SRS-100.3 / SRS-100.9: exact username uniqueness; email matching is case-insensitive.
CREATE UNIQUE INDEX students_username_unique ON students(username);
CREATE UNIQUE INDEX students_email_unique ON students(lower(university_email));
-- SRS-114.3 / SRS-116.2: only one pending request or current friendship per unordered pair.
CREATE UNIQUE INDEX friend_requests_current_pair ON friend_requests
    (LEAST(sender_id,recipient_id), GREATEST(sender_id,recipient_id))
    WHERE status = 'pending' OR (status = 'accepted' AND friendship_ended_at IS NULL);
CREATE INDEX friend_requests_recipient ON friend_requests(recipient_id, status);
CREATE INDEX sessions_student ON login_sessions(student_id, signed_in_at DESC);
CREATE INDEX challenges_student ON authentication_challenges(student_id, purpose, generated_at DESC);
-- SRS-203.4 / SRS-204.3 / SRS-NFR-34 / SRS-NFR-35.
CREATE UNIQUE INDEX group_current_student ON group_memberships(conversation_id, student_id) WHERE left_at IS NULL;
CREATE UNIQUE INDEX group_current_owner ON group_memberships(conversation_id) WHERE role = 'owner' AND left_at IS NULL;
CREATE UNIQUE INDEX group_current_admin ON group_memberships(conversation_id) WHERE role = 'administrator' AND left_at IS NULL;
CREATE INDEX group_memberships_student ON group_memberships(student_id, conversation_id, joined_at);
CREATE UNIQUE INDEX pending_message_request ON message_requests(sender_id, recipient_id) WHERE status = 'pending';
CREATE INDEX conversation_messages ON messages(conversation_id, sent_at, message_id);
CREATE INDEX message_reads_student ON message_reads(student_id, message_id);
CREATE INDEX feed_posts ON posts(visibility, published_at DESC, post_id);
CREATE INDEX profile_posts ON posts(author_id, published_at DESC);
CREATE INDEX trending_likes ON post_likes(liked_at, post_id);
CREATE INDEX post_comments_order ON post_comments(post_id, created_at, comment_id);
CREATE INDEX post_reports_target ON post_reports(post_id);
CREATE INDEX upcoming_events ON events(starts_at) WHERE status = 'active';
CREATE INDEX invitations_student ON event_invitations(invitee_id, event_id);
CREATE INDEX notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE UNIQUE INDEX initial_default_face ON default_faces(is_initial) WHERE is_initial;
CREATE UNIQUE INDEX initial_outfit ON catalog_items(is_initial_outfit) WHERE is_initial_outfit;
CREATE INDEX guestbook_order ON guestbook_notes(dorm_owner_id, created_at DESC, note_id DESC);
CREATE INDEX counted_visit_pair ON counted_dorm_visits(dorm_owner_id, visitor_id, entered_at DESC);
CREATE UNIQUE INDEX current_streak ON streak_instances(student_id) WHERE reset_on IS NULL;
CREATE INDEX participant_activity_time ON participation_events(student_id, occurred_at);
CREATE INDEX snipe_conversation ON snipe_requests(conversation_id, submitted_at);
CREATE INDEX snipe_cooldown_source ON snipe_requests(submitter_id, submitted_at);
CREATE INDEX snipe_tags_student ON snipe_tags(student_id, snipe_id);
CREATE UNIQUE INDEX current_reward_rule ON reward_rules(category, COALESCE(milestone_days,0)) WHERE is_current;
CREATE UNIQUE INDEX snipe_reward_once ON point_transactions(snipe_id) WHERE category = 'snipe';
CREATE UNIQUE INDEX completed_attempt_reward_once ON point_transactions(attempt_id) WHERE category = 'level_completion';
CREATE UNIQUE INDEX daily_reward_once ON point_transactions(student_id, participation_date) WHERE category = 'daily_participation';
CREATE UNIQUE INDEX milestone_reward_once ON point_transactions(student_id, streak_id, milestone_days) WHERE category = 'streak_milestone';
CREATE UNIQUE INDEX item_purchase_once ON point_transactions(student_id, purchased_item_id) WHERE category = 'purchase';
CREATE INDEX points_history_order ON point_transactions(student_id, transaction_id);
ALTER TABLE owned_items ADD CONSTRAINT ownership_purchase_fk
    FOREIGN KEY (student_id, purchase_transaction_id)
    REFERENCES point_transactions(student_id, transaction_id) DEFERRABLE INITIALLY DEFERRED;

-- Static validation policy data explicitly stated in the SRS. MB = 1,000,000 bytes.
-- Post photo MIME types and Snipe formats/limits are OPEN in the baseline: no invented rows.
INSERT INTO upload_policies(upload_context, mime_type, max_bytes) VALUES
    ('profile','image/jpeg',10000000), ('profile','image/png',10000000), ('profile','image/heic',10000000),
    ('avatar_face','image/jpeg',10000000), ('avatar_face','image/png',10000000),
    ('avatar_face','image/webp',10000000), ('avatar_face','image/heic',10000000),
    ('chat_photo','image/jpeg',15000000), ('chat_photo','image/png',15000000),
    ('chat_photo','image/webp',15000000), ('chat_gif','image/gif',15000000);

-- SRS-607.1, 615.1, 623.1. Wordle is present but disabled until the optional feature is included.
INSERT INTO activities(activity_code,name,description,instructions,included) VALUES
    ('game1','Game 1','Jump across platforms, collect optional coins, and reach the finish flag.',
     'Use Left and Right arrows to move and Space to jump, or the on-screen controls. Avoid gaps and hazards. Reach the flag to complete the level; coins are optional. Retry without a lives limit. Pause stops play; select Resume to continue.',TRUE),
    ('dormspace','DormSpace','Decorate your dorm and visit current friends.',
     'Move using WASD, arrow keys, or on-screen directions. Use E or the interaction control at doors, the elevator, and guestbooks.',TRUE),
    ('wordle','Wordle','Guess the daily five-letter English word in six accepted guesses.',
     'Submit a five-letter word from the approved dictionary. Correct means the right letter in the right position; Present means a remaining occurrence belongs elsewhere; Absent means no unmatched occurrence remains. Six accepted guesses are allowed per day. A new puzzle begins at midnight America/New_York.',FALSE);

-- SRS-116.2, 120.4, 121.4: reusable derived relationships, not duplicate stored facts.
CREATE VIEW current_friendships AS
SELECT request_id, LEAST(sender_id,recipient_id) AS student_low,
       GREATEST(sender_id,recipient_id) AS student_high, decided_at AS accepted_at
FROM friend_requests WHERE status = 'accepted' AND friendship_ended_at IS NULL;

CREATE FUNCTION are_friends(a BIGINT, b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM current_friendships WHERE student_low = LEAST(a,b) AND student_high = GREATEST(a,b));
$$;

CREATE FUNCTION is_blocked(a BIGINT, b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM student_blocks WHERE (blocker_id=a AND blocked_id=b) OR (blocker_id=b AND blocked_id=a));
$$;

-- SRS-200.5, 213.1, 213.3: current sending membership, with historical membership stored separately.
CREATE FUNCTION is_current_participant(c BIGINT, s BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM conversations WHERE conversation_id=c AND
        ((kind='private' AND s IN (private_student_low,private_student_high)) OR
         (kind='group' AND EXISTS (SELECT 1 FROM group_memberships WHERE conversation_id=c AND student_id=s AND left_at IS NULL))));
$$;

-- SRS-200.16 through 200.19: accepted consent must postdate the last ended friendship.
CREATE FUNCTION can_send_private(a BIGINT,b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT NOT is_blocked(a,b) AND (are_friends(a,b) OR EXISTS (
        SELECT 1 FROM message_requests m WHERE m.status='accepted'
        AND LEAST(m.sender_id,m.recipient_id)=LEAST(a,b) AND GREATEST(m.sender_id,m.recipient_id)=GREATEST(a,b)
        AND NOT EXISTS (SELECT 1 FROM friend_requests f
            WHERE LEAST(f.sender_id,f.recipient_id)=LEAST(a,b) AND GREATEST(f.sender_id,f.recipient_id)=GREATEST(a,b)
              AND f.friendship_ended_at IS NOT NULL AND f.friendship_ended_at >= m.created_at)));
$$;

-- SRS-109.3/4, 201.4/5/13, 510.2, 609.3/4: accepted media must satisfy its policy.
CREATE FUNCTION validate_media() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE lim BIGINT;
BEGIN
    SELECT max_bytes INTO lim FROM upload_policies WHERE upload_context=NEW.upload_context AND mime_type=NEW.mime_type;
    IF lim IS NULL OR NEW.byte_count > lim THEN RAISE EXCEPTION 'Unsupported media or upload limit exceeded'; END IF;
    IF NEW.upload_context='post_photo' AND NEW.byte_count > 10000000 THEN RAISE EXCEPTION 'Post photo exceeds 10 MB'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_media BEFORE INSERT OR UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION validate_media();

CREATE FUNCTION require_media(asset BIGINT, owner BIGINT, context TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM media_assets WHERE asset_id=asset AND owner_id=owner AND upload_context=context)
    THEN RAISE EXCEPTION 'Media owner or workflow does not match'; END IF;
END;
$$;

-- SRS-110.6 and media ownership protect committed profile/face selections.
CREATE FUNCTION validate_profile() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NEW.photo_id IS NOT NULL THEN PERFORM require_media(NEW.photo_id,NEW.student_id,'profile'); END IF;
    IF TG_OP='UPDATE' AND NEW.display_name IS DISTINCT FROM OLD.display_name THEN
        IF OLD.display_name_changed_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN RAISE EXCEPTION 'Display name may change only every seven days'; END IF;
        NEW.display_name_changed_at := CURRENT_TIMESTAMP;
    ELSIF TG_OP='UPDATE' THEN NEW.display_name_changed_at := OLD.display_name_changed_at;
    ELSIF NEW.display_name IS NOT NULL THEN NEW.display_name_changed_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_profile BEFORE INSERT OR UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION validate_profile();

-- SRS-203.4, 204.3, 208.9: defer the exactly-one-owner check to transaction end
-- so creation and owner-to-administrator transfers can be atomic.
CREATE FUNCTION check_group_structure() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE c BIGINT;
BEGIN
    c := COALESCE(NEW.conversation_id,OLD.conversation_id);
    IF EXISTS (SELECT 1 FROM conversations WHERE conversation_id=c AND kind='group') THEN
        IF (SELECT count(*) FROM group_memberships WHERE conversation_id=c AND role='owner' AND left_at IS NULL) <> 1
        THEN RAISE EXCEPTION 'A group must have exactly one current owner'; END IF;
    ELSIF EXISTS (SELECT 1 FROM group_memberships WHERE conversation_id=c) THEN
        RAISE EXCEPTION 'Private conversation participants are its fixed pair, not group memberships';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER group_conversation_structure AFTER INSERT OR UPDATE ON conversations
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_group_structure();
CREATE CONSTRAINT TRIGGER group_membership_structure AFTER INSERT OR UPDATE OR DELETE ON group_memberships
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_group_structure();

CREATE FUNCTION validate_group_membership() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    PERFORM 1 FROM conversations WHERE conversation_id=NEW.conversation_id AND kind='group' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Group membership requires a group conversation'; END IF;
    IF TG_OP='UPDATE' AND (NEW.conversation_id,NEW.student_id,NEW.joined_at) IS DISTINCT FROM (OLD.conversation_id,OLD.student_id,OLD.joined_at)
    THEN RAISE EXCEPTION 'Membership identity and start time are immutable'; END IF;
    IF EXISTS (SELECT 1 FROM group_memberships m WHERE m.conversation_id=NEW.conversation_id AND m.student_id=NEW.student_id
        AND m.membership_id<>NEW.membership_id AND tstzrange(m.joined_at,m.left_at,'[)') && tstzrange(NEW.joined_at,NEW.left_at,'[)'))
    THEN RAISE EXCEPTION 'Membership periods cannot overlap'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_membership BEFORE INSERT OR UPDATE ON group_memberships FOR EACH ROW EXECUTE FUNCTION validate_group_membership();

-- SRS-205.1/2: invitation records may be created only for friends by a current group manager.
CREATE FUNCTION validate_group_invitation() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT are_friends(NEW.inviter_id,NEW.invitee_id) OR is_blocked(NEW.inviter_id,NEW.invitee_id)
       OR NOT EXISTS (SELECT 1 FROM group_memberships WHERE conversation_id=NEW.conversation_id AND student_id=NEW.inviter_id
           AND role IN ('owner','administrator') AND left_at IS NULL)
    THEN RAISE EXCEPTION 'Group invitation requires a current manager and eligible friend'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_group_invitation BEFORE INSERT ON group_invitations FOR EACH ROW EXECUTE FUNCTION validate_group_invitation();

CREATE FUNCTION validate_contact_request() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF TG_OP='UPDATE' AND (NEW.sender_id,NEW.recipient_id) IS DISTINCT FROM (OLD.sender_id,OLD.recipient_id)
    THEN RAISE EXCEPTION 'Request endpoints are immutable'; END IF;
    IF is_blocked(NEW.sender_id,NEW.recipient_id) AND
       (TG_OP='INSERT' OR NEW.status='pending' OR (NEW.status='accepted' AND OLD.status<>'accepted'))
    THEN RAISE EXCEPTION 'Blocked accounts cannot create or accept contact requests'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_friend_request BEFORE INSERT OR UPDATE ON friend_requests FOR EACH ROW EXECUTE FUNCTION validate_contact_request();
CREATE TRIGGER validate_message_request BEFORE INSERT OR UPDATE ON message_requests FOR EACH ROW EXECUTE FUNCTION validate_contact_request();

CREATE FUNCTION validate_message() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE c conversations%ROWTYPE; mr message_requests%ROWTYPE;
BEGIN
    SELECT * INTO c FROM conversations WHERE conversation_id=NEW.conversation_id FOR UPDATE;
    IF TG_OP='UPDATE' AND (NEW.conversation_id,NEW.sender_id) IS DISTINCT FROM (OLD.conversation_id,OLD.sender_id)
    THEN RAISE EXCEPTION 'Message identity cannot move'; END IF;
    IF NEW.status='sent' THEN
        IF NOT is_current_participant(c.conversation_id,NEW.sender_id) THEN RAISE EXCEPTION 'Sender is not a current participant'; END IF;
        IF c.kind='private' AND NOT can_send_private(c.private_student_low,c.private_student_high)
        THEN RAISE EXCEPTION 'Private messaging requires current consent and no block'; END IF;
    END IF;
    IF NEW.kind='photo' THEN PERFORM require_media(NEW.asset_id,NEW.sender_id,'chat_photo'); END IF;
    IF NEW.kind='gif_upload' THEN PERFORM require_media(NEW.asset_id,NEW.sender_id,'chat_gif'); END IF;
    IF NEW.kind='request' THEN
        SELECT * INTO mr FROM message_requests WHERE request_id=NEW.accepted_request_id;
        IF mr.status IS DISTINCT FROM 'accepted' OR mr.sender_id<>NEW.sender_id OR c.kind<>'private'
          OR LEAST(mr.sender_id,mr.recipient_id)<>c.private_student_low OR GREATEST(mr.sender_id,mr.recipient_id)<>c.private_student_high
        THEN RAISE EXCEPTION 'Introduction must match an accepted request for this private pair'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_message BEFORE INSERT OR UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION validate_message();

-- SRS-213.5: data predicate used by the authenticated server for historical reads.
CREATE FUNCTION can_read_message(s BIGINT, m BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT EXISTS (SELECT 1 FROM messages msg JOIN conversations c USING(conversation_id)
    WHERE msg.message_id=m AND (msg.status='sent' OR msg.sender_id=s) AND
      ((c.kind='private' AND s IN (c.private_student_low,c.private_student_high)) OR
       (c.kind='group' AND EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.conversation_id=c.conversation_id
           AND gm.student_id=s AND COALESCE(msg.sent_at,msg.created_at)>=gm.joined_at
           AND (gm.left_at IS NULL OR COALESCE(msg.sent_at,msg.created_at)<gm.left_at)))));
$$;

CREATE FUNCTION validate_message_receipt() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT can_read_message(NEW.student_id,NEW.message_id) THEN RAISE EXCEPTION 'No access to this message'; END IF;
    IF TG_TABLE_NAME='message_reactions' AND NOT EXISTS (
        SELECT 1 FROM messages m JOIN conversations c USING(conversation_id) WHERE m.message_id=NEW.message_id
        AND c.kind='group' AND is_current_participant(c.conversation_id,NEW.student_id))
    THEN RAISE EXCEPTION 'Reaction requires current group membership'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_read BEFORE INSERT OR UPDATE ON message_reads FOR EACH ROW EXECUTE FUNCTION validate_message_receipt();
CREATE TRIGGER validate_reaction BEFORE INSERT OR UPDATE ON message_reactions FOR EACH ROW EXECUTE FUNCTION validate_message_receipt();

-- SRS-303/304: a published post must have nonblank text or at least one photograph.
CREATE FUNCTION check_post_content() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE p BIGINT;
BEGIN
    p := COALESCE(NEW.post_id,OLD.post_id);
    IF EXISTS (SELECT 1 FROM posts WHERE post_id=p AND COALESCE(btrim(text_content),'')='')
        AND NOT EXISTS (SELECT 1 FROM post_photos WHERE post_id=p)
    THEN RAISE EXCEPTION 'A published post must contain text or a photo'; END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER post_content AFTER INSERT OR UPDATE ON posts DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_post_content();
CREATE CONSTRAINT TRIGGER post_photo_content AFTER INSERT OR UPDATE OR DELETE ON post_photos DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_post_content();
CREATE FUNCTION validate_post_photo() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE author BIGINT;
BEGIN
    SELECT author_id INTO author FROM posts WHERE post_id=NEW.post_id;
    PERFORM require_media(NEW.asset_id,author,'post_photo'); RETURN NEW;
END;
$$;
CREATE TRIGGER validate_post_photo BEFORE INSERT OR UPDATE ON post_photos FOR EACH ROW EXECUTE FUNCTION validate_post_photo();

-- SRS-314.3: the fifth accepted report deletes the post and dependent feed content.
-- "Valid report" eligibility is an open SRS rule; trusted service inserts accepted reports only.
CREATE FUNCTION apply_report_threshold() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    PERFORM 1 FROM posts WHERE post_id=NEW.post_id FOR UPDATE;
    IF (SELECT count(*) FROM post_reports WHERE post_id=NEW.post_id)>=5 THEN DELETE FROM posts WHERE post_id=NEW.post_id; END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER report_threshold AFTER INSERT ON post_reports FOR EACH ROW EXECUTE FUNCTION apply_report_threshold();

-- SRS-403.4: existing RSVP changes close when the event begins.
CREATE FUNCTION validate_rsvp() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NEW.rsvp IS DISTINCT FROM OLD.rsvp AND EXISTS (SELECT 1 FROM events WHERE event_id=NEW.event_id AND starts_at<=CURRENT_TIMESTAMP)
    THEN RAISE EXCEPTION 'RSVP changes require a future event'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_rsvp BEFORE UPDATE ON event_invitations FOR EACH ROW EXECUTE FUNCTION validate_rsvp();

-- SRS-608.1/610.1: no mixing avatar outfit items with furniture or another account's photo.
CREATE FUNCTION validate_avatar() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF TG_TABLE_NAME='avatar_photo_faces' THEN PERFORM require_media(NEW.photo_id,NEW.student_id,'avatar_face');
    ELSIF NOT EXISTS (SELECT 1 FROM catalog_items WHERE item_id=NEW.outfit_id AND kind='outfit')
    THEN RAISE EXCEPTION 'Avatar requires a complete outfit'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_avatar_face BEFORE INSERT OR UPDATE ON avatar_photo_faces FOR EACH ROW EXECUTE FUNCTION validate_avatar();
CREATE TRIGGER validate_avatar BEFORE INSERT OR UPDATE ON student_avatars FOR EACH ROW EXECUTE FUNCTION validate_avatar();

-- SRS-500.8 through 500.10: database checks coordinates, reserved cells and explicit overlap pairs.
CREATE FUNCTION validate_placement() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE f item_footprints%ROWTYPE; s room_surfaces%ROWTYPE;
BEGIN
    PERFORM 1 FROM dorms WHERE owner_id=NEW.owner_id FOR UPDATE;
    SELECT * INTO f FROM item_footprints WHERE item_id=NEW.item_id;
    SELECT * INTO s FROM room_surfaces WHERE surface_code=f.surface_code;
    IF NEW.x+f.width_cells>s.width_cells OR NEW.y+f.height_cells>s.height_cells
    THEN RAISE EXCEPTION 'Placement exceeds room bounds'; END IF;
    IF EXISTS (SELECT 1 FROM reserved_room_cells WHERE surface_code=f.surface_code
        AND x>=NEW.x AND x<NEW.x+f.width_cells AND y>=NEW.y AND y<NEW.y+f.height_cells)
    THEN RAISE EXCEPTION 'Placement blocks a reserved entrance or exit'; END IF;
    IF EXISTS (SELECT 1 FROM dorm_placements p JOIN item_footprints q USING(item_id)
        WHERE p.owner_id=NEW.owner_id AND p.item_id<>NEW.item_id AND q.surface_code=f.surface_code
        AND p.x<NEW.x+f.width_cells AND NEW.x<p.x+q.width_cells
        AND p.y<NEW.y+f.height_cells AND NEW.y<p.y+q.height_cells
        AND NOT EXISTS (SELECT 1 FROM compatible_item_overlaps WHERE item_low=LEAST(p.item_id,NEW.item_id) AND item_high=GREATEST(p.item_id,NEW.item_id)))
    THEN RAISE EXCEPTION 'Items are not permitted to overlap'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_placement BEFORE INSERT OR UPDATE ON dorm_placements FOR EACH ROW EXECUTE FUNCTION validate_placement();

CREATE FUNCTION validate_dorm_appearance() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NEW.wall_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM catalog_items WHERE item_id=NEW.wall_item_id AND kind='wall')
    THEN RAISE EXCEPTION 'Wall selection requires a wall item'; END IF;
    IF NEW.floor_item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM catalog_items WHERE item_id=NEW.floor_item_id AND kind='floor')
    THEN RAISE EXCEPTION 'Floor selection requires a floor item'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_dorm_appearance BEFORE INSERT OR UPDATE ON dorms FOR EACH ROW EXECUTE FUNCTION validate_dorm_appearance();

CREATE FUNCTION validate_guestbook_note() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF TG_OP='UPDATE' AND (NEW.author_id,NEW.dorm_owner_id,NEW.created_at) IS DISTINCT FROM (OLD.author_id,OLD.dorm_owner_id,OLD.created_at)
    THEN RAISE EXCEPTION 'Note authorship and original timestamp are immutable'; END IF;
    IF NOT are_friends(NEW.author_id,NEW.dorm_owner_id) THEN RAISE EXCEPTION 'A current friend is required for guestbook notes'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_guestbook_note BEFORE INSERT OR UPDATE ON guestbook_notes FOR EACH ROW EXECUTE FUNCTION validate_guestbook_note();

-- SRS-509.9: locking the dorm serializes counted entries; no duplicate counter is stored.
CREATE FUNCTION validate_counted_visit() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    PERFORM 1 FROM dorms WHERE owner_id=NEW.dorm_owner_id FOR UPDATE;
    IF NOT are_friends(NEW.dorm_owner_id,NEW.visitor_id) THEN RAISE EXCEPTION 'Counted visit requires a current friend'; END IF;
    IF EXISTS (SELECT 1 FROM counted_dorm_visits WHERE dorm_owner_id=NEW.dorm_owner_id AND visitor_id=NEW.visitor_id
        AND abs(extract(epoch FROM entered_at-NEW.entered_at))<86400)
    THEN RAISE EXCEPTION 'A counted visit already exists within 24 elapsed hours'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_counted_visit BEFORE INSERT ON counted_dorm_visits FOR EACH ROW EXECUTE FUNCTION validate_counted_visit();

-- SRS-624.8/625.3: exactly the next guess, at most six, and no submissions after a correct guess.
CREATE FUNCTION validate_wordle_guess() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE next_no INTEGER; answer_word VARCHAR(5);
BEGIN
    PERFORM 1 FROM students WHERE student_id=NEW.student_id FOR UPDATE;
    SELECT answer INTO answer_word FROM wordle_puzzles WHERE puzzle_date=NEW.puzzle_date;
    IF NOT EXISTS(SELECT 1 FROM activities WHERE activity_code='wordle' AND included)
    THEN RAISE EXCEPTION 'Wordle is not included in this release configuration'; END IF;
    SELECT count(*)+1 INTO next_no FROM wordle_guesses WHERE student_id=NEW.student_id AND puzzle_date=NEW.puzzle_date;
    IF NEW.guess_number<>next_no OR EXISTS (SELECT 1 FROM wordle_guesses WHERE student_id=NEW.student_id AND puzzle_date=NEW.puzzle_date AND word=answer_word)
    THEN RAISE EXCEPTION 'Invalid guess sequence or completed daily puzzle'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_wordle_guess BEFORE INSERT ON wordle_guesses FOR EACH ROW EXECUTE FUNCTION validate_wordle_guess();

-- SRS-613.10/11: validate IANA zones and prevent later device/travel changes.
CREATE FUNCTION validate_participation_zone() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=NEW.time_zone) THEN RAISE EXCEPTION 'Unknown participation time zone'; END IF;
    IF TG_OP='UPDATE' AND (NEW.student_id,NEW.time_zone) IS DISTINCT FROM (OLD.student_id,OLD.time_zone)
    THEN RAISE EXCEPTION 'Initial participation time zone cannot change'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_participation_zone BEFORE INSERT OR UPDATE ON participation_settings FOR EACH ROW EXECUTE FUNCTION validate_participation_zone();

CREATE FUNCTION validate_participation_event() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM activities WHERE activity_code=NEW.activity_code AND included)
    THEN RAISE EXCEPTION 'Activity is not included'; END IF;
    IF NEW.activity_code='wordle' AND NOT EXISTS(SELECT 1 FROM wordle_guesses WHERE guess_id=NEW.wordle_guess_id AND accepted_at=NEW.occurred_at)
    THEN RAISE EXCEPTION 'Wordle participation must use the accepted guess time'; END IF;
    IF NEW.activity_code='game1' AND NEW.game_level>1 AND NOT EXISTS (
        SELECT 1 FROM level_completions l JOIN participation_events e ON e.event_id=l.attempt_id
        WHERE e.student_id=NEW.student_id AND e.game_level=NEW.game_level-1)
    THEN RAISE EXCEPTION 'Previous level is not completed'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_participation_event BEFORE INSERT ON participation_events FOR EACH ROW EXECUTE FUNCTION validate_participation_event();

CREATE FUNCTION validate_participation_day() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE week_start DATE; expected_day DATE; started DATE; ended DATE;
BEGIN
    PERFORM 1 FROM participation_settings WHERE student_id=NEW.student_id FOR UPDATE;
    week_start := NEW.participation_date - extract(dow FROM NEW.participation_date)::integer;
    IF NEW.state='played' THEN
        SELECT (e.occurred_at AT TIME ZONE p.time_zone)::date INTO expected_day
        FROM participation_events e JOIN participation_settings p USING(student_id) WHERE e.event_id=NEW.first_event_id;
        IF expected_day IS DISTINCT FROM NEW.participation_date THEN RAISE EXCEPTION 'Activity and participation dates disagree'; END IF;
    END IF;
    IF NEW.streak_id IS NOT NULL THEN
        SELECT started_on,reset_on INTO started,ended FROM streak_instances WHERE streak_id=NEW.streak_id;
        IF NEW.participation_date<started OR (ended IS NOT NULL AND NEW.participation_date>ended)
        THEN RAISE EXCEPTION 'Participation date is outside its streak'; END IF;
    END IF;
    IF NEW.state='forgiven' AND (SELECT count(*) FROM participation_days WHERE student_id=NEW.student_id
        AND participation_date>=week_start AND participation_date<week_start+7 AND participation_date<>NEW.participation_date AND state='forgiven')>=3
    THEN RAISE EXCEPTION 'Three forgiven misses have already been used this Sunday-Saturday week'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_participation_day BEFORE INSERT OR UPDATE ON participation_days FOR EACH ROW EXECUTE FUNCTION validate_participation_day();

CREATE FUNCTION validate_completion() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM participation_events WHERE event_id=NEW.attempt_id AND activity_code='game1' AND occurred_at<=NEW.completed_at)
    THEN RAISE EXCEPTION 'Completion must reference a started Game 1 attempt'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_completion BEFORE INSERT ON level_completions FOR EACH ROW EXECUTE FUNCTION validate_completion();

-- SRS-510.9, 512.12, 513.8: serialize a photographer's submissions and preserve terminal outcomes.
CREATE FUNCTION validate_snipe() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    PERFORM 1 FROM students WHERE student_id=NEW.submitter_id FOR UPDATE;
    IF TG_OP='INSERT' THEN
        IF NEW.status<>'pending' THEN RAISE EXCEPTION 'A new Snipe starts pending'; END IF;
        IF NOT is_current_participant(NEW.conversation_id,NEW.submitter_id) THEN RAISE EXCEPTION 'Submitter is not a current participant'; END IF;
        PERFORM require_media(NEW.photo_id,NEW.submitter_id,'snipe');
    ELSE
        IF OLD.review_locked AND NOT NEW.review_locked THEN RAISE EXCEPTION 'Snipe review cannot be unlocked'; END IF;
        IF (NEW.submitter_id,NEW.conversation_id,NEW.photo_id,NEW.submission_key,NEW.submitted_at,NEW.expires_at)
            IS DISTINCT FROM (OLD.submitter_id,OLD.conversation_id,OLD.photo_id,OLD.submission_key,OLD.submitted_at,OLD.expires_at)
        THEN RAISE EXCEPTION 'Snipe review identity is immutable'; END IF;
        IF NEW.status<>OLD.status AND NOT ((OLD.status='pending' AND NEW.status IN ('approved','rejected','expired','canceled','closed')) OR (OLD.status='approved' AND NEW.status='removed'))
        THEN RAISE EXCEPTION 'Invalid Snipe lifecycle transition'; END IF;
        IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN RAISE EXCEPTION 'Original publication time is immutable'; END IF;
        IF OLD.status='pending' AND NEW.status='approved' THEN
            IF CURRENT_TIMESTAMP>=NEW.expires_at THEN RAISE EXCEPTION 'Expired Snipe cannot be published'; END IF;
            NEW.published_at:=CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_snipe BEFORE INSERT OR UPDATE ON snipe_requests FOR EACH ROW EXECUTE FUNCTION validate_snipe();

CREATE FUNCTION validate_snipe_tag() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE s snipe_requests%ROWTYPE;
BEGIN
    SELECT * INTO s FROM snipe_requests WHERE snipe_id=COALESCE(NEW.snipe_id,OLD.snipe_id) FOR UPDATE;
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Original Snipe tags cannot be deleted'; END IF;
    IF TG_OP='INSERT' THEN
        PERFORM 1 FROM students WHERE student_id=s.submitter_id FOR UPDATE;
        IF s.review_locked OR s.status<>'pending' OR s.submitter_id=NEW.student_id OR NOT are_friends(s.submitter_id,NEW.student_id)
            OR NOT is_current_participant(s.conversation_id,NEW.student_id)
        THEN RAISE EXCEPTION 'Ineligible Snipe target'; END IF;
        IF EXISTS (SELECT 1 FROM snipe_tags t JOIN snipe_requests r USING(snipe_id)
            WHERE r.submitter_id=s.submitter_id AND t.student_id=NEW.student_id AND r.snipe_id<>s.snipe_id
            AND abs(extract(epoch FROM r.submitted_at-s.submitted_at))<86400)
        THEN RAISE EXCEPTION 'Submitter-target Snipe cooldown is 24 elapsed hours'; END IF;
    ELSE
        IF (NEW.snipe_id,NEW.student_id) IS DISTINCT FROM (OLD.snipe_id,OLD.student_id)
        THEN RAISE EXCEPTION 'Original Snipe tag identity cannot change'; END IF;
        IF s.status<>'pending' AND (NEW.identity_yes,NEW.sharing_yes) IS DISTINCT FROM (OLD.identity_yes,OLD.sharing_yes)
        THEN RAISE EXCEPTION 'Consent answers cannot change after request closes'; END IF;
        IF s.status='pending' AND CURRENT_TIMESTAMP>=s.expires_at THEN RAISE EXCEPTION 'Snipe request expired'; END IF;
        IF OLD.sharing_withdrawn AND NOT NEW.sharing_withdrawn THEN RAISE EXCEPTION 'Sharing withdrawal cannot be undone'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_snipe_tag BEFORE INSERT OR UPDATE OR DELETE ON snipe_tags FOR EACH ROW EXECUTE FUNCTION validate_snipe_tag();

-- SRS-511.6/7/8/10: enforce all-party consent at commit, after tags are inserted.
CREATE FUNCTION check_snipe_consent() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE s snipe_requests%ROWTYPE;
BEGIN
    SELECT * INTO s FROM snipe_requests WHERE snipe_id=COALESCE(NEW.snipe_id,OLD.snipe_id);
    IF NOT FOUND THEN RETURN NULL; END IF;
    IF NOT s.review_locked THEN RAISE EXCEPTION 'Seal the original Snipe tag list before committing submission'; END IF;
    IF NOT EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id) THEN RAISE EXCEPTION 'Snipe requires at least one original tag'; END IF;
    IF s.status='approved' THEN
        IF NOT EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND identity_yes IS TRUE)
           OR EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND (identity_yes IS NULL OR sharing_yes IS DISTINCT FROM TRUE OR sharing_withdrawn))
        THEN RAISE EXCEPTION 'Snipe publication requires every sharing approval and at least one verified target'; END IF;
        -- Eligibility is checked on the transition, not reimposed on an old approved Snipe.
        IF TG_TABLE_NAME='snipe_requests' THEN
            IF OLD.status='pending' THEN
                IF NOT is_current_participant(s.conversation_id,s.submitter_id) OR EXISTS(SELECT 1 FROM snipe_tags t WHERE t.snipe_id=s.snipe_id
                    AND (NOT are_friends(s.submitter_id,t.student_id) OR NOT is_current_participant(s.conversation_id,t.student_id)))
                THEN RAISE EXCEPTION 'Snipe publication eligibility no longer holds'; END IF;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER snipe_request_consent AFTER INSERT OR UPDATE ON snipe_requests DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_snipe_consent();
CREATE CONSTRAINT TRIGGER snipe_tag_consent AFTER INSERT OR UPDATE ON snipe_tags DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_snipe_consent();

-- SRS-511.7/8/10/11/12: derive request outcome after a sealed consent response changes.
CREATE FUNCTION apply_snipe_consent() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE s snipe_requests%ROWTYPE;
BEGIN
    SELECT * INTO s FROM snipe_requests WHERE snipe_id=NEW.snipe_id FOR UPDATE;
    IF NOT s.review_locked THEN RETURN NULL; END IF;
    IF s.status IN ('pending','approved') AND EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND sharing_withdrawn) THEN
        UPDATE snipe_requests SET status=CASE WHEN s.status='pending' THEN 'canceled' ELSE 'removed' END,
            terminal_reason='Sharing permission withdrawn' WHERE snipe_id=s.snipe_id;
    ELSIF s.status='pending' AND EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND sharing_yes IS FALSE) THEN
        UPDATE snipe_requests SET status='rejected',terminal_reason='Sharing permission declined' WHERE snipe_id=s.snipe_id;
    ELSIF s.status='pending' AND EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id)
        AND NOT EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND (identity_yes IS NULL OR sharing_yes IS NULL)) THEN
        IF EXISTS(SELECT 1 FROM snipe_tags WHERE snipe_id=s.snipe_id AND identity_yes IS TRUE) THEN
            UPDATE snipe_requests SET status='approved',published_at=CURRENT_TIMESTAMP WHERE snipe_id=s.snipe_id;
        ELSE
            UPDATE snipe_requests SET status='closed',terminal_reason='No verified targets' WHERE snipe_id=s.snipe_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER consent_outcome AFTER INSERT OR UPDATE ON snipe_tags FOR EACH ROW EXECUTE FUNCTION apply_snipe_consent();
CREATE TRIGGER sealed_submission_outcome AFTER UPDATE ON snipe_requests
    FOR EACH ROW WHEN (NEW.review_locked AND NOT OLD.review_locked) EXECUTE FUNCTION apply_snipe_consent();

-- SRS-512.7: leaving a group cancels pending submissions involving that former member.
CREATE FUNCTION cancel_snipes_after_departure() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF OLD.left_at IS NULL AND NEW.left_at IS NOT NULL THEN
        UPDATE snipe_requests r SET status='canceled',terminal_reason='Required participant left the conversation'
        WHERE r.conversation_id=NEW.conversation_id AND r.status='pending'
        AND (r.submitter_id=NEW.student_id OR EXISTS(SELECT 1 FROM snipe_tags t WHERE t.snipe_id=r.snipe_id AND t.student_id=NEW.student_id));
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER cancel_departed_snipes AFTER UPDATE ON group_memberships FOR EACH ROW EXECUTE FUNCTION cancel_snipes_after_departure();

CREATE FUNCTION validate_snipe_report() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE c BIGINT;
BEGIN
    SELECT r.conversation_id INTO c FROM snipe_requests r JOIN conversations v USING(conversation_id)
      WHERE r.snipe_id=NEW.snipe_id AND v.kind='group';
    IF c IS NULL THEN RAISE EXCEPTION 'Snipe reports are for group conversations only'; END IF;
    IF TG_OP='INSERT' AND NOT is_current_participant(c,NEW.reporter_id) THEN RAISE EXCEPTION 'Reporter must be a current member'; END IF;
    IF NEW.resolved_by IS NOT NULL AND NOT EXISTS(SELECT 1 FROM group_memberships WHERE conversation_id=c AND student_id=NEW.resolved_by
        AND role IN ('owner','administrator') AND left_at IS NULL)
    THEN RAISE EXCEPTION 'Report resolution requires a current group manager'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_snipe_report BEFORE INSERT OR UPDATE ON snipe_reports FOR EACH ROW EXECUTE FUNCTION validate_snipe_report();

-- SRS-121.6/7, 508.20, 512.7: dependent friendship cleanup is atomic.
CREATE FUNCTION after_friendship_change() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF OLD.status='accepted' AND OLD.friendship_ended_at IS NULL AND NEW.friendship_ended_at IS NOT NULL THEN
        DELETE FROM guestbook_notes WHERE (author_id=NEW.sender_id AND dorm_owner_id=NEW.recipient_id)
            OR (author_id=NEW.recipient_id AND dorm_owner_id=NEW.sender_id);
        UPDATE snipe_requests r SET status='canceled',terminal_reason='Required friendship ended'
            WHERE r.status='pending' AND EXISTS(SELECT 1 FROM snipe_tags t WHERE t.snipe_id=r.snipe_id
            AND LEAST(r.submitter_id,t.student_id)=LEAST(NEW.sender_id,NEW.recipient_id)
            AND GREATEST(r.submitter_id,t.student_id)=GREATEST(NEW.sender_id,NEW.recipient_id));
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER friendship_cleanup AFTER UPDATE ON friend_requests FOR EACH ROW EXECUTE FUNCTION after_friendship_change();
CREATE FUNCTION apply_block() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    UPDATE friend_requests SET status='blocked',decided_at=CURRENT_TIMESTAMP
        WHERE status='pending' AND LEAST(sender_id,recipient_id)=LEAST(NEW.blocker_id,NEW.blocked_id)
            AND GREATEST(sender_id,recipient_id)=GREATEST(NEW.blocker_id,NEW.blocked_id);
    UPDATE friend_requests SET friendship_ended_at=CURRENT_TIMESTAMP
        WHERE status='accepted' AND friendship_ended_at IS NULL AND LEAST(sender_id,recipient_id)=LEAST(NEW.blocker_id,NEW.blocked_id)
            AND GREATEST(sender_id,recipient_id)=GREATEST(NEW.blocker_id,NEW.blocked_id);
    RETURN NULL;
END;
$$;
CREATE TRIGGER block_cleanup AFTER INSERT ON student_blocks FOR EACH ROW EXECUTE FUNCTION apply_block();

-- SRS-523: lock an account before valuing a ledger entry; history amounts never change.
-- Reward configuration is empty until approved. Unknown amounts cannot accidentally become zero rewards.
CREATE FUNCTION validate_points_transaction() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE rule reward_rules%ROWTYPE; item catalog_items%ROWTYPE; units INTEGER; balance NUMERIC;
BEGIN
    -- A row version change forces serialization failure rather than stale spending at REPEATABLE READ.
    UPDATE students SET failed_login_count=failed_login_count WHERE student_id=NEW.student_id;
    -- Allocate history sequence after the account lock, preserving per-account commitment order.
    NEW.transaction_id := nextval(pg_get_serial_sequence('socialu.point_transactions','transaction_id'));
    NEW.recorded_at := clock_timestamp();
    SELECT COALESCE(sum(points_change),0) INTO balance FROM point_transactions WHERE student_id=NEW.student_id;
    IF NEW.category='purchase' THEN
        SELECT * INTO item FROM catalog_items WHERE item_id=NEW.purchased_item_id FOR SHARE;
        IF NOT FOUND OR NOT item.purchasable OR item.unavailable_reason IS NOT NULL OR item.price_points IS NULL
        THEN RAISE EXCEPTION 'Item has no available confirmed offer'; END IF;
        IF EXISTS(SELECT 1 FROM owned_items WHERE student_id=NEW.student_id AND item_id=item.item_id) THEN RAISE EXCEPTION 'Item already owned'; END IF;
        IF NEW.points_change IS DISTINCT FROM -item.price_points THEN RAISE EXCEPTION 'Price changed; confirmation required'; END IF;
        IF balance<item.price_points THEN RAISE EXCEPTION 'Insufficient points'; END IF;
    ELSE
        SELECT * INTO rule FROM reward_rules WHERE rule_id=NEW.reward_rule_id AND category=NEW.category AND is_current FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'No current approved reward rule'; END IF;
        units := 1;
        CASE NEW.category
        WHEN 'snipe' THEN
            IF NOT EXISTS(SELECT 1 FROM snipe_requests WHERE snipe_id=NEW.snipe_id AND submitter_id=NEW.student_id AND status='approved')
            THEN RAISE EXCEPTION 'Snipe reward requires approved publication by this photographer'; END IF;
            SELECT count(*) INTO units FROM snipe_tags WHERE snipe_id=NEW.snipe_id AND identity_yes IS TRUE;
        WHEN 'level_completion' THEN
            IF NOT EXISTS(SELECT 1 FROM level_completions l JOIN participation_events e ON e.event_id=l.attempt_id
                WHERE l.attempt_id=NEW.attempt_id AND e.student_id=NEW.student_id)
            THEN RAISE EXCEPTION 'Game reward requires this accounts confirmed completion'; END IF;
        WHEN 'daily_participation' THEN
            IF NOT EXISTS(SELECT 1 FROM participation_days WHERE student_id=NEW.student_id AND participation_date=NEW.participation_date AND state='played')
            THEN RAISE EXCEPTION 'Daily reward requires a qualified participation day'; END IF;
        WHEN 'streak_milestone' THEN
            IF rule.milestone_days IS DISTINCT FROM NEW.milestone_days OR (SELECT count(*) FROM participation_days
                WHERE student_id=NEW.student_id AND streak_id=NEW.streak_id AND state='played')<NEW.milestone_days
            THEN RAISE EXCEPTION 'Shared streak has not reached this milestone'; END IF;
        END CASE;
        NEW.reward_units := units;
        NEW.points_change := rule.points_per_unit*units;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_points_transaction BEFORE INSERT ON point_transactions FOR EACH ROW EXECUTE FUNCTION validate_points_transaction();
CREATE FUNCTION grant_purchase() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NEW.category='purchase' THEN
        INSERT INTO owned_items(student_id,item_id,purchase_transaction_id) VALUES(NEW.student_id,NEW.purchased_item_id,NEW.transaction_id);
    END IF;
    RETURN NULL;
END;
$$;
CREATE TRIGGER grant_purchase AFTER INSERT ON point_transactions FOR EACH ROW EXECUTE FUNCTION grant_purchase();
CREATE FUNCTION validate_owned_purchase() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NEW.purchase_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM point_transactions
        WHERE transaction_id=NEW.purchase_transaction_id AND student_id=NEW.student_id AND category='purchase' AND purchased_item_id=NEW.item_id)
    THEN RAISE EXCEPTION 'Ownership must match its purchase'; END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER validate_owned_purchase AFTER INSERT OR UPDATE ON owned_items DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION validate_owned_purchase();

-- SRS-527.5/6, 624.11, 619.9: committed history/proof rows are append-only.
CREATE FUNCTION deny_history_mutation() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Committed % records are immutable',TG_TABLE_NAME; END;
$$;
CREATE TRIGGER immutable_points BEFORE UPDATE OR DELETE ON point_transactions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
CREATE TRIGGER immutable_guesses BEFORE UPDATE OR DELETE ON wordle_guesses FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
CREATE TRIGGER immutable_completions BEFORE UPDATE OR DELETE ON level_completions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
CREATE TRIGGER immutable_participation_events BEFORE UPDATE OR DELETE ON participation_events FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();

-- SRS-111.2/4, 308.3, 509.6, 520.1/2: derived facts have no duplicate counter columns.
CREATE VIEW points_balances AS
SELECT s.student_id,COALESCE(sum(t.points_change),0) AS balance
FROM students s LEFT JOIN point_transactions t USING(student_id) GROUP BY s.student_id;
CREATE VIEW points_history AS
SELECT t.*,sum(points_change) OVER(PARTITION BY student_id ORDER BY transaction_id ROWS UNBOUNDED PRECEDING) AS resulting_balance
FROM point_transactions t;
CREATE VIEW dorm_visit_counts AS
SELECT d.owner_id,count(v.visit_id) AS visit_count FROM dorms d LEFT JOIN counted_dorm_visits v ON v.dorm_owner_id=d.owner_id GROUP BY d.owner_id;

-- SRS-405.1 through 405.8: one current like per student, rolling 168 elapsed hours.
-- The server must additionally exclude blocked/otherwise inaccessible authors for the requesting student.
CREATE VIEW trending_candidates AS
SELECT p.post_id,p.author_id,p.text_content,p.published_at,count(l.student_id) AS recent_like_count
FROM posts p JOIN students s ON s.student_id=p.author_id JOIN post_likes l USING(post_id)
WHERE p.visibility='public' AND s.is_active AND l.liked_at BETWEEN CURRENT_TIMESTAMP-INTERVAL '168 hours' AND CURRENT_TIMESTAMP
GROUP BY p.post_id ORDER BY recent_like_count DESC,p.published_at DESC,p.post_id ASC;

-- SRS-624.7 and SRS-NFR-60: feedback is derived, with repeated letters consumed correctly.
CREATE FUNCTION wordle_feedback(guess_word TEXT,answer_word TEXT) RETURNS TEXT[]
LANGUAGE plpgsql IMMUTABLE SET search_path = socialu, pg_catalog AS $$
DECLARE result TEXT[]:=ARRAY['absent','absent','absent','absent','absent']; remaining TEXT:=answer_word; i INTEGER; pos INTEGER;
BEGIN
    IF guess_word !~ '^[A-Z]{5}$' OR answer_word !~ '^[A-Z]{5}$' THEN RAISE EXCEPTION 'Wordle requires five A-Z letters'; END IF;
    FOR i IN 1..5 LOOP
        IF substr(guess_word,i,1)=substr(answer_word,i,1) THEN result[i]:='correct'; remaining:=overlay(remaining placing '_' from i for 1); END IF;
    END LOOP;
    FOR i IN 1..5 LOOP
        IF result[i]<>'correct' THEN
            pos:=strpos(remaining,substr(guess_word,i,1));
            IF pos>0 THEN result[i]:='present'; remaining:=overlay(remaining placing '_' from pos for 1); END IF;
        END IF;
    END LOOP;
    RETURN result;
END;
$$;
CREATE VIEW today_wordle_results AS
SELECT g.student_id,g.puzzle_date,count(*) AS guesses_used,bool_or(g.word=p.answer) AS solved,
       (bool_or(g.word=p.answer) OR count(*)=6) AS completed
FROM wordle_guesses g JOIN wordle_puzzles p USING(puzzle_date)
WHERE g.puzzle_date=(CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date
GROUP BY g.student_id,g.puzzle_date;

-- No anonymous/student SQL access is granted by this build. Services get explicit grants in deployment.
-- Row visibility, authenticated actor checks, object storage access, emails and scheduled processing
-- are application/service responsibilities; these declarations are not a claim that those are implemented.
REVOKE ALL ON ALL TABLES IN SCHEMA socialu FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA socialu FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA socialu FROM PUBLIC;
COMMIT;
