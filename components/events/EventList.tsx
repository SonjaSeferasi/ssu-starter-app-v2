import React from 'react';
import Link from 'next/link';
import { CalendarDays, Heart, MapPin, Shirt, UserRound } from 'lucide-react';
import styles from '../../app/events/events.module.css';
import { EventArt } from './EventArt';
import { EventActions, GoingSummary } from './EventActions';
import { CoverPhotoButton } from './CoverPhotoButton';
import { TRENDING_MIN_LIKES, formatWhen, monthFormat, weekDays, weekdayFormat, type CampusEvent, type EventEngagement } from '../../lib/events';

type OnEngagement = (eventId: string, engagement: EventEngagement) => void;
const ignore: OnEngagement = () => {};
// Hosts can add or change a cover photo on their own events.
type CoverProps = { hostId?: string | null; onCover?: (eventId: string, url: string | null) => void };

function HostCover({ event, hostId, onCover }: { event: CampusEvent } & CoverProps) {
  if (!hostId || hostId !== event.creator_id || !onCover) return null;
  return <CoverPhotoButton eventId={event.event_id} hasCover={Boolean(event.cover_url)} onChange={(url) => onCover(event.event_id, url)} />;
}

export type { CampusEvent } from '../../lib/events';

export const NO_ACTIVE_EVENTS = 'No active events are available.';

function EventDetails({ event }: { event: CampusEvent }) {
  return (
    <dl className={styles.meta}>
      <div className={styles.metaRow}>
        <dt><CalendarDays aria-label="Date and time" /></dt>
        <dd>{formatWhen(event.starts_at)}</dd>
      </div>
      <div className={styles.metaRow}>
        <dt><MapPin aria-label="Location" /></dt>
        <dd>{event.location}</dd>
      </div>
      {event.dress_code ? (
        <div className={styles.metaRow}>
          <dt><Shirt aria-label="Dress code" /></dt>
          <dd>Dress code: {event.dress_code}</dd>
        </div>
      ) : null}
      <div className={styles.metaRow}>
        <dt><UserRound aria-label="Host" /></dt>
        <dd>Hosted by @{event.creator_username}</dd>
      </div>
    </dl>
  );
}

// The soonest event, shown large at the top of Discover.
export function FeaturedEvent({ event, onEngagement = ignore, hostId, onCover }: { event: CampusEvent; onEngagement?: OnEngagement } & CoverProps) {
  return (
    <article className={styles.featured} aria-labelledby={`featured-${event.event_id}`}>
      <EventArt id={event.event_id} title={event.title} className={styles.featuredArt} coverUrl={event.cover_url}>
        <HostCover event={event} hostId={hostId} onCover={onCover} />
      </EventArt>
      <div className={styles.featuredBody}>
        <p className={styles.kicker}>Next up</p>
        <h2 id={`featured-${event.event_id}`} className={styles.featuredTitle}>
          <Link href={`/events/${event.event_id}`} className={styles.titleLink}>{event.title}</Link>
        </h2>
        <EventDetails event={event} />
        <p className={styles.description}>{event.description}</p>
        <GoingSummary event={event} />
        <EventActions event={event} onChange={(engagement) => onEngagement(event.event_id, engagement)} />
        <Link href={`/events/${event.event_id}`} className={styles.secondaryButton}>View details</Link>
      </div>
    </article>
  );
}

// SRS-401.1-.6: each active event with its current title, description, location, date, and time,
// or a message when no active events are available.
export function EventList({ events, emptyMessage = NO_ACTIVE_EVENTS, emptyHint = 'Check back later, or create an event for your campus.', onEngagement = ignore, hostId, onCover }:
  { events: CampusEvent[]; emptyMessage?: string; emptyHint?: string; onEngagement?: OnEngagement } & CoverProps) {
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{emptyMessage}</h2>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className={styles.grid}>
      {events.map((event) => {
        const startsAt = new Date(event.starts_at);
        return (
          <li key={event.event_id} id={`event-${event.event_id}`} className={styles.card}>
            <div className={styles.cardArtWrap}>
              <EventArt id={event.event_id} title={event.title} className={styles.cardArt} coverUrl={event.cover_url}>
                <HostCover event={event} hostId={hostId} onCover={onCover} />
              </EventArt>
              <p className={styles.dateBadge} aria-hidden="true">
                <span>{monthFormat.format(startsAt)}</span>{startsAt.getDate()}
              </p>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>
                <Link href={`/events/${event.event_id}`} className={styles.titleLink}>{event.title}</Link>
              </h3>
              <EventDetails event={event} />
              <p className={`${styles.description} ${styles.clamp}`}>{event.description}</p>
              <GoingSummary event={event} />
              <EventActions event={event} onChange={(engagement) => onEngagement(event.event_id, engagement)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Monday-to-Sunday strip with today highlighted and a dot on each day that has an event.
export function WeekStrip({ events, today = new Date() }: { events: CampusEvent[]; today?: Date }) {
  return (
    <section className={styles.sideCard} aria-labelledby="this-week">
      <h2 id="this-week" className={styles.sideTitle}>This week</h2>
      <ol className={styles.week}>
        {weekDays(today, events).map((day) => (
          <li key={day.date.toISOString()} className={day.isToday ? styles.today : undefined} aria-current={day.isToday ? 'date' : undefined}>
            <span className={styles.weekday}>{weekdayFormat.format(day.date)}</span>
            <span className={styles.weekDate}>{day.date.getDate()}</span>
            {day.hasEvents ? <span className={styles.dot} aria-label="Has events" /> : <span className={styles.noDot} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

// UR-405: events with 5 or more likes, most liked first.
export function TrendingEvents({ events }: { events: CampusEvent[] }) {
  return (
    <section className={styles.sideCard} aria-labelledby="trending-title">
      <h2 id="trending-title" className={styles.sideTitle}>Trending on campus</h2>
      <p className={styles.sideBody}>Ranked by likes · {TRENDING_MIN_LIKES}+ likes to trend</p>
      {events.length === 0 ? (
        <p className={styles.sideEmpty}>No trending events yet. Events with {TRENDING_MIN_LIKES} or more likes show up here.</p>
      ) : (
        <ol className={styles.trending}>
          {events.map((event, index) => (
            <li key={event.event_id}>
              <Link href={`/events/${event.event_id}`} className={styles.trendingItem}>
                <span className={styles.rank}>{index + 1}</span>
                <EventArt id={event.event_id} title={event.title} className={styles.trendingArt} coverUrl={event.cover_url} />
                <span className={styles.trendingText}>
                  <strong>{event.title}</strong>
                  <span>{formatWhen(event.starts_at)}</span>
                </span>
                <span className={styles.trendingLikes}><Heart aria-hidden="true" fill="currentColor" />{event.like_count}<span className={styles.srOnly}> likes</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
