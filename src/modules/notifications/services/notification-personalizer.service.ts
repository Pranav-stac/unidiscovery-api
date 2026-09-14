import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import type { NotifyPayload } from '../constants/notification-events';

type UserContext = {
  name: string;
  firstName: string;
  email: string;
  board?: string | null;
  grade?: number | null;
  stream?: string | null;
  classGroup?: string | null;
  diagnosticCompleted?: boolean;
  collegesSaved?: number;
  activitiesSaved?: number;
  tutoringAttempts?: number;
  tutoringAccuracy?: number;
};

export type PersonalizedMessage = {
  title: string;
  body: string;
  actionUrl?: string;
  emailSubject?: string;
  emailHtml?: string;
};

@Injectable()
export class NotificationPersonalizerService {
  personalize(
    eventType: NotificationEventType,
    user: UserContext,
    payload: NotifyPayload,
  ): PersonalizedMessage {
    const first = user.firstName;
    switch (eventType) {
      case NotificationEventType.DIAGNOSTIC_COMPLETED:
        return {
          title: `${first}, your diagnostic profile is ready`,
          body: `We've mapped your strengths${user.stream ? ` in ${user.stream}` : ''} and interests. College matches and opportunities are now personalized for you.`,
          actionUrl: '/diagnostic',
          emailSubject: `${first}, your UniDiscover diagnostic insights are ready`,
          emailHtml: this.emailWrap(
            first,
            `Your diagnostic is complete. We analyzed your academic context${user.board ? ` (${user.board})` : ''} and built a foundation for college shortlists, SAT prep, and opportunity matching.`,
            'View your insights',
            '/diagnostic',
          ),
        };
      case NotificationEventType.DIAGNOSTIC_REMINDER:
        return {
          title: `${first}, finish your diagnostic to unlock your plan`,
          body: 'College suite, opportunities, and personalized recommendations activate once Section 1 is complete. Your progress is saved.',
          actionUrl: '/diagnostic',
          emailSubject: `Reminder: complete your UniDiscover diagnostic, ${first}`,
          emailHtml: this.emailWrap(
            first,
            'You started your student profile but have not finished the diagnostic yet. It takes about 15 minutes and powers every recommendation on the platform.',
            'Continue diagnostic',
            '/diagnostic',
          ),
        };
      case NotificationEventType.COLLEGE_SAVED:
        return {
          title: `Saved to your shortlist: ${payload.collegeName ?? 'New college'}`,
          body: `${first}, you now have ${user.collegesSaved ?? 1} college${(user.collegesSaved ?? 1) === 1 ? '' : 's'} saved. Compare fit scores and start application prep when ready.`,
          actionUrl: `/college-suite/shortlist/${payload.collegeId ?? ''}`,
          emailSubject: `New college saved — ${payload.collegeName ?? 'your shortlist'}`,
          emailHtml: this.emailWrap(
            first,
            `You added <strong>${payload.collegeName ?? 'a college'}</strong> to your shortlist. Open College Suite to compare programs, deadlines, and SAT targets.`,
            'View shortlist',
            '/college-suite/shortlist',
          ),
        };
      case NotificationEventType.ACTIVITY_SAVED:
        return {
          title: `Opportunity saved: ${payload.activityTitle ?? 'New item'}`,
          body: `${first}, we'll surface similar programs and deadline reminders in your activity planner.`,
          actionUrl: '/opportunities',
          emailSubject: `Saved opportunity — ${payload.activityTitle ?? 'UniDiscover'}`,
          emailHtml: this.emailWrap(
            first,
            `You saved <strong>${payload.activityTitle ?? 'an opportunity'}</strong>. Add it to your activity planner to track deadlines and next steps.`,
            'Browse opportunities',
            '/opportunities',
          ),
        };
      case NotificationEventType.TUTORING_MILESTONE:
        return {
          title: payload.milestoneTitle as string ?? `${first}, SAT prep milestone reached`,
          body: (payload.milestoneBody as string) ??
            `You've completed ${user.tutoringAttempts ?? payload.attemptCount ?? 0} practice questions${user.tutoringAccuracy ? ` with ${user.tutoringAccuracy}% accuracy` : ''}. Keep the momentum going.`,
          actionUrl: '/college-suite/test-prep',
          emailSubject: `SAT prep update for ${first}`,
          emailHtml: this.emailWrap(
            first,
            (payload.milestoneBody as string) ??
              `Great work on Digital SAT practice. Consistent drills improve timing and accuracy across Reading & Writing and Math modules.`,
            'Open test prep',
            '/college-suite/test-prep',
          ),
        };
      case NotificationEventType.HOMESCHOOL_UNIT_MASTERED:
        return {
          title: `Unit mastered: ${payload.unitTitle ?? 'Chapter complete'}`,
          body: `${first}, you passed the unit test for ${payload.subjectName ?? 'your subject'}. The next chapter is ready when you are.`,
          actionUrl: payload.unitHref as string ?? '/homeschooling',
          emailSubject: `Homeschooling win — ${payload.unitTitle ?? 'unit mastered'}`,
          emailHtml: this.emailWrap(
            first,
            `You mastered <strong>${payload.unitTitle ?? 'a unit'}</strong>${payload.testScore ? ` with a score of ${payload.testScore}%` : ''}. Your learning path is updated.`,
            'Continue learning',
            (payload.unitHref as string) ?? '/homeschooling',
          ),
        };
      case NotificationEventType.PLAN_ITEM_DUE:
        return {
          title: `Due soon: ${payload.itemTitle ?? 'Activity plan item'}`,
          body: `${first}, "${payload.itemTitle ?? 'a planned item'}" is due ${payload.dueLabel ?? 'soon'}. Update your planner to stay on track.`,
          actionUrl: '/activity-planner',
          emailSubject: `Deadline reminder — ${payload.itemTitle ?? 'activity plan'}`,
          emailHtml: this.emailWrap(
            first,
            `Your activity plan item <strong>${payload.itemTitle ?? ''}</strong> is coming up. Completing it strengthens your college profile.`,
            'Open activity planner',
            '/activity-planner',
          ),
        };
      case NotificationEventType.WEEKLY_DIGEST:
        return {
          title: `${first}, your weekly UniDiscover digest`,
          body: (payload.digestBody as string) ??
            `This week: ${user.collegesSaved ?? 0} colleges saved · ${user.activitiesSaved ?? 0} opportunities · ${user.tutoringAttempts ?? 0} SAT questions practiced.`,
          actionUrl: '/dashboard',
          emailSubject: `Your weekly UniDiscover summary`,
          emailHtml: this.emailWrap(
            first,
            (payload.digestBody as string) ??
              this.digestHtml(user),
            'Open dashboard',
            '/dashboard',
          ),
        };
      case NotificationEventType.APPLICATION_UPDATED:
        return {
          title: `Application updated: ${payload.documentName ?? 'Document'}`,
          body: `${first}, your ${payload.documentType ?? 'application'} document was saved. Review readiness before you submit.`,
          actionUrl: '/college-suite/applications',
          emailSubject: `Application document updated`,
          emailHtml: this.emailWrap(
            first,
            `Your application workspace was updated. Keep essays and supporting documents aligned with your shortlist.`,
            'Open applications',
            '/college-suite/applications',
          ),
        };
      default:
        return {
          title: (payload.title as string) ?? 'UniDiscover update',
          body: (payload.body as string) ?? `Hi ${first}, you have a new update on your student workspace.`,
          actionUrl: (payload.actionUrl as string) ?? '/dashboard',
        };
    }
  }

  buildDigestBody(user: UserContext): string {
    const parts = [
      `${user.collegesSaved ?? 0} college${(user.collegesSaved ?? 0) === 1 ? '' : 's'} on your shortlist`,
      `${user.activitiesSaved ?? 0} saved opportunit${(user.activitiesSaved ?? 0) === 1 ? 'y' : 'ies'}`,
    ];
    if ((user.tutoringAttempts ?? 0) > 0) {
      parts.push(
        `${user.tutoringAttempts} SAT question${user.tutoringAttempts === 1 ? '' : 's'} practiced (${user.tutoringAccuracy ?? 0}% accuracy)`,
      );
    }
    if (!user.diagnosticCompleted) {
      return `Start with your diagnostic to unlock personalized recommendations.`;
    }
    return `Here's your week at a glance: ${parts.join(' · ')}.`;
  }

  private digestHtml(user: UserContext) {
    return `<p>${this.buildDigestBody(user)}</p>
<p>Recommended next steps:</p>
<ul>
  <li>Review college shortlist fit scores</li>
  <li>Practice one SAT module</li>
  <li>Check opportunity deadlines in your planner</li>
</ul>`;
  }

  private emailWrap(
    firstName: string,
    bodyHtml: string,
    ctaLabel: string,
    actionPath: string,
  ) {
    const appUrl = process.env.APP_WEB_URL ?? 'http://localhost:3200';
    const href = `${appUrl}${actionPath}`;
    return `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#181817">
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ff6b4a">UniDiscover</p>
        <h1 style="font-size:24px;margin:16px 0">Hi ${firstName},</h1>
        <div style="font-size:15px;line-height:1.7;color:#5e5c56">${bodyHtml}</div>
        <p style="margin-top:28px">
          <a href="${href}" style="display:inline-block;background:#261d43;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:14px">${ctaLabel}</a>
        </p>
        <p style="margin-top:32px;font-size:12px;color:#9a9890">You're receiving this because notifications are enabled on your UniDiscover account.</p>
      </div>`;
  }
}
