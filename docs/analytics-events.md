# Analytics Events

StressSignal uses a self-hosted Plausible endpoint on `ev.adlude.com`.
The global script is loaded in `app/layout.tsx`; client events use
`trackPlausibleEvent` from `lib/analytics.ts`.

## Event Taxonomy

| Event | Product question | Main props |
| --- | --- | --- |
| `navigate_header` | Which top-level nav items are used? | `target`, `href`, `nav_kind`, `locale`, `current_path` |
| `navigate_footer` | Do users check supporting pages? | `target`, `href`, `locale` |
| `navigate_breadcrumb` | Do detail visitors return to parent pages? | `href`, `label`, `locale` |
| `navigate_risk_layer` | Which risk layer tabs are explored? | `target`, `href`, `active`, `locale` |
| `select_market_region` | Which global region cards get follow-up? | `region_slug`, `href`, `source`, `locale` |
| `select_indicator` | Which indicators users drill into? | `slug`, `source`, `locale` |
| `filter_indicators` | Which indicator categories matter? | `category`, `previous_category`, `sort`, `has_query`, `locale` |
| `search_indicators` | Are users searching indicators? | `category`, `sort`, `has_query`, `query_length`, `locale` |
| `sort_indicators` | Which sorting mode users apply? | `category`, `previous_sort`, `sort`, `has_query`, `locale` |
| `clear_indicator_filters` | Are filters causing dead ends? | `category`, `sort`, `has_query`, `source`, `locale` |
| `select_time_range` | Which chart windows are useful? | `range`, `previous_range`, `page_path`, `locale` |
| `select_article` | Which educational paths convert to reading? | `slug`, `source`, `current_slug`, `indicator_slug`, `locale` |
| `click_cta` | Which generic CTAs move users forward? | `href`, `label`, `source`, `locale` |
| `open_data_source` | Do users inspect original market data? | `provider`, `external_id`, `indicator_slug`, `source_context`, `locale` |
| `open_reference_link` | Do SEO pages send users to reference sources? | `target`, `source`, `locale` |
| `toggle_language_menu` | Is the language picker being used? | `open`, `locale`, `current_path` |
| `change_language` | Which locale switches happen? | `from_locale`, `to_locale`, `current_path` |

Search query text is not sent to Plausible. Search tracking only records
whether a query exists and a coarse length bucket.
