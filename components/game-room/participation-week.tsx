'use client';
import { participationDayLabels, type ParticipationDayState } from '../../lib/participation-calendar';
import { useParticipationCalendar } from './use-participation-calendar';
import styles from './participation-week.module.css';

const symbols: Record<ParticipationDayState, string> = { played: '✓', forgiven: '♡', reset: '↺', inactive: '—', 'today-unqualified': '○', upcoming: '·' };
export function ParticipationWeek() {
  const { data, error, retry } = useParticipationCalendar(true);
  return <section className={styles.week} aria-label="This week's participation">
    <h3>Your participation week</h3>
    {error ? <p role="status">{error} <button type="button" onClick={retry}>Retry weekly status</button></p>
      : !data ? <p role="status">Loading your week…</p> : <>
        <p className={styles.zone}>{data.timeZone ? `Days follow ${data.timeZone}.` : 'Your participation time zone is set when you first play.'}</p>
        <ol className={styles.days}>
          {data.days.map((day, index) => <li key={day.date} data-state={day.state} aria-current={day.date === data.today ? 'date' : undefined}>
            <abbr title={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][index]}</abbr>
            <span aria-hidden="true" className={styles.symbol}>{symbols[day.state]}</span>
            <time dateTime={day.date}>{Number(day.date.slice(-2))}</time>
            <span className={styles.srOnly}>{participationDayLabels[day.state]}</span>
          </li>)}
        </ol>
        <details><summary>What the day symbols mean</summary><ul className={styles.legend}>
          {Object.entries(participationDayLabels).map(([state, label]) => <li key={state}>{symbols[state as ParticipationDayState]} {label}</li>)}
        </ul></details>
      </>}
  </section>;
}
