/** Leaving a World Explorer level (SRS-622.2 to 622.4). An attempt that is
 * still in progress asks before it is discarded; a finished, failed or still
 * loading run has nothing to lose and leaves at once. */
export type RunStatus='starting'|'running'|'paused'|'discovery'|'complete'|'failed';
export type ExitTarget='world-map'|'game-room';

export function needsLeaveConfirmation(status:RunStatus,finished:boolean):boolean{
 return !finished&&(status==='running'||status==='paused'||status==='discovery');
}
/** The run pauses behind the confirmation; a guide that is open stays open. */
export function statusWhileConfirming(status:RunStatus):RunStatus{return status==='running'?'paused':status;}

export const leaveConfirmation={
 title:'Leave this adventure?',
 body:'Your unfinished attempt and its coins will be discarded. Level progress already saved to your passport is kept.',
 stay:'Stay',
 leave:'Leave Game',
} as const;
