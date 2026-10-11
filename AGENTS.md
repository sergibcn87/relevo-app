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

- Visit delay alerts are computed from `visits.started_at` (set by trigger `tasks_mark_visit_started` on the first task marked `realizada`), never from `scheduled_at`: the hourly cron route `/api/public/hooks/visitas-retrasadas` only considers started visits. Why: the user wants the 90-minute margin to count from actual work start and to keep DB polling infrequent.
