<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- Visit delay alerts are computed from `visits.started_at` (set by trigger `tasks_mark_visit_started` on the first task marked `realizada`), never from `scheduled_at`. There is no cron job: the authenticated shell POSTs `/api/public/hooks/visitas-retrasadas` on app load, throttled to one check per 15 minutes per device. Why: the user wants the 90-minute margin to count from actual work start and no scheduled polling at all.
- Email notifications were removed from the product (2026-10-11): `profiles.email_*` columns and the `email_queue` table are deprecated and unused. Do not reintroduce email sending unless the user explicitly asks.
- AI plan generation lives in `src/lib/ai-plan.functions.ts` (createServerFn + Lovable AI Gateway `/v1/responses`, strict json_schema, streamed SSE consumed server-side). Server-side validation drops any task whose `source_excerpt` is not a literal fragment of its care card, and nothing is created until `confirmPlanProposal` runs. Why: the PRD requires traceability of every AI instruction and forbids invented care data.
